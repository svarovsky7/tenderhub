-- SQL команда для удаления ограничения chk_quantity_positive из таблицы boq_items
-- Это позволит устанавливать количество 0 при импорте Excel файлов

ALTER TABLE boq_items 
DROP CONSTRAINT IF EXISTS chk_quantity_positive;

-- Проверим, что ограничение удалено
SELECT constraint_name, constraint_type, check_clause
FROM information_schema.check_constraints 
WHERE table_name = 'boq_items' AND constraint_name = 'chk_quantity_positive';