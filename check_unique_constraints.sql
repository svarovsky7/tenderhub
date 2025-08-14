-- Проверка всех ограничений на таблицах
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('cost_nodes', 'units', 'location')
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.table_name, tc.constraint_name;

-- Проверка существующих единиц измерения с кодом 'т'
SELECT * FROM units WHERE code = 'т';

-- Проверка дубликатов в units по коду
SELECT code, COUNT(*) as count 
FROM units 
GROUP BY code 
HAVING COUNT(*) > 1;