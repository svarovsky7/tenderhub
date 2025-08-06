-- Удаление ограничения chk_quantity_positive чтобы разрешить нулевые количества при импорте
ALTER TABLE boq_items DROP CONSTRAINT IF EXISTS chk_quantity_positive;

-- Проверим все ограничения на таблице boq_items
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON cc.constraint_name = tc.constraint_name 
    AND cc.constraint_schema = tc.constraint_schema
WHERE tc.table_name = 'boq_items' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type;