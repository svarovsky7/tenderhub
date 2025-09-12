-- Performance optimization indexes for TenderHub
-- Created: 2025-01-09
-- Purpose: Fix critical performance issues with BOQ queries

-- 1. Critical indexes for BOQ items filtering and searching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_cost_node_id 
ON boq_items(cost_node_id) WHERE cost_node_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_tender_position_type 
ON boq_items(tender_id, client_position_id, item_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_description_gin 
ON boq_items USING gin(to_tsvector('russian'::regconfig, description));

-- 2. Indexes for work-material links performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_material_links_position_work 
ON work_material_links(client_position_id, work_boq_item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_material_links_material 
ON work_material_links(material_boq_item_id);

-- 3. Full-text search indexes for libraries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_library_search_gin 
ON materials_library USING gin(to_tsvector('russian'::regconfig, 
  coalesce(name,'') || ' ' || coalesce(description,'')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_works_library_search_gin 
ON works_library USING gin(to_tsvector('russian'::regconfig, 
  coalesce(name,'') || ' ' || coalesce(description,'')));

-- 4. Batch function for cost_node_display to eliminate N+1 queries
CREATE OR REPLACE FUNCTION get_cost_node_display_batch(p_cost_node_ids uuid[])
RETURNS TABLE(cost_node_id uuid, display_name text)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    cn.id as cost_node_id,
    get_cost_node_display(cn.id) as display_name
  FROM unnest(p_cost_node_ids) as cn(id)
  WHERE cn.id IS NOT NULL;
END;
$$;

-- 5. Materialized view for frequently accessed cost node displays
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_boq_items_with_cost_display AS
SELECT 
  b.*,
  CASE 
    WHEN b.cost_node_id IS NOT NULL THEN 
      get_cost_node_display(b.cost_node_id)
    ELSE NULL
  END as cost_node_display
FROM boq_items b;

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_boq_cost_display_id 
ON mv_boq_items_with_cost_display(id);

CREATE INDEX IF NOT EXISTS idx_mv_boq_cost_display_tender 
ON mv_boq_items_with_cost_display(tender_id);

CREATE INDEX IF NOT EXISTS idx_mv_boq_cost_display_position 
ON mv_boq_items_with_cost_display(client_position_id);

-- 6. Function to refresh materialized view (call after BOQ updates)
CREATE OR REPLACE FUNCTION refresh_boq_cost_display_mv()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_boq_items_with_cost_display;
END;
$$;

-- 7. Optimized function for getting materials for work
CREATE OR REPLACE FUNCTION get_materials_for_work_optimized(p_work_boq_item_id uuid)
RETURNS TABLE(
  link_id uuid,
  material_id uuid,
  conversion_coefficient numeric,
  total_needed numeric,
  total_cost numeric,
  material_name text,
  material_unit text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wml.id as link_id,
    wml.material_boq_item_id as material_id,
    wml.conversion_coefficient,
    bi.quantity * wml.conversion_coefficient as total_needed,
    bi.total_amount as total_cost,
    ml.name as material_name,
    ml.unit as material_unit
  FROM work_material_links wml
  JOIN boq_items bi ON bi.id = wml.material_boq_item_id
  LEFT JOIN materials_library ml ON ml.id = bi.material_id
  WHERE wml.work_boq_item_id = p_work_boq_item_id;
END;
$$;

-- 8. Add indexes for tender and client positions tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenders_updated_at 
ON tenders(updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_positions_tender_parent 
ON client_positions(tender_id, parent_id);

-- 9. Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_tender_type_amount 
ON boq_items(tender_id, item_type, total_amount);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boq_items_position_type_sort 
ON boq_items(client_position_id, item_type, sub_number, sort_order);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_cost_node_display_batch TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_boq_cost_display_mv TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_materials_for_work_optimized TO anon, authenticated;
GRANT SELECT ON mv_boq_items_with_cost_display TO anon, authenticated;

-- Comments for documentation
COMMENT ON FUNCTION get_cost_node_display_batch IS 'Batch load cost node display names to eliminate N+1 queries';
COMMENT ON MATERIALIZED VIEW mv_boq_items_with_cost_display IS 'Cached BOQ items with pre-calculated cost node display names';
COMMENT ON FUNCTION refresh_boq_cost_display_mv IS 'Refresh the materialized view after BOQ updates';
COMMENT ON FUNCTION get_materials_for_work_optimized IS 'Optimized version of get_materials_for_work with better joins';