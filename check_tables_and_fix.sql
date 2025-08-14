-- 1. Проверка структуры таблицы cost_nodes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cost_nodes'
ORDER BY ordinal_position;

-- 2. Проверка, есть ли записи в cost_nodes
SELECT COUNT(*) as count FROM cost_nodes;

-- 3. Попробуем создать тестовую категорию напрямую
INSERT INTO cost_nodes (
    parent_id,
    kind,
    name,
    unit_id,
    sort_order
) VALUES (
    NULL,
    'group',
    'Тестовая категория',
    NULL,
    100
) RETURNING *;

-- 4. Если вставка не работает, проверим ограничения
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'cost_nodes'::regclass;

-- 5. Проверим, есть ли триггеры на таблице
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'cost_nodes';

-- 6. Проверим RLS политики
SELECT 
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cost_nodes';