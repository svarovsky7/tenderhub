-- Add version and area fields to tenders table
ALTER TABLE public.tenders 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS area_sp DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS area_client DECIMAL(10,2);

-- Add comments for documentation
COMMENT ON COLUMN public.tenders.version IS 'Версия тендера (целое число для отслеживания изменений ВОР)';
COMMENT ON COLUMN public.tenders.area_sp IS 'Площадь по СП (м²)';
COMMENT ON COLUMN public.tenders.area_client IS 'Площадь от Заказчика (м²)';

-- Update existing records to have version 1 if NULL
UPDATE public.tenders 
SET version = 1 
WHERE version IS NULL;