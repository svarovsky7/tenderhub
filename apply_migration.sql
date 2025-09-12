-- Применение оптимизаций производительности для TenderHub
-- Выполнять по одной команде через Supabase SQL Editor
-- Дата: 2025-01-09

-- ============================================
-- 1. ИНДЕКСЫ ДЛЯ BOQ_ITEMS
-- ============================================

-- Индекс для detail_cost_category_id (ускоряет загрузку категорий затрат)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_detail_cost_category_id 
ON boq_items(detail_cost_category_id) WHERE detail_cost_category_id IS NOT NULL;

-- Композитный индекс для фильтрации BOQ (критически важен для производительности)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_tender_position_type 
ON boq_items(tender_id, client_position_id, item_type);

-- Индекс для поиска по описанию (full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_description_gin 
ON boq_items USING gin(to_tsvector('russian'::regconfig, description));

-- Индекс для сортировки внутри позиций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_position_sort 
ON boq_items(client_position_id, sub_number, sort_order);

-- Индекс для фильтрации по total_amount
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_total_amount 
ON boq_items(total_amount) WHERE total_amount > 0;

-- ============================================
-- 2. ИНДЕКСЫ ДЛЯ WORK_MATERIAL_LINKS
-- ============================================

-- Индекс для быстрого поиска связей по позиции и работе
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_material_links_position_work 
ON work_material_links(client_position_id, work_boq_item_id);

-- Индекс для поиска по материалу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_material_links_material 
ON work_material_links(material_boq_item_id);

-- ============================================
-- 3. ПОИСКОВЫЕ ИНДЕКСЫ ДЛЯ БИБЛИОТЕК
-- ============================================

-- Full-text search для библиотеки материалов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_library_search_gin 
ON materials_library USING gin(to_tsvector('russian'::regconfig, 
  coalesce(name,'') || ' ' || coalesce(description,'')));

-- Full-text search для библиотеки работ
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_works_library_search_gin 
ON works_library USING gin(to_tsvector('russian'::regconfig, 
  coalesce(name,'') || ' ' || coalesce(description,'')));

-- ============================================
-- 4. ИНДЕКСЫ ДЛЯ CLIENT_POSITIONS
-- ============================================

-- Индекс для поиска позиций по тендеру
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_positions_tender_id 
ON client_positions(tender_id);

-- Индекс для сортировки позиций по номеру
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_positions_tender_position 
ON client_positions(tender_id, position_number);

-- ============================================
-- 5. ИНДЕКСЫ ДЛЯ TENDERS
-- ============================================

-- Индекс для сортировки тендеров по дате обновления
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenders_updated_at 
ON tenders(updated_at DESC);

-- Индекс для поиска по номеру тендера
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenders_number 
ON tenders(tender_number);

-- Индекс для фильтрации по дедлайну
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenders_deadline 
ON tenders(submission_deadline) WHERE submission_deadline IS NOT NULL;

-- ============================================
-- 6. ИНДЕКСЫ ДЛЯ DETAIL_COST_CATEGORIES
-- ============================================

-- Индекс для быстрого поиска по категории и локации
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detail_cost_categories_cat_loc 
ON detail_cost_categories(cost_category_id, location_id);

-- Индекс для поиска по названию
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detail_cost_categories_name 
ON detail_cost_categories(name);

-- ============================================
-- 7. ФУНКЦИЯ ДЛЯ BATCH ЗАГРУЗКИ КАТЕГОРИЙ
-- ============================================

-- Функция для пакетной загрузки отображаемых названий категорий затрат
CREATE OR REPLACE FUNCTION get_cost_categories_batch(p_detail_ids uuid[])
RETURNS TABLE(
  detail_id uuid, 
  category_name text,
  detail_name text,
  location_name text,
  full_display text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dcc.id as detail_id,
    cc.name as category_name,
    dcc.name as detail_name,
    l.name as location_name,
    cc.name || ' → ' || dcc.name || ' → ' || l.name as full_display
  FROM detail_cost_categories dcc
  JOIN cost_categories cc ON cc.id = dcc.cost_category_id
  JOIN location l ON l.id = dcc.location_id
  WHERE dcc.id = ANY(p_detail_ids);
END;
$$;

-- Предоставляем права на функцию
GRANT EXECUTE ON FUNCTION get_cost_categories_batch TO anon, authenticated;

-- ============================================
-- 8. ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ ДЛЯ МАТЕРИАЛОВ
-- ============================================

-- Оптимизированная функция для получения материалов работы
CREATE OR REPLACE FUNCTION get_materials_for_work_optimized(p_work_boq_item_id uuid)
RETURNS TABLE(
  link_id uuid,
  material_id uuid,
  conversion_coefficient numeric,
  total_needed numeric,
  total_cost numeric,
  material_name text,
  material_unit text,
  material_description text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wml.id as link_id,
    wml.material_boq_item_id as material_id,
    wml.conversion_coefficient,
    bi.quantity * COALESCE(wml.conversion_coefficient, 1) as total_needed,
    bi.total_amount as total_cost,
    COALESCE(ml.name, bi.description) as material_name,
    COALESCE(ml.unit, bi.unit) as material_unit,
    bi.description as material_description
  FROM work_material_links wml
  JOIN boq_items bi ON bi.id = wml.material_boq_item_id
  LEFT JOIN materials_library ml ON ml.id = bi.material_id
  WHERE wml.work_boq_item_id = p_work_boq_item_id
  ORDER BY bi.sub_number, bi.sort_order;
END;
$$;

-- Предоставляем права на функцию
GRANT EXECUTE ON FUNCTION get_materials_for_work_optimized TO anon, authenticated;

-- ============================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON FUNCTION get_cost_categories_batch IS 'Пакетная загрузка категорий затрат для устранения N+1 запросов';
COMMENT ON FUNCTION get_materials_for_work_optimized IS 'Оптимизированная версия получения материалов для работы с JOIN вместо подзапросов';

-- ============================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================
-- После применения всех индексов выполните:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('boq_items', 'work_material_links', 'materials_library', 'works_library', 'client_positions', 'detail_cost_categories');