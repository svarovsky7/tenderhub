-- Проверка представлений (views)

-- 1. Структура vw_cost_categories
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'vw_cost_categories'
ORDER BY ordinal_position;

-- 2. Структура vw_detail_cost_categories
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'vw_detail_cost_categories'
ORDER BY ordinal_position;

-- 3. Примеры данных из представлений
SELECT * FROM vw_cost_categories LIMIT 5;
SELECT * FROM vw_detail_cost_categories LIMIT 5;