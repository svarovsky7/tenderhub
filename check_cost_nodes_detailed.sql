-- Проверка структуры таблицы cost_nodes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cost_nodes'
ORDER BY ordinal_position;