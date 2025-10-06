-- Migration: Fix BOQ item types for ЖК Адмирал tender
-- This fixes the issue where all items have NULL type, preventing commercial markup calculations

-- First, let's check current situation
DO $$
DECLARE
    tender_id_admiral UUID := '736dc11c-33dc-4fce-a7ee-c477abb8b694';
    position_117 UUID;
    total_count INTEGER;
    null_count INTEGER;
BEGIN
    -- Count total items and NULL types
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE item_type IS NULL)
    INTO total_count, null_count
    FROM boq_items
    WHERE tender_id = tender_id_admiral;

    RAISE NOTICE 'Tender ЖК Адмирал: Total BOQ items: %, NULL types: %', total_count, null_count;

    -- Get position 117 ID
    SELECT cp.id INTO position_117
    FROM client_positions cp
    WHERE cp.tender_id = tender_id_admiral
    AND cp.position_number = 117;

    IF position_117 IS NOT NULL THEN
        RAISE NOTICE 'Position 117 found: %', position_117;
    END IF;
END $$;

-- Update BOQ item types based on description keywords
UPDATE boq_items
SET item_type =
    CASE
        -- Субподрядные работы
        WHEN lower(description) LIKE '%суб-раб%'
            OR lower(description) LIKE '%субподряд%работ%'
            OR lower(description) LIKE '%монтаж%'
            OR lower(description) LIKE '%демонтаж%'
            OR lower(description) LIKE '%установк%'
            OR lower(description) LIKE '%устройство%'
            OR lower(description) LIKE '%разработка грунта%'
            OR lower(description) LIKE '%прокладк%'
            OR lower(description) LIKE '%бурение%'
            OR lower(description) LIKE '%свай%'
            OR lower(description) LIKE '%фундамент%'
            OR lower(description) LIKE '%бетонн%работ%'
            OR lower(description) LIKE '%кладк%'
            OR lower(description) LIKE '%штукатур%'
            OR lower(description) LIKE '%облицов%'
            OR lower(description) LIKE '%окраск%'
            OR lower(description) LIKE '%кровл%'
            OR lower(description) LIKE '%изоляц%'
        THEN 'sub_work'::boq_item_type

        -- Субподрядные материалы
        WHEN lower(description) LIKE '%суб-мат%'
            OR lower(description) LIKE '%субподрядн%материал%'
            OR lower(description) LIKE '%поставка материал%субподряд%'
        THEN 'sub_material'::boq_item_type

        -- Работы собственными силами
        WHEN lower(description) LIKE '%работ%'
            OR lower(description) LIKE '%услуг%'
            OR lower(description) LIKE '%выполнен%'
            OR lower(description) LIKE '%изготовлен%'
            OR lower(description) LIKE '%подготовк%'
            OR lower(description) LIKE '%обслуживан%'
            OR lower(description) LIKE '%испытан%'
            OR lower(description) LIKE '%наладк%'
            OR lower(description) LIKE '%пуск%'
            OR lower(description) LIKE '%проектирован%'
            OR lower(description) LIKE '%разработк%проект%'
            OR lower(description) LIKE '%документац%'
        THEN 'work'::boq_item_type

        -- Материалы (по умолчанию для остального)
        ELSE 'material'::boq_item_type
    END
WHERE tender_id = '736dc11c-33dc-4fce-a7ee-c477abb8b694'
AND item_type IS NULL;

-- Специальная обработка позиции 117 - Разработка грунта (должна быть субподрядной работой)
UPDATE boq_items bi
SET item_type = 'sub_work'::boq_item_type
FROM client_positions cp
WHERE bi.client_position_id = cp.id
AND cp.tender_id = '736dc11c-33dc-4fce-a7ee-c477abb8b694'
AND cp.position_number = 117;

-- Обработка позиций в диапазоне 100-200 (обычно субподрядные работы)
UPDATE boq_items bi
SET item_type =
    CASE
        WHEN bi.item_type IN ('work', 'material') THEN 'sub_work'::boq_item_type
        ELSE bi.item_type
    END
FROM client_positions cp
WHERE bi.client_position_id = cp.id
AND cp.tender_id = '736dc11c-33dc-4fce-a7ee-c477abb8b694'
AND cp.position_number BETWEEN 100 AND 200
AND bi.item_type IS NOT NULL;

-- Проверка результатов
DO $$
DECLARE
    tender_id_admiral UUID := '736dc11c-33dc-4fce-a7ee-c477abb8b694';
    stats RECORD;
BEGIN
    -- Статистика по типам
    FOR stats IN
        SELECT item_type, COUNT(*) as cnt
        FROM boq_items
        WHERE tender_id = tender_id_admiral
        GROUP BY item_type
        ORDER BY item_type
    LOOP
        RAISE NOTICE 'Type %: % items', stats.item_type, stats.cnt;
    END LOOP;

    -- Проверка позиции 117
    FOR stats IN
        SELECT
            cp.position_number,
            cp.work_name,
            bi.item_type,
            bi.description,
            cp.total_works_cost as base_cost,
            cp.total_commercial_works_cost as commercial_cost
        FROM client_positions cp
        JOIN boq_items bi ON bi.client_position_id = cp.id
        WHERE cp.tender_id = tender_id_admiral
        AND cp.position_number = 117
        LIMIT 1
    LOOP
        RAISE NOTICE 'Position 117: % - Type: %', stats.work_name, stats.item_type;
        RAISE NOTICE '  Base: %, Commercial: %', stats.base_cost, stats.commercial_cost;
    END LOOP;
END $$;

-- После установки типов нужно пересчитать коммерческие стоимости
-- Это будет сделано отдельным скриптом recalculateCommercialCosts.ts