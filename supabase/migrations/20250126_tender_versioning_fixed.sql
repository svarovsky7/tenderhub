-- Миграция для версионирования тендеров и сопоставления позиций
-- Эта миграция создает систему для управления версиями тендеров
-- и автоматического сопоставления позиций между версиями

-- 1. Таблица для хранения маппингов между позициями разных версий
CREATE TABLE IF NOT EXISTS tender_version_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    new_tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    old_position_id UUID REFERENCES client_positions(id) ON DELETE CASCADE,
    new_position_id UUID REFERENCES client_positions(id) ON DELETE CASCADE,

    -- Дополнительная информация для анализа
    old_position_number TEXT,
    old_work_name TEXT,
    new_position_number TEXT,
    new_work_name TEXT,

    -- Тип и точность сопоставления
    mapping_type TEXT CHECK (mapping_type IN ('exact', 'fuzzy', 'manual', 'dop', 'new', 'deleted')),
    confidence_score NUMERIC(3, 2), -- 0.00 - 1.00

    -- Детали оценок для fuzzy matching
    fuzzy_score NUMERIC(3, 2),
    context_score NUMERIC(3, 2),
    hierarchy_score NUMERIC(3, 2),

    -- Статус маппинга
    mapping_status TEXT DEFAULT 'suggested' CHECK (mapping_status IN ('suggested', 'confirmed', 'rejected', 'applied')),

    -- Действие для переноса данных
    action_type TEXT CHECK (action_type IN ('copy_boq', 'create_new', 'delete', 'preserve_dop')),

    -- ДОП позиции
    is_dop BOOLEAN DEFAULT FALSE,
    parent_mapping_id UUID REFERENCES tender_version_mappings(id),

    -- Метаданные
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- 2. Таблица для истории версионирования
CREATE TABLE IF NOT EXISTS tender_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'auto_mapped', 'manual_mapped', 'applied', 'reverted')),
    details JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    performed_by UUID
);

-- 3. Добавляем поля в таблицу tenders для версионности (если их еще нет)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tenders' AND column_name = 'version') THEN
        ALTER TABLE tenders ADD COLUMN version INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tenders' AND column_name = 'parent_version_id') THEN
        ALTER TABLE tenders ADD COLUMN parent_version_id UUID REFERENCES tenders(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tenders' AND column_name = 'version_status') THEN
        ALTER TABLE tenders ADD COLUMN version_status TEXT DEFAULT 'current'
            CHECK (version_status IN ('current', 'draft', 'archived'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tenders' AND column_name = 'version_created_at') THEN
        ALTER TABLE tenders ADD COLUMN version_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tenders' AND column_name = 'version_created_by') THEN
        ALTER TABLE tenders ADD COLUMN version_created_by UUID;
    END IF;
END $$;

-- 4. Функция для создания новой версии тендера
CREATE OR REPLACE FUNCTION create_tender_version(
    p_parent_tender_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_new_tender_id UUID;
    v_parent_tender RECORD;
    v_new_version INTEGER;
BEGIN
    -- Получаем информацию о родительском тендере
    SELECT * INTO v_parent_tender
    FROM tenders
    WHERE id = p_parent_tender_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent tender not found: %', p_parent_tender_id;
    END IF;

    -- Вычисляем новый номер версии
    v_new_version := COALESCE(v_parent_tender.version, 1) + 1;

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
        tender_number || '_v' || v_new_version,
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

-- 5. Функция для расчета fuzzy score между строками
CREATE OR REPLACE FUNCTION calculate_fuzzy_score(
    str1 TEXT,
    str2 TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_str1 TEXT;
    v_str2 TEXT;
    v_distance INTEGER;
    v_max_length INTEGER;
BEGIN
    -- Нормализация строк
    v_str1 := LOWER(TRIM(COALESCE(str1, '')));
    v_str2 := LOWER(TRIM(COALESCE(str2, '')));

    -- Если обе строки пустые
    IF v_str1 = '' AND v_str2 = '' THEN
        RETURN 1.0;
    END IF;

    -- Если одна из строк пустая
    IF v_str1 = '' OR v_str2 = '' THEN
        RETURN 0.0;
    END IF;

    -- Если строки идентичны
    IF v_str1 = v_str2 THEN
        RETURN 1.0;
    END IF;

    -- Вычисляем расстояние Левенштейна
    v_distance := levenshtein(v_str1, v_str2);
    v_max_length := GREATEST(LENGTH(v_str1), LENGTH(v_str2));

    -- Возвращаем нормализованный score
    RETURN GREATEST(0, 1.0 - (v_distance::NUMERIC / v_max_length::NUMERIC));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Функция для автоматического сопоставления позиций
CREATE OR REPLACE FUNCTION auto_match_positions(
    p_old_tender_id UUID,
    p_new_tender_id UUID
)
RETURNS TABLE (
    old_position_id UUID,
    new_position_id UUID,
    confidence_score NUMERIC,
    mapping_type TEXT
) AS $$
DECLARE
    v_old_position RECORD;
    v_new_position RECORD;
    v_best_match RECORD;
    v_fuzzy_score NUMERIC;
    v_context_score NUMERIC;
    v_hierarchy_score NUMERIC;
    v_total_score NUMERIC;
    v_threshold NUMERIC := 0.7; -- Порог для автоматического сопоставления
BEGIN
    -- Создаем временную таблицу для результатов
    CREATE TEMP TABLE temp_matches (
        old_position_id UUID,
        new_position_id UUID,
        confidence_score NUMERIC,
        mapping_type TEXT,
        fuzzy_score NUMERIC,
        context_score NUMERIC,
        hierarchy_score NUMERIC
    ) ON COMMIT DROP;

    -- Проходим по всем старым позициям
    FOR v_old_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        ORDER BY position_number
    LOOP
        v_best_match := NULL;

        -- Ищем лучшее соответствие среди новых позиций
        FOR v_new_position IN
            SELECT * FROM client_positions
            WHERE tender_id = p_new_tender_id
            ORDER BY position_number
        LOOP
            -- Вычисляем fuzzy score для названия
            v_fuzzy_score := calculate_fuzzy_score(v_old_position.work_name, v_new_position.work_name);

            -- Вычисляем context score (на основе position_number и type)
            v_context_score := 0;
            IF v_old_position.position_number = v_new_position.position_number THEN
                v_context_score := v_context_score + 0.5;
            END IF;
            IF v_old_position.position_type = v_new_position.position_type THEN
                v_context_score := v_context_score + 0.5;
            END IF;

            -- Вычисляем hierarchy score (уровень в иерархии)
            v_hierarchy_score := 0;
            IF LENGTH(v_old_position.position_number) = LENGTH(v_new_position.position_number) THEN
                v_hierarchy_score := 1.0;
            ELSIF ABS(LENGTH(v_old_position.position_number) - LENGTH(v_new_position.position_number)) <= 2 THEN
                v_hierarchy_score := 0.5;
            END IF;

            -- Общий score (взвешенная сумма)
            v_total_score := (v_fuzzy_score * 0.7) + (v_context_score * 0.2) + (v_hierarchy_score * 0.1);

            -- Сохраняем лучшее соответствие
            IF v_best_match IS NULL OR v_total_score > v_best_match.total_score THEN
                v_best_match := ROW(
                    v_new_position.id,
                    v_total_score,
                    v_fuzzy_score,
                    v_context_score,
                    v_hierarchy_score
                );
            END IF;
        END LOOP;

        -- Если нашли хорошее соответствие, добавляем в результат
        IF v_best_match IS NOT NULL AND v_best_match.total_score >= v_threshold THEN
            INSERT INTO temp_matches VALUES (
                v_old_position.id,
                v_best_match.id,
                v_best_match.total_score,
                CASE
                    WHEN v_best_match.total_score >= 0.95 THEN 'exact'
                    ELSE 'fuzzy'
                END,
                v_best_match.fuzzy_score,
                v_best_match.context_score,
                v_best_match.hierarchy_score
            );
        END IF;
    END LOOP;

    -- Возвращаем результаты
    RETURN QUERY SELECT
        tm.old_position_id,
        tm.new_position_id,
        tm.confidence_score,
        tm.mapping_type
    FROM temp_matches tm;
END;
$$ LANGUAGE plpgsql;

-- 7. Функция для переноса BOQ items между версиями
CREATE OR REPLACE FUNCTION transfer_boq_items(
    p_mapping_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_mapping RECORD;
    v_boq_item RECORD;
BEGIN
    -- Получаем информацию о маппинге
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id AND mapping_status = 'confirmed';

    IF NOT FOUND THEN
        RAISE NOTICE 'Mapping not found or not confirmed: %', p_mapping_id;
        RETURN FALSE;
    END IF;

    -- Переносим BOQ items
    FOR v_boq_item IN
        SELECT * FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id
    LOOP
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
            parent_id
        )
        SELECT
            v_mapping.new_position_id,
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
            NULL -- parent_id will be updated separately if needed
        FROM boq_items
        WHERE id = v_boq_item.id;
    END LOOP;

    -- Обновляем статус маппинга
    UPDATE tender_version_mappings
    SET mapping_status = 'applied',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_mapping_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_version_mappings_old_tender ON tender_version_mappings(old_tender_id);
CREATE INDEX IF NOT EXISTS idx_version_mappings_new_tender ON tender_version_mappings(new_tender_id);
CREATE INDEX IF NOT EXISTS idx_version_mappings_status ON tender_version_mappings(mapping_status);
CREATE INDEX IF NOT EXISTS idx_version_mappings_type ON tender_version_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_version_history_tender ON tender_version_history(tender_id);
CREATE INDEX IF NOT EXISTS idx_tenders_parent_version ON tenders(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_tenders_version_status ON tenders(version_status);

-- 9. Комментарии к таблицам и полям
COMMENT ON TABLE tender_version_mappings IS 'Таблица для хранения сопоставлений позиций между версиями тендеров';
COMMENT ON TABLE tender_version_history IS 'История операций версионирования тендеров';

COMMENT ON COLUMN tender_version_mappings.mapping_type IS 'Тип сопоставления: exact - точное совпадение, fuzzy - нечеткое, manual - ручное, dop - ДОП позиция, new - новая позиция, deleted - удаленная';
COMMENT ON COLUMN tender_version_mappings.confidence_score IS 'Уровень уверенности в сопоставлении от 0 до 1';
COMMENT ON COLUMN tender_version_mappings.action_type IS 'Действие при переносе: copy_boq - копировать BOQ, create_new - создать новое, delete - удалить, preserve_dop - сохранить ДОП';

COMMENT ON COLUMN tenders.version IS 'Номер версии тендера';
COMMENT ON COLUMN tenders.parent_version_id IS 'Ссылка на родительскую версию тендера';
COMMENT ON COLUMN tenders.version_status IS 'Статус версии: current - текущая, draft - черновик, archived - архивная';