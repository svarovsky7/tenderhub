-- Обеспечение существования таблицы tender_cost_volumes для автосохранения
-- Выполнить в SQL Editor в Supabase Dashboard

-- Создание таблицы tender_cost_volumes если её нет
CREATE TABLE IF NOT EXISTS public.tender_cost_volumes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    detail_cost_category_id uuid NOT NULL REFERENCES public.detail_cost_categories(id) ON DELETE CASCADE,
    volume numeric(12,4) NOT NULL DEFAULT 0,
    unit_total numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE(tender_id, detail_cost_category_id)
);

-- Добавление столбца unit_total если его нет (для совместимости)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='tender_cost_volumes' AND column_name='unit_total') THEN
        ALTER TABLE public.tender_cost_volumes ADD COLUMN unit_total numeric(12,2) DEFAULT 0;
    END IF;
END $$;

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_tender_cost_volumes_tender_id 
ON public.tender_cost_volumes(tender_id);

CREATE INDEX IF NOT EXISTS idx_tender_cost_volumes_category_id 
ON public.tender_cost_volumes(detail_cost_category_id);

CREATE INDEX IF NOT EXISTS idx_tender_cost_volumes_unit_total 
ON public.tender_cost_volumes(unit_total);

-- Добавление функции автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для автообновления updated_at
DROP TRIGGER IF EXISTS update_tender_cost_volumes_updated_at ON public.tender_cost_volumes;
CREATE TRIGGER update_tender_cost_volumes_updated_at
    BEFORE UPDATE ON public.tender_cost_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Добавление комментариев для документации
COMMENT ON TABLE public.tender_cost_volumes IS 'Автосохранение объемов затрат по категориям для каждого тендера';
COMMENT ON COLUMN public.tender_cost_volumes.volume IS 'Объем затрат для расчета стоимости (автосохранение)';
COMMENT ON COLUMN public.tender_cost_volumes.unit_total IS 'Автоматически рассчитанная стоимость за единицу';
COMMENT ON COLUMN public.tender_cost_volumes.tender_id IS 'ID тендера';
COMMENT ON COLUMN public.tender_cost_volumes.detail_cost_category_id IS 'ID детальной категории затрат';

-- Настройка RLS (если понадобится в будущем)
-- ALTER TABLE public.tender_cost_volumes ENABLE ROW LEVEL SECURITY;

-- Проверка созданной структуры
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

-- Проверка индексов
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tender_cost_volumes' 
AND schemaname = 'public';

-- Проверка триггеров
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'tender_cost_volumes';