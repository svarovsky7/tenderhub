-- Добавление столбца "Итого за единицу" в таблицу tender_cost_volumes
-- Выполнить в SQL Editor в Supabase Dashboard

-- Добавляем столбец unit_total для хранения итоговой стоимости за единицу
ALTER TABLE public.tender_cost_volumes 
ADD COLUMN IF NOT EXISTS unit_total numeric(12,2) DEFAULT 0;

-- Добавляем комментарий к новому столбцу
COMMENT ON COLUMN public.tender_cost_volumes.unit_total IS 'Итоговая стоимость за единицу (рублей за единицу измерения)';

-- Создаем индекс для быстрого поиска по unit_total (опционально)
CREATE INDEX IF NOT EXISTS idx_tender_cost_volumes_unit_total 
ON public.tender_cost_volumes(unit_total);

-- Проверяем структуру таблицы после изменений
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'tender_cost_volumes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Пример обновления данных (при необходимости):
-- UPDATE public.tender_cost_volumes 
-- SET unit_total = (
--     SELECT 
--         CASE 
--             WHEN volume > 0 THEN 
--                 (SELECT SUM(total_amount) FROM public.boq_items 
--                  WHERE detail_cost_category_id = tender_cost_volumes.detail_cost_category_id) / volume
--             ELSE 0 
--         END
-- )
-- WHERE unit_total IS NULL OR unit_total = 0;