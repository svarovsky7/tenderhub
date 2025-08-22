-- =====================================================
-- НОВАЯ СТРУКТУРА ТАБЛИЦЫ ПРОЦЕНТОВ НАКРУТОК ТЕНДЕРА
-- =====================================================
-- Обновленная структура согласно новым требованиям

-- Удаление старой таблицы (если нужно полностью пересоздать)
-- DROP TABLE IF EXISTS public.tender_markup_percentages CASCADE;

-- Создание новой таблицы с обновленными типами накруток
CREATE TABLE IF NOT EXISTS public.tender_markup_percentages_new (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    
    -- Новые типы накруток согласно требованиям
    works_16_markup numeric(5,2) DEFAULT 1.6,                      -- Работы 1,6
    works_cost_growth numeric(5,2) DEFAULT 5.00,                   -- Рост Стоимости Работ
    materials_cost_growth numeric(5,2) DEFAULT 3.00,               -- Рост стоимости Материалов
    subcontract_works_cost_growth numeric(5,2) DEFAULT 7.00,       -- Рост стоимости Работ субподряда
    subcontract_materials_cost_growth numeric(5,2) DEFAULT 4.00,   -- Рост стоимости Материалов Субподряда
    contingency_costs numeric(5,2) DEFAULT 2.00,                   -- Непредвиденные затраты
    overhead_own_forces numeric(5,2) DEFAULT 8.00,                 -- ООЗ собств. силы
    overhead_subcontract numeric(5,2) DEFAULT 6.00,                -- ООЗ Субподряд
    general_costs_without_subcontract numeric(5,2) DEFAULT 5.00,   -- ОФЗ (Без субподряда)
    profit_own_forces numeric(5,2) DEFAULT 12.00,                  -- Прибыль собств. силы
    profit_subcontract numeric(5,2) DEFAULT 8.00,                  -- Прибыль Субподряд
    
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
ALTER TABLE public.tender_markup_percentages_new 
ADD CONSTRAINT tender_markup_percentages_new_tender_id_fkey 
FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE;

-- Индекс для быстрого поиска по тендеру
CREATE INDEX tender_markup_percentages_new_tender_id_idx 
ON public.tender_markup_percentages_new(tender_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION handle_updated_at_tender_markup_percentages_new()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_tender_markup_percentages_new_updated_at
    BEFORE UPDATE ON public.tender_markup_percentages_new
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at_tender_markup_percentages_new();

-- Миграция данных из старой таблицы в новую (если старая таблица существует)
INSERT INTO public.tender_markup_percentages_new (
    tender_id, 
    notes, 
    is_active,
    created_at
)
SELECT 
    tender_id,
    COALESCE(notes, 'Мигрировано из старой структуры') as notes,
    is_active,
    created_at
FROM public.tender_markup_percentages
WHERE NOT EXISTS (
    SELECT 1 FROM public.tender_markup_percentages_new tmp 
    WHERE tmp.tender_id = tender_markup_percentages.tender_id
);

-- Создание записей по умолчанию для тендеров без накруток
INSERT INTO public.tender_markup_percentages_new (tender_id, notes)
SELECT id, 'Конфигурация по умолчанию (новая структура)'
FROM public.tenders
WHERE NOT EXISTS (
    SELECT 1 FROM public.tender_markup_percentages_new tmp 
    WHERE tmp.tender_id = tenders.id
);

-- Переименование таблиц для перехода на новую структуру
-- (Выполнить только после тестирования)
/*
ALTER TABLE public.tender_markup_percentages RENAME TO tender_markup_percentages_old;
ALTER TABLE public.tender_markup_percentages_new RENAME TO tender_markup_percentages;
*/

-- Проверка
SELECT 'Новая таблица tender_markup_percentages_new успешно создана!' as status;
SELECT COUNT(*) as total_records FROM public.tender_markup_percentages_new;