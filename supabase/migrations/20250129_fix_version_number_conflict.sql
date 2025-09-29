-- Исправление проблемы с дублированием номеров версий

-- Обновляем функцию создания версии тендера
CREATE OR REPLACE FUNCTION create_tender_version(
    p_parent_tender_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_new_tender_id UUID;
    v_parent_tender RECORD;
    v_new_version INTEGER;
    v_new_tender_number TEXT;
    v_counter INTEGER := 2;
BEGIN
    -- Получаем информацию о родительском тендере
    SELECT * INTO v_parent_tender
    FROM tenders
    WHERE id = p_parent_tender_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent tender not found: %', p_parent_tender_id;
    END IF;

    -- Находим максимальный номер версии для этого тендера
    SELECT COALESCE(MAX(version), 1) + 1 INTO v_new_version
    FROM tenders
    WHERE id = p_parent_tender_id
       OR parent_version_id = p_parent_tender_id;

    -- Генерируем уникальный номер тендера
    v_new_tender_number := v_parent_tender.tender_number || '_v' || v_new_version;

    -- Проверяем уникальность и при необходимости добавляем суффикс
    WHILE EXISTS (SELECT 1 FROM tenders WHERE tender_number = v_new_tender_number) LOOP
        v_new_tender_number := v_parent_tender.tender_number || '_v' || v_new_version || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    -- Создаем новый тендер как версию
    INSERT INTO tenders (
        title,
        description,
        client_name,
        tender_number,
        submission_deadline,
        area_sp,
        area_client,
        usd_rate,
        eur_rate,
        cny_rate,
        upload_folder,
        bsm_link,
        tz_clarification_link,
        qa_form_link,
        version,
        parent_version_id,
        version_status,
        version_created_by
    )
    SELECT
        title || ' (Версия ' || v_new_version || ')',
        description,
        client_name,
        v_new_tender_number,
        submission_deadline,
        area_sp,
        area_client,
        usd_rate,
        eur_rate,
        cny_rate,
        upload_folder,
        bsm_link,
        tz_clarification_link,
        qa_form_link,
        v_new_version,
        p_parent_tender_id,
        'draft',
        p_created_by
    FROM tenders
    WHERE id = p_parent_tender_id
    RETURNING id INTO v_new_tender_id;

    -- Записываем в историю
    INSERT INTO tender_version_history (
        tender_id,
        version_number,
        action,
        details,
        performed_by
    ) VALUES (
        v_new_tender_id,
        v_new_version,
        'created',
        jsonb_build_object(
            'parent_tender_id', p_parent_tender_id,
            'parent_version', v_parent_tender.version
        ),
        p_created_by
    );

    RETURN v_new_tender_id;
END;
$$ LANGUAGE plpgsql;

-- Добавляем функцию для очистки неиспользованных версий (черновиков)
CREATE OR REPLACE FUNCTION cleanup_draft_versions(
    p_parent_tender_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Удаляем все черновые версии, у которых нет позиций
    WITH deleted AS (
        DELETE FROM tenders
        WHERE parent_version_id = p_parent_tender_id
          AND version_status = 'draft'
          AND NOT EXISTS (
              SELECT 1 FROM client_positions cp
              WHERE cp.tender_id = tenders.id
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_tender_version IS 'Создает новую версию тендера с автоматической генерацией уникального номера';
COMMENT ON FUNCTION cleanup_draft_versions IS 'Удаляет неиспользованные черновые версии тендера';