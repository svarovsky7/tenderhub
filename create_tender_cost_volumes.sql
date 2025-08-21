-- Создание таблицы для хранения объемов затрат по тендерам
-- Выполнить в SQL Editor в Supabase Dashboard

-- Создание таблицы tender_cost_volumes
CREATE TABLE IF NOT EXISTS public.tender_cost_volumes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    detail_cost_category_id uuid NOT NULL REFERENCES public.detail_cost_categories(id) ON DELETE CASCADE,
    volume numeric(12,4) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE(tender_id, detail_cost_category_id)
);

-- Создание индекса для быстрого поиска по tender_id
CREATE INDEX IF NOT EXISTS idx_tender_cost_volumes_tender_id 
ON public.tender_cost_volumes(tender_id);

-- Создание индекса для быстрого поиска по detail_cost_category_id
CREATE INDEX IF NOT EXISTS idx_tender_cost_volumes_category_id 
ON public.tender_cost_volumes(detail_cost_category_id);

-- Добавление комментариев
COMMENT ON TABLE public.tender_cost_volumes IS 'Объемы затрат по категориям для каждого тендера';
COMMENT ON COLUMN public.tender_cost_volumes.volume IS 'Объем затрат для расчета стоимости';
COMMENT ON COLUMN public.tender_cost_volumes.tender_id IS 'ID тендера';
COMMENT ON COLUMN public.tender_cost_volumes.detail_cost_category_id IS 'ID детальной категории затрат';

-- Проверка созданной таблицы
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tender_cost_volumes' 
AND table_schema = 'public'
ORDER BY ordinal_position;