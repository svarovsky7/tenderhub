-- SQL запросы для диагностики проблем с итогами в "Затраты тендера"
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. ПРОВЕРКА НАЛИЧИЯ ДАННЫХ
-- ==========================

-- 1.1 Проверка тендеров с позициями и BOQ элементами
SELECT 
    t.id,
    t.tender_number,
    t.title,
    COUNT(DISTINCT cp.id) as client_positions_count,
    COUNT(bi.id) as boq_items_count
FROM tenders t
LEFT JOIN client_positions cp ON cp.tender_id = t.id
LEFT JOIN boq_items bi ON bi.client_position_id = cp.id
GROUP BY t.id, t.tender_number, t.title
ORDER BY boq_items_count DESC
LIMIT 10;

-- 1.2 Детальная информация по client_positions
SELECT 
    cp.id,
    cp.tender_id,
    cp.position_number,
    cp.name,
    COUNT(bi.id) as boq_items_count
FROM client_positions cp
LEFT JOIN boq_items bi ON bi.client_position_id = cp.id
GROUP BY cp.id, cp.tender_id, cp.position_number, cp.name
ORDER BY boq_items_count DESC
LIMIT 20;

-- 1.3 Проверка данных в boq_items
SELECT 
    item_type,
    COUNT(*) as count,
    AVG(quantity) as avg_quantity,
    AVG(unit_rate) as avg_unit_rate,
    AVG(total_amount) as avg_total_amount,
    SUM(total_amount) as total_sum
FROM boq_items
WHERE total_amount IS NOT NULL AND total_amount > 0
GROUP BY item_type
ORDER BY total_sum DESC;

-- 2. АНАЛИЗ ТИПОВ ITEM_TYPE
-- =========================

-- 2.1 Статистика по типам item_type
SELECT 
    item_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN total_amount > 0 THEN 1 END) as positive_count,
    MIN(total_amount) as min_sum,
    MAX(total_amount) as max_sum,
    AVG(total_amount) as avg_sum,
    SUM(total_amount) as total_sum
FROM boq_items
GROUP BY item_type
ORDER BY total_sum DESC;

-- 2.2 Проверка конкретных значений enum
SELECT DISTINCT item_type FROM boq_items ORDER BY item_type;

-- 3. ПРОВЕРКА СВЯЗЕЙ С DETAIL_COST_CATEGORIES
-- ===========================================

-- 3.1 BOQ элементы с назначенными категориями затрат
SELECT 
    COUNT(*) as total_boq_items,
    COUNT(CASE WHEN detail_cost_category_id IS NOT NULL THEN 1 END) as with_category,
    COUNT(CASE WHEN detail_cost_category_id IS NULL THEN 1 END) as without_category,
    ROUND(100.0 * COUNT(CASE WHEN detail_cost_category_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as category_coverage_percent
FROM boq_items;

-- 3.2 Суммы по категориям затрат
SELECT 
    dcc.id as detail_category_id,
    cc.name as category_name,
    dcc.name as detail_name,
    COUNT(bi.id) as boq_items_count,
    SUM(CASE WHEN bi.item_type = 'material' THEN bi.total_amount ELSE 0 END) as materials_sum,
    SUM(CASE WHEN bi.item_type = 'work' THEN bi.total_amount ELSE 0 END) as works_sum,
    SUM(CASE WHEN bi.item_type = 'sub_material' THEN bi.total_amount ELSE 0 END) as submaterials_sum,
    SUM(CASE WHEN bi.item_type = 'sub_work' THEN bi.total_amount ELSE 0 END) as subworks_sum,
    SUM(bi.total_amount) as total_sum
FROM detail_cost_categories dcc
INNER JOIN cost_categories cc ON cc.id = dcc.cost_category_id
LEFT JOIN boq_items bi ON bi.detail_cost_category_id = dcc.id
GROUP BY dcc.id, cc.name, dcc.name
HAVING COUNT(bi.id) > 0
ORDER BY total_sum DESC
LIMIT 20;

-- 4. ОСНОВНАЯ ЛОГИКА РАСЧЕТА (ВОСПРОИЗВОДИТ ФРОНТЕНД)
-- =====================================================

-- 4.1 Расчет по тендеру (замените 'your-tender-id' на реальный UUID)
-- ВАЖНО: Замените 'your-tender-id' на реальный UUID тендера!
WITH tender_calculations AS (
    SELECT 
        dcc.id as detail_category_id,
        cc.name as category_name,
        dcc.name as detail_name,
        COALESCE(l.city, l.region, l.country, l.title, 'Не указано') as location,
        dcc.unit,
        SUM(CASE WHEN bi.item_type = 'material' THEN bi.total_amount ELSE 0 END) as materials_total,
        SUM(CASE WHEN bi.item_type = 'work' THEN bi.total_amount ELSE 0 END) as works_total,
        SUM(CASE WHEN bi.item_type = 'sub_material' THEN bi.total_amount ELSE 0 END) as submaterials_total,
        SUM(CASE WHEN bi.item_type = 'sub_work' THEN bi.total_amount ELSE 0 END) as subworks_total,
        COUNT(bi.id) as boq_items_count
    FROM detail_cost_categories dcc
    INNER JOIN cost_categories cc ON cc.id = dcc.cost_category_id
    LEFT JOIN location l ON l.id = dcc.location_id
    LEFT JOIN boq_items bi ON bi.detail_cost_category_id = dcc.id
    LEFT JOIN client_positions cp ON cp.id = bi.client_position_id
    WHERE cp.tender_id = 'your-tender-id'  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ TENDER ID
    GROUP BY dcc.id, cc.name, dcc.name, l.city, l.region, l.country, l.title, dcc.unit
)
SELECT 
    *,
    (materials_total + works_total + submaterials_total + subworks_total) as grand_total
FROM tender_calculations
ORDER BY grand_total DESC;

-- 4.2 Детальная проверка каждого BOQ элемента
-- ВАЖНО: Замените 'your-tender-id' на реальный UUID тендера!
SELECT 
    bi.id,
    bi.item_type,
    bi.quantity,
    bi.unit_rate,
    (bi.quantity * bi.unit_rate) as calculated_sum,
    bi.detail_cost_category_id,
    cc.name as category_name,
    dcc.name as detail_name,
    cp.tender_id,
    t.tender_number
FROM boq_items bi
LEFT JOIN detail_cost_categories dcc ON dcc.id = bi.detail_cost_category_id
LEFT JOIN cost_categories cc ON cc.id = dcc.cost_category_id
LEFT JOIN client_positions cp ON cp.id = bi.client_position_id
LEFT JOIN tenders t ON t.id = cp.tender_id
WHERE cp.tender_id = 'your-tender-id'  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ TENDER ID
ORDER BY (bi.quantity * bi.unit_rate) DESC
LIMIT 50;

-- 5. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
-- ==============================

-- 5.1 Поиск некорректных значений
SELECT 
    'Отрицательные quantity' as issue_type,
    COUNT(*) as count
FROM boq_items 
WHERE quantity < 0
UNION ALL
SELECT 
    'Отрицательные unit_rate' as issue_type,
    COUNT(*) as count
FROM boq_items 
WHERE unit_rate < 0
UNION ALL
SELECT 
    'NULL quantity' as issue_type,
    COUNT(*) as count
FROM boq_items 
WHERE quantity IS NULL
UNION ALL
SELECT 
    'NULL unit_rate' as issue_type,
    COUNT(*) as count
FROM boq_items 
WHERE unit_rate IS NULL;

-- 5.2 Orphaned BOQ items (без client_positions)
SELECT 
    COUNT(*) as orphaned_boq_items
FROM boq_items bi
LEFT JOIN client_positions cp ON cp.id = bi.client_position_id
WHERE cp.id IS NULL;

-- 6. ТЕСТОВЫЕ ПРИМЕРЫ
-- ===================

-- 6.1 Топ-10 самых дорогих BOQ позиций
SELECT 
    bi.id,
    bi.item_type,
    bi.quantity,
    bi.unit_rate,
    (bi.quantity * bi.unit_rate) as total_cost,
    t.tender_number,
    cp.position_number,
    cc.name as category_name,
    dcc.name as detail_name
FROM boq_items bi
LEFT JOIN client_positions cp ON cp.id = bi.client_position_id
LEFT JOIN tenders t ON t.id = cp.tender_id
LEFT JOIN detail_cost_categories dcc ON dcc.id = bi.detail_cost_category_id
LEFT JOIN cost_categories cc ON cc.id = dcc.cost_category_id
WHERE bi.quantity > 0 AND bi.unit_rate > 0
ORDER BY (bi.quantity * bi.unit_rate) DESC
LIMIT 10;

-- 6.2 Итоговая сводка по всем тендерам
SELECT 
    t.tender_number,
    t.title,
    COUNT(bi.id) as total_boq_items,
    COUNT(DISTINCT bi.detail_cost_category_id) as unique_categories,
    SUM(bi.quantity * bi.unit_rate) as total_tender_cost
FROM tenders t
LEFT JOIN client_positions cp ON cp.id = t.id
LEFT JOIN boq_items bi ON bi.client_position_id = cp.id
WHERE bi.quantity IS NOT NULL AND bi.unit_rate IS NOT NULL
GROUP BY t.id, t.tender_number, t.title
ORDER BY total_tender_cost DESC
LIMIT 10;

-- ИНСТРУКЦИИ:
-- 1. Замените 'your-tender-id' в запросах 4.1 и 4.2 на реальный UUID тендера
-- 2. Выполните запросы по порядку
-- 3. Обратите особое внимание на результаты запросов 4.1 и 4.2
-- 4. Если запросы показывают данные, но фронтенд показывает нули - проблема в коде React
-- 5. Если запросы показывают пустые результаты - проблема в данных или связях между таблицами