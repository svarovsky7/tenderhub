-- Точная структура таблиц для импорта

-- 1. Структура vw_cost_categories
SELECT * FROM vw_cost_categories LIMIT 5;

-- 2. Категории из vw_cost_categories (проверим какие есть)
SELECT DISTINCT 
    category_id,
    -- Попробуем найти имя категории через JOIN или другим способом
    category_id as cat_id
FROM vw_detail_cost_categories;

-- 3. Структура таблицы cost_categories 
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cost_categories'
ORDER BY ordinal_position;

-- 4. Структура таблицы detail_cost_categories
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'detail_cost_categories'
ORDER BY ordinal_position;

-- 5. Примеры из cost_categories
SELECT * FROM cost_categories LIMIT 5;

-- 6. Примеры из detail_cost_categories
SELECT * FROM detail_cost_categories LIMIT 5;