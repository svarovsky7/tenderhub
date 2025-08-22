-- =====================================================
-- ПРОСТОЕ СОЗДАНИЕ ТАБЛИЦЫ ПРОЦЕНТОВ НАКРУТОК ТЕНДЕРА
-- =====================================================
-- Упрощенная версия для Supabase Dashboard > SQL Editor

-- Создание основной таблицы
CREATE TABLE public.tender_markup_percentages (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    
    -- Основные проценты накрутки
    profit_margin numeric(5,2) DEFAULT 15.00,
    materials_markup numeric(5,2) DEFAULT 10.00,
    works_markup numeric(5,2) DEFAULT 20.00,
    submaterials_markup numeric(5,2) DEFAULT 15.00,
    subworks_markup numeric(5,2) DEFAULT 18.00,
    
    -- Дополнительные расходы
    overhead_percentage numeric(5,2) DEFAULT 5.00,
    contingency_percentage numeric(5,2) DEFAULT 3.00,
    risk_adjustment numeric(5,2) DEFAULT 2.00,
    
    -- Налоги и сборы
    tax_percentage numeric(5,2) DEFAULT 20.00,
    insurance_percentage numeric(5,2) DEFAULT 1.50,
    
    -- Дополнительная информация
    notes text,
    is_active boolean DEFAULT true,
    
    -- Метки времени
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Первичный ключ
    PRIMARY KEY (id)
);

-- Внешний ключ к таблице tenders
ALTER TABLE public.tender_markup_percentages 
ADD CONSTRAINT tender_markup_percentages_tender_id_fkey 
FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE;

-- Индекс для быстрого поиска по тендеру
CREATE INDEX tender_markup_percentages_tender_id_idx 
ON public.tender_markup_percentages(tender_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION handle_updated_at_tender_markup_percentages()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_tender_markup_percentages_updated_at
    BEFORE UPDATE ON public.tender_markup_percentages
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at_tender_markup_percentages();

-- Создание записей по умолчанию для существующих тендеров
INSERT INTO public.tender_markup_percentages (tender_id, notes)
SELECT id, 'Конфигурация по умолчанию'
FROM public.tenders
WHERE NOT EXISTS (
    SELECT 1 FROM public.tender_markup_percentages tmp 
    WHERE tmp.tender_id = tenders.id
);

-- Проверка
SELECT 'Таблица tender_markup_percentages успешно создана!' as status;
SELECT COUNT(*) as total_records FROM public.tender_markup_percentages;