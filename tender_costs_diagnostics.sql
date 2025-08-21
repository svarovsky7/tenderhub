-- ============================================================================
-- ДИАГНОСТИЧЕСКИЕ SQL ЗАПРОСЫ ДЛЯ ТЕСТИРОВАНИЯ ЗАТРАТ ТЕНДЕРА
-- ============================================================================
-- TenderHub - Диагностика проблемы с расчетом итогов в таблице затрат
-- Используется схема из supabase/schemas/prod.sql
-- ============================================================================

-- 1. ПРОВЕРКА НАЛИЧИЯ ДАННЫХ В ОСНОВНЫХ ТАБЛИЦАХ
-- ============================================================================

-- 1.1. Проверка наличия тендеров
SELECT 
    t.id,
    t.name,
    t.created_at,
    (SELECT COUNT(*) FROM client_positions cp WHERE cp.tender_id = t.id) as client_positions_count,
    (SELECT COUNT(*) FROM boq_items bi WHERE bi.tender_id = t.id) as boq_items_count
FROM tenders t
ORDER BY t.created_at DESC
LIMIT 10;

-- 1.2. Детальная информация по client_positions для конкретного тендера
-- ЗАМЕНИТЬ 'your-tender-id' на реальный ID тендера
SELECT 
    cp.id,
    cp.tender_id,
    cp.position_number,
    cp.item_no,
    cp.work_name,
    cp.unit,
    cp.volume,
    cp.total_materials_cost,
    cp.total_works_cost,
    (SELECT COUNT(*) FROM boq_items bi WHERE bi.client_position_id = cp.id) as boq_items_count
FROM client_positions cp 
WHERE cp.tender_id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
ORDER BY cp.position_number;

-- 1.3. Проверка данных в boq_items для конкретного тендера
SELECT 
    bi.id,
    bi.tender_id,
    bi.client_position_id,
    bi.item_number,
    bi.item_type,
    bi.description,
    bi.unit,
    bi.quantity,
    bi.unit_rate,
    bi.detail_cost_category_id,
    bi.total_amount,
    (bi.quantity * bi.unit_rate) as calculated_amount
FROM boq_items bi 
WHERE bi.tender_id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
ORDER BY bi.client_position_id, bi.sort_order;

-- ============================================================================
-- 2. АНАЛИЗ ТИПОВ ITEM_TYPE И ИХ РАСПРЕДЕЛЕНИЕ
-- ============================================================================

-- 2.1. Статистика по типам item_type во всей системе
SELECT 
    item_type,
    COUNT(*) as count,
    COUNT(CASE WHEN quantity > 0 AND unit_rate > 0 THEN 1 END) as items_with_positive_values,
    SUM(quantity * unit_rate) as total_calculated_amount,
    AVG(quantity * unit_rate) as avg_calculated_amount,
    MIN(quantity * unit_rate) as min_calculated_amount,
    MAX(quantity * unit_rate) as max_calculated_amount
FROM boq_items
GROUP BY item_type
ORDER BY count DESC;

-- 2.2. Статистика по типам для конкретного тендера
SELECT 
    bi.item_type,
    COUNT(*) as count,
    COUNT(CASE WHEN bi.quantity > 0 AND bi.unit_rate > 0 THEN 1 END) as items_with_positive_values,
    SUM(bi.quantity * bi.unit_rate) as total_calculated_amount,
    AVG(bi.quantity * bi.unit_rate) as avg_calculated_amount
FROM boq_items bi
WHERE bi.tender_id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
GROUP BY bi.item_type
ORDER BY count DESC;

-- ============================================================================
-- 3. ПРОВЕРКА СВЯЗЕЙ С DETAIL_COST_CATEGORIES
-- ============================================================================

-- 3.1. Количество элементов BOQ со связанными категориями затрат
SELECT 
    'С категорией затрат' as status,
    COUNT(*) as count,
    SUM(quantity * unit_rate) as total_amount
FROM boq_items 
WHERE detail_cost_category_id IS NOT NULL
UNION ALL
SELECT 
    'Без категории затрат' as status,
    COUNT(*) as count,
    SUM(quantity * unit_rate) as total_amount
FROM boq_items 
WHERE detail_cost_category_id IS NULL;

-- 3.2. Детальная проверка связей для конкретного тендера
SELECT 
    bi.item_type,
    COUNT(CASE WHEN bi.detail_cost_category_id IS NOT NULL THEN 1 END) as with_category,
    COUNT(CASE WHEN bi.detail_cost_category_id IS NULL THEN 1 END) as without_category,
    SUM(CASE WHEN bi.detail_cost_category_id IS NOT NULL THEN bi.quantity * bi.unit_rate ELSE 0 END) as amount_with_category,
    SUM(CASE WHEN bi.detail_cost_category_id IS NULL THEN bi.quantity * bi.unit_rate ELSE 0 END) as amount_without_category
FROM boq_items bi
WHERE bi.tender_id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
GROUP BY bi.item_type;

-- ============================================================================
-- 4. ПРОВЕРКА ЛОГИКИ РАСЧЕТА ЗАТРАТ ПО КАТЕГОРИЯМ
-- ============================================================================

-- 4.1. Расчет итогов по detail_cost_categories для тендера (основная логика)
SELECT 
    dcc.id as detail_cost_category_id,
    dcc.name as detail_category_name,
    cc.name as cost_category_name,
    loc.name as location_name,
    
    -- Подсчет по типам материалов
    SUM(CASE WHEN bi.item_type = 'material' THEN bi.quantity * bi.unit_rate ELSE 0 END) as material_total,
    COUNT(CASE WHEN bi.item_type = 'material' THEN 1 END) as material_count,
    
    -- Подсчет по типам работ
    SUM(CASE WHEN bi.item_type = 'work' THEN bi.quantity * bi.unit_rate ELSE 0 END) as work_total,
    COUNT(CASE WHEN bi.item_type = 'work' THEN 1 END) as work_count,
    
    -- Подсчет по типам субматериалов
    SUM(CASE WHEN bi.item_type = 'sub_material' THEN bi.quantity * bi.unit_rate ELSE 0 END) as sub_material_total,
    COUNT(CASE WHEN bi.item_type = 'sub_material' THEN 1 END) as sub_material_count,
    
    -- Подсчет по типам субработ
    SUM(CASE WHEN bi.item_type = 'sub_work' THEN bi.quantity * bi.unit_rate ELSE 0 END) as sub_work_total,
    COUNT(CASE WHEN bi.item_type = 'sub_work' THEN 1 END) as sub_work_count,
    
    -- Общий итог
    SUM(bi.quantity * bi.unit_rate) as grand_total,
    COUNT(bi.id) as total_items

FROM detail_cost_categories dcc
LEFT JOIN cost_categories cc ON dcc.cost_category_id = cc.id
LEFT JOIN location loc ON dcc.location_id = loc.id
LEFT JOIN boq_items bi ON bi.detail_cost_category_id = dcc.id 
    AND bi.tender_id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID

GROUP BY dcc.id, dcc.name, cc.name, loc.name
ORDER BY cc.name, dcc.name, loc.name;

-- 4.2. Проверка конкретных элементов BOQ с детализацией расчетов
SELECT 
    bi.id,
    bi.item_number,
    bi.item_type,
    bi.description,
    bi.quantity,
    bi.unit_rate,
    bi.quantity * bi.unit_rate as calculated_amount,
    bi.total_amount as stored_amount,
    CASE 
        WHEN bi.total_amount IS NULL THEN 'NULL'
        WHEN ABS(bi.total_amount - (bi.quantity * bi.unit_rate)) < 0.01 THEN 'MATCH'
        ELSE 'MISMATCH'
    END as amount_check,
    
    dcc.name as detail_category_name,
    cc.name as cost_category_name,
    loc.name as location_name

FROM boq_items bi
LEFT JOIN detail_cost_categories dcc ON bi.detail_cost_category_id = dcc.id
LEFT JOIN cost_categories cc ON dcc.cost_category_id = cc.id
LEFT JOIN location loc ON dcc.location_id = loc.id

WHERE bi.tender_id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
ORDER BY bi.client_position_id, bi.sort_order;

-- ============================================================================
-- 5. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
-- ============================================================================

-- 5.1. Проверка на наличие некорректных значений
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

-- 5.2. Проверка orphaned записей
SELECT 
    'BOQ items без client_position' as issue_type,
    COUNT(*) as count
FROM boq_items bi
LEFT JOIN client_positions cp ON bi.client_position_id = cp.id
WHERE cp.id IS NULL
UNION ALL
SELECT 
    'BOQ items с несуществующими detail_cost_category_id' as issue_type,
    COUNT(*) as count
FROM boq_items bi
LEFT JOIN detail_cost_categories dcc ON bi.detail_cost_category_id = dcc.id
WHERE bi.detail_cost_category_id IS NOT NULL AND dcc.id IS NULL;

-- ============================================================================
-- 6. ТЕСТОВЫЕ ПРИМЕРЫ РЕАЛЬНЫХ РАСЧЕТОВ
-- ============================================================================

-- 6.1. Топ-10 самых дорогих позиций BOQ
SELECT 
    bi.item_number,
    bi.item_type,
    bi.description,
    bi.quantity,
    bi.unit_rate,
    bi.quantity * bi.unit_rate as calculated_amount,
    dcc.name as detail_category,
    cc.name as cost_category
FROM boq_items bi
LEFT JOIN detail_cost_categories dcc ON bi.detail_cost_category_id = dcc.id
LEFT JOIN cost_categories cc ON dcc.cost_category_id = cc.id
WHERE bi.tender_id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
ORDER BY (bi.quantity * bi.unit_rate) DESC
LIMIT 10;

-- 6.2. Сводка по тендеру - итоговые суммы
SELECT 
    t.name as tender_name,
    COUNT(DISTINCT cp.id) as total_positions,
    COUNT(bi.id) as total_boq_items,
    
    -- Суммы по типам
    SUM(CASE WHEN bi.item_type = 'material' THEN bi.quantity * bi.unit_rate ELSE 0 END) as total_materials,
    SUM(CASE WHEN bi.item_type = 'work' THEN bi.quantity * bi.unit_rate ELSE 0 END) as total_works,
    SUM(CASE WHEN bi.item_type = 'sub_material' THEN bi.quantity * bi.unit_rate ELSE 0 END) as total_sub_materials,
    SUM(CASE WHEN bi.item_type = 'sub_work' THEN bi.quantity * bi.unit_rate ELSE 0 END) as total_sub_works,
    
    -- Общий итог
    SUM(bi.quantity * bi.unit_rate) as grand_total
    
FROM tenders t
LEFT JOIN client_positions cp ON t.id = cp.tender_id
LEFT JOIN boq_items bi ON cp.id = bi.client_position_id
WHERE t.id = 'your-tender-id'  -- ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
GROUP BY t.id, t.name;

-- ============================================================================
-- ИНСТРУКЦИИ ПО ИСПОЛЬЗОВАНИЮ:
-- ============================================================================
-- 1. Замените 'your-tender-id' на реальный UUID тендера из базы данных
-- 2. Выполните запросы по порядку для систематической диагностики
-- 3. Обратите внимание на результаты запросов 4.1 и 4.2 - они показывают
--    основную логику расчета, которая должна работать на фронтенде
-- 4. Если в результатах много нулей, проверьте:
--    - Заполнены ли поля detail_cost_category_id в boq_items
--    - Корректны ли значения quantity и unit_rate
--    - Существуют ли связанные записи в detail_cost_categories
-- ============================================================================