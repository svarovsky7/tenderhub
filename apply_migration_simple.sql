-- ПРОСТАЯ МИГРАЦИЯ ДЛЯ ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ TenderHub
-- Применяйте команды по одной через Supabase SQL Editor
-- Все индексы проверены на соответствие реальной структуре БД

-- ============================================
-- КРИТИЧЕСКИЕ ИНДЕКСЫ (применить в первую очередь)
-- ============================================

-- 1. Главный индекс для фильтрации BOQ (самый важный!)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_tender_position_type 
ON boq_items(tender_id, client_position_id, item_type);

-- 2. Индекс для категорий затрат
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_detail_cost_category_id 
ON boq_items(detail_cost_category_id) WHERE detail_cost_category_id IS NOT NULL;

-- 3. Индекс для связей работ и материалов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_material_links_position_work 
ON work_material_links(client_position_id, work_boq_item_id);

-- 4. Индекс для поиска материалов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_material_links_material 
ON work_material_links(material_boq_item_id);

-- ============================================
-- ИНДЕКСЫ ДЛЯ ПОИСКА (применить во вторую очередь)
-- ============================================

-- 5. Полнотекстовый поиск по BOQ
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_description_gin 
ON boq_items USING gin(to_tsvector('russian'::regconfig, description));

-- 6. Полнотекстовый поиск по библиотеке материалов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_library_search_gin 
ON materials_library USING gin(to_tsvector('russian'::regconfig, 
  coalesce(name,'') || ' ' || coalesce(description,'')));

-- 7. Полнотекстовый поиск по библиотеке работ
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_works_library_search_gin 
ON works_library USING gin(to_tsvector('russian'::regconfig, 
  coalesce(name,'') || ' ' || coalesce(description,'')));

-- ============================================
-- ДОПОЛНИТЕЛЬНЫЕ ИНДЕКСЫ (применить в третью очередь)
-- ============================================

-- 8. Сортировка BOQ внутри позиций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_position_sort 
ON boq_items(client_position_id, sub_number, sort_order);

-- 9. Фильтрация по сумме
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_total_amount 
ON boq_items(total_amount) WHERE total_amount > 0;

-- 10. Позиции заказчика по тендеру
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_positions_tender_id 
ON client_positions(tender_id);

-- 11. Сортировка тендеров
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenders_updated_at 
ON tenders(updated_at DESC);

-- ============================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================
-- После применения всех индексов выполните эту команду для проверки:
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('boq_items', 'work_material_links', 'materials_library', 'works_library', 'client_positions', 'tenders')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
*/

-- ============================================
-- СТАТИСТИКА ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================
-- Для проверки улучшений выполните:
/*
-- Размер таблиц и индексов
SELECT 
  relname AS "Table",
  pg_size_pretty(pg_total_relation_size(relid)) AS "Total Size",
  pg_size_pretty(pg_relation_size(relid)) AS "Table Size",
  pg_size_pretty(pg_indexes_size(relid)) AS "Indexes Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;
*/