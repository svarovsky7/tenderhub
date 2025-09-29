-- Исправление функций версионирования для корректного переноса BOQ items

-- Удаляем старую версию функции, если существует
DROP FUNCTION IF EXISTS transfer_boq_items(UUID);

-- Создаем исправленную функцию для переноса BOQ items между версиями
CREATE OR REPLACE FUNCTION transfer_boq_items(
    p_mapping_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_mapping RECORD;
    v_inserted_count INTEGER := 0;
BEGIN
    -- Получаем информацию о маппинге
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RAISE NOTICE 'Mapping not found: %', p_mapping_id;
        RETURN FALSE;
    END IF;

    -- Проверяем, что есть обе позиции
    IF v_mapping.old_position_id IS NULL OR v_mapping.new_position_id IS NULL THEN
        RAISE NOTICE 'Missing position IDs in mapping: old=%, new=%',
            v_mapping.old_position_id, v_mapping.new_position_id;
        RETURN FALSE;
    END IF;

    -- Переносим все BOQ items из старой позиции в новую
    INSERT INTO boq_items (
        client_position_id,
        work_id,
        material_id,
        material_name,
        measurement_unit,
        consumption_rate,
        quantity,
        gross_price,
        currency,
        delivery_cost_type,
        delivery_cost,
        line_number,
        level,
        parent_id,
        created_at,
        updated_at
    )
    SELECT
        v_mapping.new_position_id,  -- Новая позиция
        work_id,
        material_id,
        material_name,
        measurement_unit,
        consumption_rate,
        quantity,
        gross_price,
        currency,
        delivery_cost_type,
        delivery_cost,
        line_number,
        level,
        NULL, -- parent_id будет установлен отдельно при необходимости
        NOW(),
        NOW()
    FROM boq_items
    WHERE client_position_id = v_mapping.old_position_id;

    -- Получаем количество перенесенных записей
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RAISE NOTICE 'Transferred % BOQ items from position % to %',
        v_inserted_count, v_mapping.old_position_id, v_mapping.new_position_id;

    -- Обновляем статус маппинга только если были перенесены записи
    IF v_inserted_count > 0 THEN
        UPDATE tender_version_mappings
        SET mapping_status = 'applied',
            updated_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes, '') || ' | Transferred ' || v_inserted_count || ' BOQ items'
        WHERE id = p_mapping_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Создаем функцию для переноса всех ДОП позиций
CREATE OR REPLACE FUNCTION transfer_dop_positions(
    p_old_tender_id UUID,
    p_new_tender_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_dop_count INTEGER := 0;
    v_dop_position RECORD;
    v_new_position_id UUID;
BEGIN
    -- Находим все ДОП позиции в старом тендере
    FOR v_dop_position IN
        SELECT cp.*,
               tvm.new_position_id as parent_new_position_id
        FROM client_positions cp
        LEFT JOIN tender_version_mappings tvm
            ON tvm.old_position_id = cp.parent_id
            AND tvm.new_tender_id = p_new_tender_id
        WHERE cp.tender_id = p_old_tender_id
        AND cp.position_type = 'dop'
    LOOP
        -- Создаем новую ДОП позицию
        INSERT INTO client_positions (
            tender_id,
            position_number,
            work_name,
            position_type,
            parent_id,
            created_at,
            updated_at
        )
        VALUES (
            p_new_tender_id,
            v_dop_position.position_number,
            v_dop_position.work_name,
            'dop',
            v_dop_position.parent_new_position_id, -- Может быть NULL если родитель удален
            NOW(),
            NOW()
        )
        RETURNING id INTO v_new_position_id;

        -- Переносим BOQ items для этой ДОП позиции
        INSERT INTO boq_items (
            client_position_id,
            work_id,
            material_id,
            material_name,
            measurement_unit,
            consumption_rate,
            quantity,
            gross_price,
            currency,
            delivery_cost_type,
            delivery_cost,
            line_number,
            level,
            created_at,
            updated_at
        )
        SELECT
            v_new_position_id,
            work_id,
            material_id,
            material_name,
            measurement_unit,
            consumption_rate,
            quantity,
            gross_price,
            currency,
            delivery_cost_type,
            delivery_cost,
            line_number,
            level,
            NOW(),
            NOW()
        FROM boq_items
        WHERE client_position_id = v_dop_position.id;

        v_dop_count := v_dop_count + 1;
    END LOOP;

    RETURN v_dop_count;
END;
$$ LANGUAGE plpgsql;

-- Обновляем функцию applyMappings в tender-versioning API чтобы она использовала эти функции
-- Это будет сделано в TypeScript коде

COMMENT ON FUNCTION transfer_boq_items IS 'Переносит все BOQ items из старой позиции в новую согласно маппингу';
COMMENT ON FUNCTION transfer_dop_positions IS 'Переносит все ДОП позиции с их BOQ items в новую версию тендера';