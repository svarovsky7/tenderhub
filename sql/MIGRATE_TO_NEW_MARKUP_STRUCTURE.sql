-- =====================================================
-- МИГРАЦИЯ НА НОВУЮ СТРУКТУРУ НАКРУТОК
-- =====================================================
-- Выполните этот SQL после тестирования новой структуры

-- Шаг 1: Переименование старой таблицы для бэкапа
ALTER TABLE public.tender_markup_percentages RENAME TO tender_markup_percentages_backup;

-- Шаг 2: Переименование новой таблицы в основную
ALTER TABLE public.tender_markup_percentages_new RENAME TO tender_markup_percentages;

-- Шаг 3: Переименование связанных элементов
-- Переименование индексов
DROP INDEX IF EXISTS tender_markup_percentages_tender_id_idx;
ALTER INDEX tender_markup_percentages_new_tender_id_idx RENAME TO tender_markup_percentages_tender_id_idx;

-- Переименование ограничений
ALTER TABLE public.tender_markup_percentages 
DROP CONSTRAINT IF EXISTS tender_markup_percentages_new_tender_id_fkey;

ALTER TABLE public.tender_markup_percentages 
ADD CONSTRAINT tender_markup_percentages_tender_id_fkey 
FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE;

-- Переименование триггера и функции
DROP TRIGGER IF EXISTS trigger_tender_markup_percentages_new_updated_at ON public.tender_markup_percentages;
DROP FUNCTION IF EXISTS handle_updated_at_tender_markup_percentages_new();

-- Создание новой функции с правильным именем
CREATE OR REPLACE FUNCTION handle_updated_at_tender_markup_percentages()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание нового триггера
CREATE TRIGGER trigger_tender_markup_percentages_updated_at
    BEFORE UPDATE ON public.tender_markup_percentages
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at_tender_markup_percentages();

-- Шаг 4: Комментарии к новой структуре
COMMENT ON TABLE public.tender_markup_percentages IS 'New markup percentages structure for tender financial calculations with 11 specific markup types';
COMMENT ON COLUMN public.tender_markup_percentages.works_16_markup IS 'Works coefficient 1.6';
COMMENT ON COLUMN public.tender_markup_percentages.works_cost_growth IS 'Works cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.materials_cost_growth IS 'Materials cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.subcontract_works_cost_growth IS 'Subcontract works cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.subcontract_materials_cost_growth IS 'Subcontract materials cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.contingency_costs IS 'Contingency costs percentage';
COMMENT ON COLUMN public.tender_markup_percentages.overhead_own_forces IS 'Overhead costs for own forces percentage';
COMMENT ON COLUMN public.tender_markup_percentages.overhead_subcontract IS 'Overhead costs for subcontract percentage';
COMMENT ON COLUMN public.tender_markup_percentages.general_costs_without_subcontract IS 'General costs without subcontract percentage';
COMMENT ON COLUMN public.tender_markup_percentages.profit_own_forces IS 'Profit for own forces percentage';
COMMENT ON COLUMN public.tender_markup_percentages.profit_subcontract IS 'Profit for subcontract percentage';

-- Проверка миграции
SELECT 'Миграция на новую структуру накруток завершена!' as status;
SELECT COUNT(*) as total_records FROM public.tender_markup_percentages;
SELECT COUNT(*) as backup_records FROM public.tender_markup_percentages_backup;

-- Проверка структуры новой таблицы
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tender_markup_percentages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;