-- Проверка структуры целевых таблиц для импорта

-- 1. Структура таблицы cost_categories (для столбца 2 - Категория)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cost_categories'
ORDER BY ordinal_position;

-- 2. Структура таблицы detail_cost_categories (для столбца 4 - Вид затрат)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'detail_cost_categories'
ORDER BY ordinal_position;

-- 3. Структура таблицы location уже известна, но проверим ещё раз
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'location'
ORDER BY ordinal_position;

-- 4. Проверим содержимое этих таблиц
SELECT 'cost_categories' as table_name, COUNT(*) as count FROM cost_categories
UNION ALL
SELECT 'detail_cost_categories' as table_name, COUNT(*) as count FROM detail_cost_categories
UNION ALL
SELECT 'location' as table_name, COUNT(*) as count FROM location;

-- 5. Посмотрим примеры данных
SELECT 'cost_categories' as source, * FROM cost_categories LIMIT 3
UNION ALL
SELECT 'detail_cost_categories' as source, * FROM detail_cost_categories LIMIT 3;