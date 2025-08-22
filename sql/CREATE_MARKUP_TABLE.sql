-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ ПРОЦЕНТОВ НАКРУТОК ТЕНДЕРА
-- =====================================================
-- Выполните этот SQL в Supabase Dashboard > SQL Editor

-- 1. Создание основной таблицы
CREATE TABLE IF NOT EXISTS public.tender_markup_percentages (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    
    -- Основные проценты накрутки
    profit_margin numeric(5,2) DEFAULT 15.00,              -- Общая рентабельность (%)
    materials_markup numeric(5,2) DEFAULT 10.00,           -- Накрутка на материалы (%)
    works_markup numeric(5,2) DEFAULT 20.00,              -- Накрутка на работы (%)
    submaterials_markup numeric(5,2) DEFAULT 15.00,       -- Накрутка на субматериалы (%)
    subworks_markup numeric(5,2) DEFAULT 18.00,           -- Накрутка на субработы (%)
    
    -- Дополнительные расходы
    overhead_percentage numeric(5,2) DEFAULT 5.00,         -- Накладные расходы (%)
    contingency_percentage numeric(5,2) DEFAULT 3.00,      -- Непредвиденные расходы (%)
    risk_adjustment numeric(5,2) DEFAULT 2.00,            -- Поправка на риски (%)
    
    -- Налоги и сборы
    tax_percentage numeric(5,2) DEFAULT 20.00,            -- НДС или другие налоги (%)
    insurance_percentage numeric(5,2) DEFAULT 1.50,       -- Страхование (%)
    
    -- Дополнительная информация
    notes text,                                            -- Примечания
    is_active boolean DEFAULT true,                        -- Активность записи
    
    -- Метки времени
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Ограничения
    CONSTRAINT tender_markup_percentages_pkey PRIMARY KEY (id)
);

-- 2. Добавление внешнего ключа (если не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tender_markup_percentages_tender_id_fkey'
    ) THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT tender_markup_percentages_tender_id_fkey 
        FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Добавление проверок диапазонов (если не существуют)
DO $$ 
BEGIN
    -- Проверка profit_margin_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profit_margin_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT profit_margin_range 
        CHECK (profit_margin >= 0 AND profit_margin <= 100);
    END IF;
    
    -- Проверка materials_markup_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_markup_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT materials_markup_range 
        CHECK (materials_markup >= 0 AND materials_markup <= 100);
    END IF;
    
    -- Проверка works_markup_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'works_markup_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT works_markup_range 
        CHECK (works_markup >= 0 AND works_markup <= 100);
    END IF;
    
    -- Проверка submaterials_markup_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submaterials_markup_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT submaterials_markup_range 
        CHECK (submaterials_markup >= 0 AND submaterials_markup <= 100);
    END IF;
    
    -- Проверка subworks_markup_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subworks_markup_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT subworks_markup_range 
        CHECK (subworks_markup >= 0 AND subworks_markup <= 100);
    END IF;
    
    -- Проверка overhead_percentage_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'overhead_percentage_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT overhead_percentage_range 
        CHECK (overhead_percentage >= 0 AND overhead_percentage <= 50);
    END IF;
    
    -- Проверка contingency_percentage_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contingency_percentage_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT contingency_percentage_range 
        CHECK (contingency_percentage >= 0 AND contingency_percentage <= 20);
    END IF;
    
    -- Проверка risk_adjustment_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'risk_adjustment_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT risk_adjustment_range 
        CHECK (risk_adjustment >= 0 AND risk_adjustment <= 20);
    END IF;
    
    -- Проверка tax_percentage_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_percentage_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT tax_percentage_range 
        CHECK (tax_percentage >= 0 AND tax_percentage <= 50);
    END IF;
    
    -- Проверка insurance_percentage_range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insurance_percentage_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT insurance_percentage_range 
        CHECK (insurance_percentage >= 0 AND insurance_percentage <= 10);
    END IF;
END $$;

-- 4. Создание индексов
CREATE INDEX IF NOT EXISTS tender_markup_percentages_tender_id_idx 
ON public.tender_markup_percentages(tender_id);

CREATE INDEX IF NOT EXISTS tender_markup_percentages_active_idx 
ON public.tender_markup_percentages(tender_id, is_active) 
WHERE is_active = true;

-- 5. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_tender_markup_percentages()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_tender_markup_percentages_updated_at ON public.tender_markup_percentages;
CREATE TRIGGER trigger_tender_markup_percentages_updated_at
    BEFORE UPDATE ON public.tender_markup_percentages
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at_tender_markup_percentages();

-- 7. Комментарии к таблице и столбцам
COMMENT ON TABLE public.tender_markup_percentages IS 'Markup percentages configuration for tender financial calculations';
COMMENT ON COLUMN public.tender_markup_percentages.tender_id IS 'Reference to the tender';
COMMENT ON COLUMN public.tender_markup_percentages.profit_margin IS 'Overall profit margin percentage';
COMMENT ON COLUMN public.tender_markup_percentages.materials_markup IS 'Markup percentage for materials';
COMMENT ON COLUMN public.tender_markup_percentages.works_markup IS 'Markup percentage for works';
COMMENT ON COLUMN public.tender_markup_percentages.submaterials_markup IS 'Markup percentage for submaterials';
COMMENT ON COLUMN public.tender_markup_percentages.subworks_markup IS 'Markup percentage for subworks';
COMMENT ON COLUMN public.tender_markup_percentages.overhead_percentage IS 'Overhead costs percentage';
COMMENT ON COLUMN public.tender_markup_percentages.contingency_percentage IS 'Contingency costs percentage';
COMMENT ON COLUMN public.tender_markup_percentages.risk_adjustment IS 'Risk adjustment percentage';
COMMENT ON COLUMN public.tender_markup_percentages.tax_percentage IS 'Tax percentage (VAT, etc.)';
COMMENT ON COLUMN public.tender_markup_percentages.insurance_percentage IS 'Insurance percentage';
COMMENT ON COLUMN public.tender_markup_percentages.notes IS 'Additional notes or comments';
COMMENT ON COLUMN public.tender_markup_percentages.is_active IS 'Whether this markup configuration is active for the tender';

-- 8. Создание записей по умолчанию для существующих тендеров
INSERT INTO public.tender_markup_percentages (tender_id, notes)
SELECT id, 'Конфигурация по умолчанию'
FROM public.tenders
WHERE NOT EXISTS (
    SELECT 1 FROM public.tender_markup_percentages tmp 
    WHERE tmp.tender_id = tenders.id
);

-- Проверка успешного создания
SELECT 'Таблица tender_markup_percentages успешно создана!' as status;
SELECT COUNT(*) as total_records FROM public.tender_markup_percentages;