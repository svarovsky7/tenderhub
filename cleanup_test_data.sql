-- Очистка тестовых данных перед импортом
-- Выполните этот запрос в Supabase SQL Editor если нужно очистить тестовые данные

-- Удаляем тестовые категории
DELETE FROM cost_nodes WHERE name LIKE 'Тест%';
DELETE FROM cost_nodes WHERE name = 'Тестовая категория из UI';

-- Проверяем, что удалилось
SELECT COUNT(*) as remaining_test_records FROM cost_nodes WHERE name LIKE '%Тест%';