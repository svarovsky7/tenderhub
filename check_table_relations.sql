-- Проверка связей между таблицами

-- 1. Внешние ключи для cost_categories
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('cost_categories', 'detail_cost_categories')
ORDER BY tc.table_name, tc.constraint_name;

-- 2. Пример данных из cost_categories
SELECT * FROM cost_categories LIMIT 5;

-- 3. Пример данных из detail_cost_categories  
SELECT * FROM detail_cost_categories LIMIT 5;

-- 4. Связь между cost_categories и detail_cost_categories
SELECT 
    cc.id as category_id,
    cc.title as category_title,
    dcc.id as detail_id,
    dcc.title as detail_title
FROM cost_categories cc
LEFT JOIN detail_cost_categories dcc ON cc.id = dcc.cost_category_id
LIMIT 10;