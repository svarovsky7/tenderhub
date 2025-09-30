-- Исправление переноса manual_volume и manual_note для обычных позиций заказчика при создании версий

-- Обновляем функцию complete_version_transfer
CREATE OR REPLACE FUNCTION public.complete_version_transfer(p_old_tender_id uuid, p_new_tender_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_mapping RECORD;
    v_result JSON;
    v_total_boq INTEGER := 0;
    v_total_positions INTEGER := 0;
    v_total_links INTEGER := 0;
    v_dop_result JSON;
    v_old_boq RECORD;
    v_new_boq_id UUID;
    v_dop_count INTEGER := 0;
    v_new_dop_id UUID;
    v_new_parent_id UUID;
    v_new_position RECORD;
    v_manual_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting transfer from % to %', p_old_tender_id, p_new_tender_id;

    -- Переносим BOQ items для всех замапленных позиций
    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
        AND old_position_id IS NOT NULL
        AND new_position_id IS NOT NULL
        AND mapping_status != 'rejected'
    LOOP
        -- Получаем информацию о новой позиции
        SELECT * INTO v_new_position
        FROM client_positions
        WHERE id = v_mapping.new_position_id;

        -- Проверяем, что функция transfer_boq_with_mapping существует
        BEGIN
            v_result := transfer_boq_with_mapping(v_mapping.id);

            IF (v_result->>'success')::boolean THEN
                v_total_boq := v_total_boq + COALESCE((v_result->>'boq_items_mapped')::integer, 0);
                v_total_positions := v_total_positions + 1;
            END IF;
        EXCEPTION
            WHEN undefined_function THEN
                -- Если функция не существует, делаем прямое копирование
                RAISE NOTICE 'Function transfer_boq_with_mapping not found, using direct copy';

                -- Удаляем существующие BOQ items в новой позиции
                DELETE FROM boq_items WHERE client_position_id = v_mapping.new_position_id;

                -- Копируем BOQ items напрямую с правильными item_numbers
                FOR v_old_boq IN
                    SELECT * FROM boq_items
                    WHERE client_position_id = v_mapping.old_position_id
                LOOP
                    INSERT INTO boq_items (
                        tender_id, client_position_id, item_number, sub_number,
                        sort_order, item_type, description, unit, quantity, unit_rate,
                        material_id, work_id, consumption_coefficient, conversion_coefficient,
                        delivery_price_type, delivery_amount, base_quantity,
                        detail_cost_category_id, total_amount,
                        currency_type, currency_rate,
                        created_at, updated_at
                    )
                    VALUES (
                        p_new_tender_id,
                        v_mapping.new_position_id,
                        v_new_position.position_number || '.' || v_old_boq.sub_number,
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

                    v_total_boq := v_total_boq + 1;
                END LOOP;

                v_total_positions := v_total_positions + 1;
        END;
    END LOOP;

    -- НОВОЕ: Переносим manual_volume и manual_note для обычных позиций
    -- После переноса BOQ items обновляем manual поля в позициях
    UPDATE client_positions new_pos
    SET
        manual_volume = old_pos.manual_volume,
        manual_note = old_pos.manual_note
    FROM client_positions old_pos
    JOIN tender_version_mappings tvm ON tvm.old_position_id = old_pos.id
    WHERE tvm.new_position_id = new_pos.id
      AND tvm.new_tender_id = p_new_tender_id
      AND (old_pos.manual_volume IS NOT NULL OR old_pos.manual_note IS NOT NULL);

    GET DIAGNOSTICS v_manual_updated = ROW_COUNT;

    IF v_manual_updated > 0 THEN
        RAISE NOTICE '✅ Updated manual fields for % positions', v_manual_updated;
    END IF;

    -- Переносим ДОП позиции
    v_dop_result := transfer_dop_positions(p_new_tender_id, p_old_tender_id);

    RETURN json_build_object(
        'success', true,
        'positions_transferred', v_total_positions,
        'boq_items_transferred', v_total_boq,
        'manual_fields_updated', v_manual_updated,
        'dop_result', v_dop_result
    );
END;
$function$;

-- Также обновляем complete_version_transfer_with_links
CREATE OR REPLACE FUNCTION public.complete_version_transfer_with_links(p_old_tender_id uuid, p_new_tender_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_main_result JSON;
    v_total_links INTEGER := 0;
    v_mapping RECORD;
    v_link_count INTEGER;
BEGIN
    -- Сначала вызываем основную функцию переноса (теперь с manual полями)
    v_main_result := complete_version_transfer(p_old_tender_id, p_new_tender_id);

    -- Теперь переносим work_material_links для каждого маппинга
    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
        AND old_position_id IS NOT NULL
        AND new_position_id IS NOT NULL
    LOOP
        v_link_count := transfer_work_material_links(v_mapping.old_position_id, v_mapping.new_position_id);
        v_total_links := v_total_links + v_link_count;
    END LOOP;

    -- Добавляем информацию о links в результат
    RETURN json_build_object(
        'success', (v_main_result->>'success')::boolean,
        'positions_transferred', v_main_result->>'positions_transferred',
        'boq_items_transferred', v_main_result->>'boq_items_transferred',
        'manual_fields_updated', v_main_result->>'manual_fields_updated',
        'dop_result', v_main_result->'dop_result',
        'links_transferred', v_total_links
    );
END;
$function$;

-- Обновляем функцию transfer_boq_with_mapping чтобы она также переносила manual поля
CREATE OR REPLACE FUNCTION public.transfer_boq_with_mapping(p_mapping_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_old_boq RECORD;
    v_new_position RECORD;
    v_old_position RECORD;
    v_inserted_count INTEGER := 0;
    v_links_result JSON;
BEGIN
    -- Получаем информацию о маппинге
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF v_mapping IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mapping not found'
        );
    END IF;

    -- Получаем информацию о новой позиции
    SELECT * INTO v_new_position
    FROM client_positions
    WHERE id = v_mapping.new_position_id;

    -- Получаем информацию о старой позиции для manual полей
    SELECT * INTO v_old_position
    FROM client_positions
    WHERE id = v_mapping.old_position_id;

    -- Сначала удаляем существующие BOQ items в новой позиции
    DELETE FROM boq_items
    WHERE client_position_id = v_mapping.new_position_id;

    -- Переносим BOQ items с правильными item_numbers
    FOR v_old_boq IN
        SELECT * FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id
        ORDER BY sort_order, item_number
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
            v_mapping.new_tender_id,
            v_mapping.new_position_id,
            v_new_position.position_number || '.' || v_old_boq.sub_number,
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

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    -- НОВОЕ: Обновляем manual поля в новой позиции
    IF v_old_position.manual_volume IS NOT NULL OR v_old_position.manual_note IS NOT NULL THEN
        UPDATE client_positions
        SET
            manual_volume = v_old_position.manual_volume,
            manual_note = v_old_position.manual_note
        WHERE id = v_mapping.new_position_id;

        RAISE NOTICE '  ✓ Transferred manual fields for position %', v_mapping.new_position_id;
    END IF;

    RAISE NOTICE '  ✓ Transferred % BOQ items from position % to %',
        v_inserted_count, v_mapping.old_position_id, v_mapping.new_position_id;

    -- Используем функцию для переноса work_material_links если она существует
    BEGIN
        v_links_result := transfer_work_material_links_v2(
            v_mapping.old_position_id,
            v_mapping.new_position_id
        );
        RAISE NOTICE '  📎 Work_material_links transfer: %', v_links_result;
    EXCEPTION
        WHEN undefined_function THEN
            RAISE NOTICE '  ⚠️ Function transfer_work_material_links_v2 not found, skipping links transfer';
            v_links_result := json_build_object('links_transferred', 0);
    END;

    IF v_inserted_count > 0 OR (v_links_result->>'links_transferred')::int > 0 THEN
        UPDATE tender_version_mappings
        SET
            mapping_status = 'applied',
            updated_at = now()
        WHERE id = p_mapping_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'boq_items_mapped', v_inserted_count,
        'links_transferred', COALESCE((v_links_result->>'links_transferred')::int, 0),
        'manual_fields_transferred', (v_old_position.manual_volume IS NOT NULL OR v_old_position.manual_note IS NOT NULL),
        'mapping_id', p_mapping_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'mapping_id', p_mapping_id
        );
END;
$function$;

COMMENT ON FUNCTION public.complete_version_transfer IS 'Переносит все данные между версиями включая manual_volume и manual_note';
COMMENT ON FUNCTION public.complete_version_transfer_with_links IS 'Переносит данные с work_material_links и manual полями';
COMMENT ON FUNCTION public.transfer_boq_with_mapping IS 'Переносит BOQ items и manual поля на основе маппинга';