-- SQL для проверки и корректировки данных локаций в Supabase
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверка структуры таблиц
SELECT 
    'detail_cost_categories' as table_name,
    count(*) as total_count
FROM detail_cost_categories
UNION ALL
SELECT 
    'location' as table_name,
    count(*) as total_count
FROM location
UNION ALL
SELECT 
    'cost_categories' as table_name,
    count(*) as total_count
FROM cost_categories;

-- 2. Проверка связей между таблицами
SELECT 
    dcc.id,
    cc.name as category_name,
    dcc.name as detail_name,
    COALESCE(l.city, l.region, l.country, l.title, 'Не указано') as location_display,
    dcc.unit,
    dcc.unit_cost
FROM detail_cost_categories dcc
LEFT JOIN cost_categories cc ON cc.id = dcc.cost_category_id
LEFT JOIN location l ON l.id = dcc.location_id
ORDER BY cc.name, dcc.name, l.city;

-- 3. Проверка BOQ items с категориями затрат
SELECT 
    t.tender_number,
    t.title as tender_title,
    cc.name as category_name,
    dcc.name as detail_name,
    COALESCE(l.city, l.region, l.country, l.title, 'Не указано') as location_display,
    bi.item_type,
    COUNT(*) as items_count,
    SUM(bi.quantity * bi.unit_rate) as total_sum
FROM boq_items bi
INNER JOIN tenders t ON t.id = bi.tender_id
LEFT JOIN detail_cost_categories dcc ON dcc.id = bi.detail_cost_category_id
LEFT JOIN cost_categories cc ON cc.id = dcc.cost_category_id
LEFT JOIN location l ON l.id = dcc.location_id
WHERE bi.detail_cost_category_id IS NOT NULL
GROUP BY 
    t.tender_number,
    t.title,
    cc.name,
    dcc.name,
    l.city,
    l.region,
    l.country,
    l.title,
    bi.item_type
ORDER BY 
    t.tender_number,
    cc.name,
    dcc.name;

-- 4. Создание представления для удобной работы с полными категориями
CREATE OR REPLACE VIEW v_cost_categories_full AS
SELECT 
    dcc.id as detail_category_id,
    cc.id as category_id,
    l.id as location_id,
    cc.name as category_name,
    dcc.name as detail_name,
    COALESCE(
        NULLIF(CONCAT_WS(', ', l.city, l.region, l.country), ''),
        l.title,
        'Не указано'
    ) as location_display,
    CONCAT(
        cc.name, 
        '-', 
        dcc.name, 
        CASE 
            WHEN l.city IS NOT NULL OR l.region IS NOT NULL OR l.country IS NOT NULL OR l.title IS NOT NULL 
            THEN CONCAT('-', COALESCE(NULLIF(CONCAT_WS(', ', l.city, l.region, l.country), ''), l.title))
            ELSE ''
        END
    ) as full_category_path,
    dcc.unit,
    dcc.unit_cost
FROM detail_cost_categories dcc
INNER JOIN cost_categories cc ON cc.id = dcc.cost_category_id
LEFT JOIN location l ON l.id = dcc.location_id;

-- 5. Проверка данных в новом представлении
SELECT * FROM v_cost_categories_full
ORDER BY category_name, detail_name, location_display
LIMIT 50;

-- 6. Если нужно добавить отсутствующие локации (пример)
-- INSERT INTO location (country, region, city, title) VALUES
-- ('Россия', 'Московская область', 'Москва', 'г. Москва'),
-- ('Россия', 'Ленинградская область', 'Санкт-Петербург', 'г. Санкт-Петербург'),
-- ('Россия', NULL, NULL, 'Здание'),
-- ('Россия', NULL, NULL, 'Территория'),
-- ('Россия', NULL, NULL, 'Общая локация')
-- ON CONFLICT DO NOTHING;

-- 7. Обновление пустых локаций (если есть detail_cost_categories без location_id)
-- UPDATE detail_cost_categories 
-- SET location_id = (SELECT id FROM location WHERE title = 'Общая локация' LIMIT 1)
-- WHERE location_id IS NULL;

-- 8. Создание функции для получения затрат по тендеру с группировкой
CREATE OR REPLACE FUNCTION get_tender_costs_by_category(p_tender_id UUID)
RETURNS TABLE (
    detail_category_id UUID,
    category_name TEXT,
    detail_name TEXT,
    location_display TEXT,
    full_path TEXT,
    unit TEXT,
    materials_sum NUMERIC,
    works_sum NUMERIC,
    total_sum NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dcc.id as detail_category_id,
        cc.name as category_name,
        dcc.name as detail_name,
        COALESCE(
            NULLIF(CONCAT_WS(', ', l.city, l.region, l.country), ''),
            l.title,
            'Не указано'
        ) as location_display,
        CONCAT(
            cc.name, '-', dcc.name,
            CASE 
                WHEN l.city IS NOT NULL OR l.region IS NOT NULL OR l.country IS NOT NULL OR l.title IS NOT NULL 
                THEN CONCAT('-', COALESCE(NULLIF(CONCAT_WS(', ', l.city, l.region, l.country), ''), l.title))
                ELSE ''
            END
        ) as full_path,
        dcc.unit,
        COALESCE(SUM(CASE WHEN bi.item_type = 'material' THEN bi.quantity * bi.unit_rate ELSE 0 END), 0) as materials_sum,
        COALESCE(SUM(CASE WHEN bi.item_type = 'work' THEN bi.quantity * bi.unit_rate ELSE 0 END), 0) as works_sum,
        COALESCE(SUM(bi.quantity * bi.unit_rate), 0) as total_sum
    FROM detail_cost_categories dcc
    INNER JOIN cost_categories cc ON cc.id = dcc.cost_category_id
    LEFT JOIN location l ON l.id = dcc.location_id
    LEFT JOIN boq_items bi ON bi.detail_cost_category_id = dcc.id AND bi.tender_id = p_tender_id
    GROUP BY 
        dcc.id,
        cc.name,
        dcc.name,
        l.city,
        l.region,
        l.country,
        l.title,
        dcc.unit
    ORDER BY 
        cc.name,
        dcc.name,
        location_display;
END;
$$ LANGUAGE plpgsql;

-- 9. Тест функции (замените UUID на реальный ID тендера)
-- SELECT * FROM get_tender_costs_by_category('ваш-uuid-тендера-здесь');

-- 10. Проверка уникальности связок
SELECT 
    CONCAT(cc.name, '-', dcc.name, '-', COALESCE(l.city, l.region, l.country, l.title, 'Не указано')) as unique_key,
    COUNT(*) as count
FROM detail_cost_categories dcc
INNER JOIN cost_categories cc ON cc.id = dcc.cost_category_id
LEFT JOIN location l ON l.id = dcc.location_id
GROUP BY 
    cc.name,
    dcc.name,
    l.city,
    l.region,
    l.country,
    l.title
HAVING COUNT(*) > 1;

-- Если есть дубликаты, их нужно будет объединить или удалить