-- Тест создания записи в cost_nodes
-- Выполните этот запрос в Supabase SQL Editor

-- 1. Сначала проверим структуру таблицы
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cost_nodes'
ORDER BY ordinal_position;

-- 2. Попробуем создать простую категорию
INSERT INTO cost_nodes (
    parent_id,
    kind,
    name,
    sort_order
) VALUES (
    NULL,
    'group',
    'Тест категория',
    100
) RETURNING *;

-- 3. Если не работает, попробуем с минимальными полями
INSERT INTO cost_nodes (
    kind,
    name
) VALUES (
    'group',
    'Тест категория 2'
) RETURNING *;

-- 4. Проверим результат
SELECT * FROM cost_nodes WHERE name LIKE 'Тест%';