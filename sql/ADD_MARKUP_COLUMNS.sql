-- Добавляем 3 новых столбца в таблицу tender_markup_percentages
-- Выполняется в Supabase SQL Editor

-- Добавляем столбцы для новых полей процентов затрат
ALTER TABLE public.tender_markup_percentages 
ADD COLUMN IF NOT EXISTS mechanization_service DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS mbp_gsm DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS warranty_period DECIMAL(5,2) DEFAULT 0.00;

-- Добавляем комментарии к столбцам для документации
COMMENT ON COLUMN public.tender_markup_percentages.mechanization_service IS 'Служба механизации раб (бурильщики, автотехника, электрики)';
COMMENT ON COLUMN public.tender_markup_percentages.mbp_gsm IS 'МБП+ГСМ (топливо+масло)';
COMMENT ON COLUMN public.tender_markup_percentages.warranty_period IS 'Гарантийный период 5 лет';

-- Проверяем структуру таблицы после изменений
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tender_markup_percentages' 
AND table_schema = 'public'
ORDER BY ordinal_position;