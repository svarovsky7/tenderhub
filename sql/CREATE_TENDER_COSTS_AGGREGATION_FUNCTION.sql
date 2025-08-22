-- Функция для агрегации затрат тендера по типам
-- Возвращает суммы по каждому типу BOQ элементов

CREATE OR REPLACE FUNCTION get_tender_costs_by_type(tender_id uuid)
RETURNS TABLE (
  item_type boq_item_type,
  total_amount numeric,
  item_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bi.item_type,
    COALESCE(SUM(bi.total_amount), 0) as total_amount,
    COUNT(*) as item_count
  FROM boq_items bi
  WHERE bi.tender_id = $1
  GROUP BY bi.item_type
  ORDER BY bi.item_type;
END;
$$ LANGUAGE plpgsql;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION get_tender_costs_by_type(uuid) IS 'Агрегация затрат тендера по типам элементов BOQ';

-- Пример использования:
-- SELECT * FROM get_tender_costs_by_type('your-tender-id-here');