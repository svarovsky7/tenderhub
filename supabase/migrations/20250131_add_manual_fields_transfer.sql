-- Добавление переноса полей manual_volume и manual_note при копировании ДОП позиций между версиями

-- Обновляем функцию transfer_dop_positions
CREATE OR REPLACE FUNCTION public.transfer_dop_positions(p_new_tender_id uuid, p_old_tender_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_dop_count INTEGER := 0;
    v_boq_count INTEGER := 0;
    v_links_count INTEGER := 0;
    v_total_boq INTEGER := 0;
    v_total_links INTEGER := 0;
    v_mapping RECORD;
    v_new_dop_position RECORD;
    v_old_link RECORD;
    v_new_work_boq_id UUID;
    v_new_material_boq_id UUID;
    v_new_sub_work_boq_id UUID;
    v_new_sub_material_boq_id UUID;
BEGIN
    RAISE NOTICE '🚀 Starting DOP positions transfer from tender % to %', p_old_tender_id, p_new_tender_id;

    -- Переносим все ДОП позиции
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
    LOOP
        RAISE NOTICE '📦 Processing DOP position: % (parent: %)',
            v_dop_position.position_number, v_dop_position.parent_position_id;

        -- Ищем новый parent_id через маппинги
        v_new_parent_id := NULL;

        IF v_dop_position.parent_position_id IS NOT NULL THEN
            -- Используем tender_version_mappings для поиска нового родителя
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        -- Создаем новую ДОП позицию (включая manual_volume и manual_note)
        INSERT INTO client_positions (
            tender_id,
            position_number,
            item_no,
            work_name,
            parent_position_id,
            is_additional,
            position_type,
            hierarchy_level,
            unit,
            volume,
            manual_volume,  -- Добавлено
            manual_note,    -- Добавлено
            client_note,
            total_materials_cost,
            total_works_cost,
            total_commercial_materials_cost,
            total_commercial_works_cost,
            created_at,
            updated_at
        )
        SELECT
            p_new_tender_id,
            position_number,
            item_no,
            work_name,
            v_new_parent_id,
            true,
            position_type,
            hierarchy_level,
            unit,
            volume,
            manual_volume,  -- Добавлено
            manual_note,    -- Добавлено
            client_note,
            total_materials_cost,
            total_works_cost,
            total_commercial_materials_cost,
            total_commercial_works_cost,
            now(),
            now()
        FROM client_positions
        WHERE id = v_dop_position.id
        ON CONFLICT (tender_id, position_number) DO NOTHING
        RETURNING id INTO v_new_dop_id;

        IF v_new_dop_id IS NOT NULL THEN
            v_dop_count := v_dop_count + 1;

            -- Получаем информацию о новой ДОП позиции
            SELECT * INTO v_new_dop_position
            FROM client_positions
            WHERE id = v_new_dop_id;

            -- Переносим BOQ items для ДОП позиции с правильными item_numbers
            INSERT INTO boq_items (
                tender_id,
                client_position_id,
                item_number,
                sub_number,
                sort_order,
                item_type,
                description,
                unit,
                quantity,
                unit_rate,
                material_id,
                work_id,
                consumption_coefficient,
                conversion_coefficient,
                delivery_price_type,
                delivery_amount,
                base_quantity,
                detail_cost_category_id,
                total_amount,
                currency_type,
                currency_rate,
                created_at,
                updated_at
            )
            SELECT
                p_new_tender_id,
                v_new_dop_id,
                v_new_dop_position.position_number || '.' || sub_number,
                sub_number,
                sort_order,
                item_type,
                description,
                unit,
                quantity,
                unit_rate,
                material_id,
                work_id,
                consumption_coefficient,
                conversion_coefficient,
                delivery_price_type,
                delivery_amount,
                base_quantity,
                detail_cost_category_id,
                total_amount,
                currency_type,
                currency_rate,
                now(),
                now()
            FROM boq_items
            WHERE client_position_id = v_dop_position.id;

            GET DIAGNOSTICS v_boq_count = ROW_COUNT;
            v_total_boq := v_total_boq + v_boq_count;

            -- Переносим work_material_links для ДОП позиции с правильным маппингом BOQ items
            FOR v_old_link IN
                SELECT * FROM work_material_links
                WHERE client_position_id = v_dop_position.id
            LOOP
                -- Находим новые BOQ item IDs по старым
                v_new_work_boq_id := NULL;
                v_new_material_boq_id := NULL;
                v_new_sub_work_boq_id := NULL;
                v_new_sub_material_boq_id := NULL;

                -- Маппинг work_boq_item_id
                IF v_old_link.work_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_work_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                        AND COALESCE(new_boq.work_id, '00000000-0000-0000-0000-000000000000'::uuid) =
                            COALESCE(old_boq.work_id, '00000000-0000-0000-0000-000000000000'::uuid)
                    )
                    WHERE old_boq.id = v_old_link.work_boq_item_id
                    LIMIT 1;
                END IF;

                -- Маппинг material_boq_item_id
                IF v_old_link.material_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_material_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                        AND COALESCE(new_boq.material_id, '00000000-0000-0000-0000-000000000000'::uuid) =
                            COALESCE(old_boq.material_id, '00000000-0000-0000-0000-000000000000'::uuid)
                    )
                    WHERE old_boq.id = v_old_link.material_boq_item_id
                    LIMIT 1;
                END IF;

                -- Маппинг sub_work_boq_item_id
                IF v_old_link.sub_work_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_sub_work_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                    )
                    WHERE old_boq.id = v_old_link.sub_work_boq_item_id
                    LIMIT 1;
                END IF;

                -- Маппинг sub_material_boq_item_id
                IF v_old_link.sub_material_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_sub_material_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                    )
                    WHERE old_boq.id = v_old_link.sub_material_boq_item_id
                    LIMIT 1;
                END IF;

                -- Вставляем новый link только если нашли соответствующие BOQ items
                IF (v_new_work_boq_id IS NOT NULL OR v_new_sub_work_boq_id IS NOT NULL) AND
                   (v_new_material_boq_id IS NOT NULL OR v_new_sub_material_boq_id IS NOT NULL) THEN

                    INSERT INTO work_material_links (
                        client_position_id,
                        work_boq_item_id,
                        material_boq_item_id,
                        sub_work_boq_item_id,
                        sub_material_boq_item_id,
                        material_quantity_per_work,
                        usage_coefficient,
                        delivery_price_type,
                        delivery_amount,
                        notes,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        v_new_dop_id,
                        v_new_work_boq_id,
                        v_new_material_boq_id,
                        v_new_sub_work_boq_id,
                        v_new_sub_material_boq_id,
                        v_old_link.material_quantity_per_work,
                        v_old_link.usage_coefficient,
                        v_old_link.delivery_price_type,
                        v_old_link.delivery_amount,
                        v_old_link.notes,
                        now(),
                        now()
                    )
                    ON CONFLICT DO NOTHING;

                    v_links_count := v_links_count + 1;
                END IF;
            END LOOP;

            v_total_links := v_total_links + v_links_count;

            RAISE NOTICE '✅ Created DOP position % with % BOQ items and % links',
                v_dop_position.position_number, v_boq_count, v_links_count;
        END IF;
    END LOOP;

    RAISE NOTICE '🎉 DOP transfer complete: % positions, % BOQ items, % links',
        v_dop_count, v_total_boq, v_total_links;

    RETURN json_build_object(
        'success', true,
        'dopCount', v_dop_count,
        'boqCount', v_total_boq,
        'linksCount', v_total_links
    );
END;
$function$;

-- Обновляем функцию transfer_dop_positions_fixed
CREATE OR REPLACE FUNCTION public.transfer_dop_positions_fixed(p_new_tender_id uuid, p_old_tender_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_dop_count INTEGER := 0;
    v_boq_count INTEGER := 0;
    v_total_boq INTEGER := 0;
    v_new_dop_position RECORD;
BEGIN
    RAISE NOTICE 'Starting DOP transfer from % to %', p_old_tender_id, p_new_tender_id;

    -- Переносим все ДОП позиции
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
    LOOP
        RAISE NOTICE 'Processing DOP: %', v_dop_position.position_number;

        -- Ищем новый parent_id
        v_new_parent_id := NULL;

        IF v_dop_position.parent_position_id IS NOT NULL THEN
            -- Ищем через маппинги
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        -- Создаем новую ДОП позицию с правильными колонками (включая manual поля)
        INSERT INTO client_positions (
            tender_id, position_number, item_no, work_name, parent_position_id, is_additional,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, created_at, updated_at
        )
        SELECT
            p_new_tender_id, position_number, item_no, work_name, v_new_parent_id, true,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, now(), now()
        FROM client_positions
        WHERE id = v_dop_position.id
        ON CONFLICT (tender_id, position_number) DO NOTHING
        RETURNING id INTO v_new_dop_id;

        IF v_new_dop_id IS NOT NULL THEN
            v_dop_count := v_dop_count + 1;

            -- Получаем информацию о новой ДОП позиции
            SELECT * INTO v_new_dop_position
            FROM client_positions
            WHERE id = v_new_dop_id;

            -- Переносим BOQ items с правильными item_numbers
            INSERT INTO boq_items (
                tender_id, client_position_id, item_number, sub_number,
                sort_order, item_type, description, unit, quantity, unit_rate,
                material_id, work_id, consumption_coefficient, conversion_coefficient,
                delivery_price_type, delivery_amount, base_quantity,
                detail_cost_category_id, total_amount,
                currency_type, currency_rate,
                created_at, updated_at
            )
            SELECT
                p_new_tender_id,
                v_new_dop_id,
                v_new_dop_position.position_number || '.' || sub_number,
                sub_number,
                sort_order, item_type, description, unit, quantity, unit_rate,
                material_id, work_id, consumption_coefficient, conversion_coefficient,
                delivery_price_type, delivery_amount, base_quantity,
                detail_cost_category_id, total_amount,
                currency_type, currency_rate,
                now(), now()
            FROM boq_items
            WHERE client_position_id = v_dop_position.id;

            GET DIAGNOSTICS v_boq_count = ROW_COUNT;
            v_total_boq := v_total_boq + v_boq_count;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'dopCount', v_dop_count,
        'boqCount', v_total_boq
    );
END;
$function$;

-- Обновляем функцию transfer_dop_positions_v2
CREATE OR REPLACE FUNCTION public.transfer_dop_positions_v2(p_new_tender_id uuid, p_old_tender_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_dop_count INTEGER := 0;
    v_old_boq RECORD;
    v_boq_total INTEGER := 0;
    v_new_dop_position RECORD;
BEGIN
    RAISE NOTICE '🚀 Starting transfer_dop_positions_v2 from tender % to %',
        p_old_tender_id, p_new_tender_id;

    -- Переносим все ДОП позиции
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
        ORDER BY position_number
    LOOP
        RAISE NOTICE '📋 Processing DOP position: id=%, number=%, name=%',
            v_dop_position.id, v_dop_position.position_number, v_dop_position.work_name;

        v_new_parent_id := NULL;

        -- Сначала пытаемся найти родителя через tender_version_mappings
        IF v_dop_position.parent_position_id IS NOT NULL THEN
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        -- Создаем новую ДОП позицию с правильными колонками (включая manual поля)
        INSERT INTO client_positions (
            tender_id, position_number, item_no, work_name, parent_position_id, is_additional,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, created_at, updated_at
        )
        SELECT
            p_new_tender_id, position_number, item_no, work_name, v_new_parent_id, true,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, now(), now()
        FROM client_positions
        WHERE id = v_dop_position.id
        ON CONFLICT (tender_id, position_number) DO UPDATE SET
            parent_position_id = EXCLUDED.parent_position_id
        RETURNING id INTO v_new_dop_id;

        IF v_new_dop_id IS NOT NULL THEN
            v_dop_count := v_dop_count + 1;
            RAISE NOTICE '✅ Created DOP position %', v_dop_position.position_number;

            -- Получаем информацию о новой ДОП позиции
            SELECT * INTO v_new_dop_position
            FROM client_positions
            WHERE id = v_new_dop_id;

            -- Переносим BOQ items с маппингом для ДОП позиции
            FOR v_old_boq IN
                SELECT * FROM boq_items
                WHERE client_position_id = v_dop_position.id
            LOOP
                INSERT INTO boq_items (
                    tender_id,
                    client_position_id,
                    item_number,
                    sub_number,
                    sort_order,
                    item_type,
                    description,
                    unit,
                    quantity,
                    unit_rate,
                    material_id,
                    work_id,
                    consumption_coefficient,
                    conversion_coefficient,
                    delivery_price_type,
                    delivery_amount,
                    base_quantity,
                    detail_cost_category_id,
                    total_amount,
                    currency_type,
                    currency_rate,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_new_tender_id,
                    v_new_dop_id,
                    v_new_dop_position.position_number || '.' || v_old_boq.sub_number,
                    v_old_boq.sub_number,
                    v_old_boq.sort_order,
                    v_old_boq.item_type,
                    v_old_boq.description,
                    v_old_boq.unit,
                    v_old_boq.quantity,
                    v_old_boq.unit_rate,
                    v_old_boq.material_id,
                    v_old_boq.work_id,
                    v_old_boq.consumption_coefficient,
                    v_old_boq.conversion_coefficient,
                    v_old_boq.delivery_price_type,
                    v_old_boq.delivery_amount,
                    v_old_boq.base_quantity,
                    v_old_boq.detail_cost_category_id,
                    v_old_boq.total_amount,
                    v_old_boq.currency_type,
                    v_old_boq.currency_rate,
                    now(),
                    now()
                );

                v_boq_total := v_boq_total + 1;
            END LOOP;
        ELSE
            RAISE NOTICE '  ✓ DOP position already exists: %', v_new_dop_id;
        END IF;
    END LOOP;

    RAISE NOTICE '🎉 DOP transfer complete: % positions, % BOQ items',
        v_dop_count, v_boq_total;

    RETURN json_build_object(
        'success', true,
        'dop_positions_created', v_dop_count,
        'boq_items_transferred', v_boq_total
    );
END;
$function$;

COMMENT ON FUNCTION public.transfer_dop_positions IS 'Переносит ДОП позиции включая manual_volume и manual_note';
COMMENT ON FUNCTION public.transfer_dop_positions_fixed IS 'Исправленная версия переноса ДОП позиций с manual полями';
COMMENT ON FUNCTION public.transfer_dop_positions_v2 IS 'Улучшенная версия переноса ДОП позиций с manual полями';