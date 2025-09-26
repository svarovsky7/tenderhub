-- Миграция для системы версионирования тендеров
-- Добавляет поддержку версий и сопоставления позиций между версиями

-- 1. Добавление полей версионирования в таблицу tenders
ALTER TABLE tenders
ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES tenders(id),
ADD COLUMN IF NOT EXISTS version_status TEXT DEFAULT 'draft' CHECK (version_status IN ('draft', 'active', 'archived')),
ADD COLUMN IF NOT EXISTS version_created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS version_created_by UUID;

-- Создаем индекс для быстрого поиска версий
CREATE INDEX IF NOT EXISTS idx_tenders_parent_version ON tenders(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_tenders_version_status ON tenders(version_status);

-- 2. Таблица для хранения сопоставлений позиций между версиями
CREATE TABLE IF NOT EXISTS tender_version_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    new_tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    old_position_id UUID REFERENCES client_positions(id) ON DELETE SET NULL,
    new_position_id UUID REFERENCES client_positions(id) ON DELETE SET NULL,

    -- Информация для сопоставления
    old_position_number TEXT,
    old_work_name TEXT,
    new_position_number TEXT,
    new_work_name TEXT,

    -- Метрики сопоставления
    mapping_type TEXT CHECK (mapping_type IN ('exact', 'fuzzy', 'manual', 'dop', 'new', 'deleted')),
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    fuzzy_score NUMERIC(3,2),
    context_score NUMERIC(3,2),
    hierarchy_score NUMERIC(3,2),

    -- Статус и действия
    mapping_status TEXT DEFAULT 'suggested' CHECK (mapping_status IN ('suggested', 'confirmed', 'rejected', 'applied')),
    action_type TEXT CHECK (action_type IN ('copy_boq', 'create_new', 'delete', 'preserve_dop')),

    -- Дополнительная информация
    is_dop BOOLEAN DEFAULT FALSE,
    parent_mapping_id UUID REFERENCES tender_version_mappings(id),
    notes TEXT,

    -- Аудит
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,

    -- Уникальность
    UNIQUE(new_tender_id, new_position_id),
    UNIQUE(old_tender_id, old_position_id, new_tender_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_version_mappings_old_tender ON tender_version_mappings(old_tender_id);
CREATE INDEX IF NOT EXISTS idx_version_mappings_new_tender ON tender_version_mappings(new_tender_id);
CREATE INDEX IF NOT EXISTS idx_version_mappings_status ON tender_version_mappings(mapping_status);
CREATE INDEX IF NOT EXISTS idx_version_mappings_type ON tender_version_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_version_mappings_dop ON tender_version_mappings(is_dop) WHERE is_dop = TRUE;

-- 3. Таблица для истории версий (аудит)
CREATE TABLE IF NOT EXISTS tender_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'uploaded', 'mapped', 'applied', 'activated', 'archived')),

    -- Детали действия
    details JSONB,
    positions_added INTEGER,
    positions_removed INTEGER,
    positions_modified INTEGER,
    dop_transferred INTEGER,

    -- Метаданные
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    UNIQUE(tender_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_version_history_tender ON tender_version_history(tender_id);
CREATE INDEX IF NOT EXISTS idx_version_history_action ON tender_version_history(action);
CREATE INDEX IF NOT EXISTS idx_version_history_date ON tender_version_history(performed_at DESC);

-- 4. Функция для создания новой версии тендера
CREATE OR REPLACE FUNCTION create_tender_version(
    p_parent_tender_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_new_tender_id UUID;
    v_new_version INTEGER;
    v_parent_tender RECORD;
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
        customer,
        region,
        status,
        deadline,
        currency,
        usd_rate,
        eur_rate,
        cny_rate,
        version,
        parent_version_id,
        version_status,
        version_created_by
    )
    SELECT
        title || ' (Версия ' || v_new_version || ')',
        description,
        customer,
        region,
        'draft',
        deadline,
        currency,
        usd_rate,
        eur_rate,
        cny_rate,
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
            AND id NOT IN (SELECT new_position_id FROM temp_matches WHERE new_position_id IS NOT NULL)
            ORDER BY position_number
        LOOP
            -- Расчет fuzzy score по work_name (70% веса)
            v_fuzzy_score := calculate_fuzzy_score(
                v_old_position.work_name,
                v_new_position.work_name
            );

            -- Расчет context score по соседним позициям (20% веса)
            v_context_score := CASE
                WHEN v_old_position.position_number = v_new_position.position_number THEN 1.0
                WHEN ABS(v_old_position.position_number::INTEGER - v_new_position.position_number::INTEGER) = 1 THEN 0.8
                WHEN ABS(v_old_position.position_number::INTEGER - v_new_position.position_number::INTEGER) = 2 THEN 0.6
                ELSE 0.3
            END;

            -- Расчет hierarchy score по типу позиции (10% веса)
            v_hierarchy_score := CASE
                WHEN v_old_position.position_type = v_new_position.position_type THEN 1.0
                WHEN v_old_position.position_type IS NULL OR v_new_position.position_type IS NULL THEN 0.5
                ELSE 0.0
            END;

            -- Общий score с весами
            v_total_score := (v_fuzzy_score * 0.7) + (v_context_score * 0.2) + (v_hierarchy_score * 0.1);

            -- Сохраняем лучшее соответствие
            IF v_best_match IS NULL OR v_total_score > v_best_match.score THEN
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
        IF v_best_match IS NOT NULL AND v_best_match.score >= v_threshold THEN
            INSERT INTO temp_matches VALUES (
                v_old_position.id,
                v_best_match.id,
                v_best_match.score,
                CASE
                    WHEN v_best_match.score >= 0.95 THEN 'exact'
                    ELSE 'fuzzy'
                END,
                v_best_match.fuzzy_score,
                v_best_match.context_score,
                v_best_match.hierarchy_score
            );
        ELSE
            -- Позиция удалена в новой версии
            INSERT INTO temp_matches VALUES (
                v_old_position.id,
                NULL,
                0,
                'deleted',
                0,
                0,
                0
            );
        END IF;
    END LOOP;

    -- Добавляем новые позиции (которые не были сопоставлены)
    FOR v_new_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_new_tender_id
        AND id NOT IN (SELECT new_position_id FROM temp_matches WHERE new_position_id IS NOT NULL)
    LOOP
        INSERT INTO temp_matches VALUES (
            NULL,
            v_new_position.id,
            0,
            'new',
            0,
            0,
            0
        );
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
    v_old_item RECORD;
    v_new_item_id UUID;
BEGIN
    -- Получаем информацию о маппинге
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mapping not found: %', p_mapping_id;
    END IF;

    -- Проверяем, что маппинг подтвержден
    IF v_mapping.mapping_status != 'confirmed' THEN
        RAISE EXCEPTION 'Mapping not confirmed: %', p_mapping_id;
    END IF;

    -- Если это новая позиция, ничего не переносим
    IF v_mapping.mapping_type = 'new' OR v_mapping.old_position_id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Переносим все BOQ items
    FOR v_old_item IN
        SELECT * FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id
        ORDER BY sub_number
    LOOP
        -- Создаем новый BOQ item
        INSERT INTO boq_items (
            tender_id,
            client_position_id,
            item_type,
            sub_number,
            description,
            unit,
            quantity,
            unit_rate,
            total_amount,
            work_id,
            material_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            notes
        )
        SELECT
            v_mapping.new_tender_id,
            v_mapping.new_position_id,
            item_type,
            sub_number,
            description,
            unit,
            quantity,
            unit_rate,
            total_amount,
            work_id,
            material_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            notes
        FROM boq_items
        WHERE id = v_old_item.id
        RETURNING id INTO v_new_item_id;

        -- Переносим связи work-material для этого item
        INSERT INTO work_material_links (
            client_position_id,
            work_boq_item_id,
            material_boq_item_id,
            material_quantity_per_work,
            usage_coefficient,
            delivery_price_type,
            delivery_amount,
            notes
        )
        SELECT
            v_mapping.new_position_id,
            v_new_item_id, -- Новый work item id
            material_boq_item_id, -- Это нужно будет обновить после переноса всех items
            material_quantity_per_work,
            usage_coefficient,
            delivery_price_type,
            delivery_amount,
            notes
        FROM work_material_links
        WHERE work_boq_item_id = v_old_item.id;
    END LOOP;

    -- Обновляем статус маппинга
    UPDATE tender_version_mappings
    SET
        mapping_status = 'applied',
        updated_at = NOW()
    WHERE id = p_mapping_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Функция для обработки ДОП позиций
CREATE OR REPLACE FUNCTION transfer_dop_positions(
    p_old_tender_id UUID,
    p_new_tender_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_dop_position RECORD;
    v_parent_mapping RECORD;
    v_new_position_id UUID;
    v_count INTEGER := 0;
BEGIN
    -- Находим все ДОП позиции в старом тендере
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND position_type = 'dop'
        ORDER BY position_number
    LOOP
        -- Ищем маппинг родительской позиции (если есть)
        SELECT * INTO v_parent_mapping
        FROM tender_version_mappings
        WHERE old_tender_id = p_old_tender_id
        AND new_tender_id = p_new_tender_id
        AND old_position_id = v_dop_position.parent_position_id;

        -- Создаем новую ДОП позицию
        INSERT INTO client_positions (
            tender_id,
            position_number,
            item_no,
            work_name,
            position_type,
            parent_position_id,
            notes
        ) VALUES (
            p_new_tender_id,
            v_dop_position.position_number,
            v_dop_position.item_no,
            v_dop_position.work_name,
            'dop',
            v_parent_mapping.new_position_id, -- Может быть NULL если родитель удален
            COALESCE(v_dop_position.notes, '') ||
            CASE
                WHEN v_parent_mapping.new_position_id IS NULL
                THEN ' (Родительская позиция удалена)'
                ELSE ''
            END
        ) RETURNING id INTO v_new_position_id;

        -- Создаем маппинг для ДОП
        INSERT INTO tender_version_mappings (
            old_tender_id,
            new_tender_id,
            old_position_id,
            new_position_id,
            old_position_number,
            old_work_name,
            new_position_number,
            new_work_name,
            mapping_type,
            confidence_score,
            mapping_status,
            action_type,
            is_dop,
            parent_mapping_id
        ) VALUES (
            p_old_tender_id,
            p_new_tender_id,
            v_dop_position.id,
            v_new_position_id,
            v_dop_position.position_number,
            v_dop_position.work_name,
            v_dop_position.position_number,
            v_dop_position.work_name,
            'dop',
            1.0,
            'confirmed',
            'preserve_dop',
            TRUE,
            v_parent_mapping.id
        );

        -- Переносим BOQ items для ДОП
        PERFORM transfer_boq_items(
            (SELECT id FROM tender_version_mappings
             WHERE old_position_id = v_dop_position.id
             AND new_position_id = v_new_position_id)
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Добавляем комментарии для документации
COMMENT ON TABLE tender_version_mappings IS 'Хранит сопоставления позиций между версиями тендеров';
COMMENT ON COLUMN tender_version_mappings.confidence_score IS 'Общая уверенность в сопоставлении (0-1)';
COMMENT ON COLUMN tender_version_mappings.mapping_type IS 'Тип сопоставления: exact (точное), fuzzy (нечеткое), manual (ручное), dop (ДОП), new (новая), deleted (удалена)';
COMMENT ON COLUMN tender_version_mappings.action_type IS 'Действие при применении: copy_boq (копировать BOQ), create_new (создать новую), delete (удалить), preserve_dop (сохранить ДОП)';

COMMENT ON FUNCTION create_tender_version IS 'Создает новую версию тендера на основе существующего';
COMMENT ON FUNCTION auto_match_positions IS 'Автоматически сопоставляет позиции между версиями используя fuzzy matching';
COMMENT ON FUNCTION transfer_boq_items IS 'Переносит BOQ items и связи между версиями';
COMMENT ON FUNCTION transfer_dop_positions IS 'Обрабатывает перенос ДОП позиций с сохранением всех данных';