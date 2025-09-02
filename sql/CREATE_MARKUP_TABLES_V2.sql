-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦ ПРОЦЕНТОВ НАКРУТОК ТЕНДЕРА V2
-- =====================================================
-- Выполните этот SQL в Supabase Dashboard > SQL Editor

-- 1. Создание таблицы шаблонов накруток
CREATE TABLE IF NOT EXISTS public.markup_templates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Метаданные шаблона
    name text NOT NULL,                                        -- Название шаблона
    description text,                                           -- Описание шаблона
    is_default boolean DEFAULT false,                          -- Шаблон по умолчанию
    
    -- Новые типы накруток согласно требованиям
    works_16_markup numeric(6,2) DEFAULT 160.00,              -- Работы 1,6
    mechanization_service numeric(5,2) DEFAULT 0.00,          -- Служба механизации раб
    mbp_gsm numeric(5,2) DEFAULT 0.00,                        -- МБП+ГСМ (топливо+масло)
    warranty_period numeric(5,2) DEFAULT 0.00,                -- Гарантийный период 5 лет
    works_cost_growth numeric(5,2) DEFAULT 5.00,              -- Рост Стоимости Работ
    materials_cost_growth numeric(5,2) DEFAULT 3.00,          -- Рост стоимости Материалов
    subcontract_works_cost_growth numeric(5,2) DEFAULT 7.00,  -- Рост стоимости Работ субподряда
    subcontract_materials_cost_growth numeric(5,2) DEFAULT 4.00, -- Рост стоимости Материалов Субподряда
    contingency_costs numeric(5,2) DEFAULT 2.00,              -- Непредвиденные затраты
    overhead_own_forces numeric(5,2) DEFAULT 8.00,            -- ООЗ собств. силы
    overhead_subcontract numeric(5,2) DEFAULT 6.00,           -- ООЗ Субподряд
    general_costs_without_subcontract numeric(5,2) DEFAULT 5.00, -- ОФЗ (Без субподряда)
    profit_own_forces numeric(5,2) DEFAULT 12.00,             -- Прибыль собств. силы
    profit_subcontract numeric(5,2) DEFAULT 8.00,             -- Прибыль Субподряд
    
    -- Метки времени
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Ограничения
    CONSTRAINT markup_templates_pkey PRIMARY KEY (id),
    CONSTRAINT markup_templates_name_unique UNIQUE (name)
);

-- 2. Создание основной таблицы процентов накруток тендера
CREATE TABLE IF NOT EXISTS public.tender_markup_percentages (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    
    -- Новые типы накруток согласно требованиям
    works_16_markup numeric(6,2) DEFAULT 160.00,              -- Работы 1,6
    mechanization_service numeric(5,2) DEFAULT 0.00,          -- Служба механизации раб
    mbp_gsm numeric(5,2) DEFAULT 0.00,                        -- МБП+ГСМ (топливо+масло)
    warranty_period numeric(5,2) DEFAULT 0.00,                -- Гарантийный период 5 лет
    works_cost_growth numeric(5,2) DEFAULT 5.00,              -- Рост Стоимости Работ
    materials_cost_growth numeric(5,2) DEFAULT 3.00,          -- Рост стоимости Материалов
    subcontract_works_cost_growth numeric(5,2) DEFAULT 7.00,  -- Рост стоимости Работ субподряда
    subcontract_materials_cost_growth numeric(5,2) DEFAULT 4.00, -- Рост стоимости Материалов Субподряда
    contingency_costs numeric(5,2) DEFAULT 2.00,              -- Непредвиденные затраты
    overhead_own_forces numeric(5,2) DEFAULT 8.00,            -- ООЗ собств. силы
    overhead_subcontract numeric(5,2) DEFAULT 6.00,           -- ООЗ Субподряд
    general_costs_without_subcontract numeric(5,2) DEFAULT 5.00, -- ОФЗ (Без субподряда)
    profit_own_forces numeric(5,2) DEFAULT 12.00,             -- Прибыль собств. силы
    profit_subcontract numeric(5,2) DEFAULT 8.00,             -- Прибыль Субподряд
    
    -- Дополнительная информация
    notes text,                                                -- Примечания
    is_active boolean DEFAULT true,                            -- Активность записи
    template_id uuid,                                          -- Ссылка на шаблон (опционально)
    
    -- Метки времени
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Ограничения
    CONSTRAINT tender_markup_percentages_pkey PRIMARY KEY (id)
);

-- 3. Добавление внешних ключей
DO $$ 
BEGIN
    -- Внешний ключ на тендер
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tender_markup_percentages_tender_id_fkey'
    ) THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT tender_markup_percentages_tender_id_fkey 
        FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE;
    END IF;
    
    -- Внешний ключ на шаблон
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tender_markup_percentages_template_id_fkey'
    ) THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT tender_markup_percentages_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES public.markup_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Добавление проверок диапазонов
DO $$ 
BEGIN
    -- Проверка works_16_markup_range (может быть больше 100%)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'works_16_markup_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT works_16_markup_range 
        CHECK (works_16_markup >= 0 AND works_16_markup <= 1000);
    END IF;
    
    -- Остальные проверки для основных полей
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mechanization_service_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT mechanization_service_range 
        CHECK (mechanization_service >= 0 AND mechanization_service <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mbp_gsm_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT mbp_gsm_range 
        CHECK (mbp_gsm >= 0 AND mbp_gsm <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warranty_period_range') THEN
        ALTER TABLE public.tender_markup_percentages 
        ADD CONSTRAINT warranty_period_range 
        CHECK (warranty_period >= 0 AND warranty_period <= 100);
    END IF;
    
    -- Аналогичные проверки для таблицы шаблонов
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_works_16_markup_range') THEN
        ALTER TABLE public.markup_templates 
        ADD CONSTRAINT template_works_16_markup_range 
        CHECK (works_16_markup >= 0 AND works_16_markup <= 1000);
    END IF;
END $$;

-- 5. Создание индексов
CREATE INDEX IF NOT EXISTS tender_markup_percentages_tender_id_idx 
ON public.tender_markup_percentages(tender_id);

CREATE INDEX IF NOT EXISTS tender_markup_percentages_active_idx 
ON public.tender_markup_percentages(tender_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS tender_markup_percentages_template_id_idx 
ON public.tender_markup_percentages(template_id);

CREATE INDEX IF NOT EXISTS markup_templates_is_default_idx 
ON public.markup_templates(is_default) 
WHERE is_default = true;

-- 6. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_tender_markup_percentages_updated_at ON public.tender_markup_percentages;
CREATE TRIGGER trigger_tender_markup_percentages_updated_at
    BEFORE UPDATE ON public.tender_markup_percentages
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_markup_templates_updated_at ON public.markup_templates;
CREATE TRIGGER trigger_markup_templates_updated_at
    BEFORE UPDATE ON public.markup_templates
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 8. Триггер для обеспечения единственной активной конфигурации на тендер
CREATE OR REPLACE FUNCTION public.ensure_single_active_markup()
RETURNS trigger AS $$
BEGIN
    IF NEW.is_active = true THEN
        -- Деактивируем все другие записи для этого тендера
        UPDATE public.tender_markup_percentages 
        SET is_active = false 
        WHERE tender_id = NEW.tender_id 
        AND id != NEW.id
        AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_ensure_single_active_markup ON public.tender_markup_percentages;
CREATE TRIGGER trigger_ensure_single_active_markup
    BEFORE INSERT OR UPDATE ON public.tender_markup_percentages
    FOR EACH ROW
    EXECUTE PROCEDURE public.ensure_single_active_markup();

-- 9. Триггер для обеспечения единственного шаблона по умолчанию
CREATE OR REPLACE FUNCTION public.ensure_single_default_template()
RETURNS trigger AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Снимаем флаг "по умолчанию" с других шаблонов
        UPDATE public.markup_templates 
        SET is_default = false 
        WHERE id != NEW.id
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_ensure_single_default_template ON public.markup_templates;
CREATE TRIGGER trigger_ensure_single_default_template
    BEFORE INSERT OR UPDATE ON public.markup_templates
    FOR EACH ROW
    EXECUTE PROCEDURE public.ensure_single_default_template();

-- 10. Комментарии к таблицам и столбцам
COMMENT ON TABLE public.tender_markup_percentages IS 'Конфигурация процентов накруток для расчета финансовых показателей тендера';
COMMENT ON COLUMN public.tender_markup_percentages.tender_id IS 'Ссылка на тендер';
COMMENT ON COLUMN public.tender_markup_percentages.works_16_markup IS 'Работы 1,6 - процент затрат на работы с коэффициентом 1,6';
COMMENT ON COLUMN public.tender_markup_percentages.mechanization_service IS 'Служба механизации раб (бурильщики, автотехника, электрики)';
COMMENT ON COLUMN public.tender_markup_percentages.mbp_gsm IS 'МБП+ГСМ (топливо+масло) - малоценные быстроизнашивающиеся предметы и горюче-смазочные материалы';
COMMENT ON COLUMN public.tender_markup_percentages.warranty_period IS 'Гарантийный период 5 лет - затраты на гарантийное обслуживание';
COMMENT ON COLUMN public.tender_markup_percentages.works_cost_growth IS 'Рост стоимости работ';
COMMENT ON COLUMN public.tender_markup_percentages.materials_cost_growth IS 'Рост стоимости материалов';
COMMENT ON COLUMN public.tender_markup_percentages.subcontract_works_cost_growth IS 'Рост стоимости работ субподряда';
COMMENT ON COLUMN public.tender_markup_percentages.subcontract_materials_cost_growth IS 'Рост стоимости материалов субподряда';
COMMENT ON COLUMN public.tender_markup_percentages.contingency_costs IS 'Непредвиденные затраты';
COMMENT ON COLUMN public.tender_markup_percentages.overhead_own_forces IS 'ООЗ собственными силами - общехозяйственные затраты';
COMMENT ON COLUMN public.tender_markup_percentages.overhead_subcontract IS 'ООЗ Субподряд - общехозяйственные затраты субподряда';
COMMENT ON COLUMN public.tender_markup_percentages.general_costs_without_subcontract IS 'ОФЗ (Без субподряда) - общефирменные затраты';
COMMENT ON COLUMN public.tender_markup_percentages.profit_own_forces IS 'Прибыль собственными силами';
COMMENT ON COLUMN public.tender_markup_percentages.profit_subcontract IS 'Прибыль от субподряда';
COMMENT ON COLUMN public.tender_markup_percentages.notes IS 'Дополнительные примечания';
COMMENT ON COLUMN public.tender_markup_percentages.is_active IS 'Активность данной конфигурации накруток для тендера';
COMMENT ON COLUMN public.tender_markup_percentages.template_id IS 'Ссылка на использованный шаблон (опционально)';

COMMENT ON TABLE public.markup_templates IS 'Шаблоны процентов накруток для быстрого применения к тендерам';
COMMENT ON COLUMN public.markup_templates.name IS 'Название шаблона';
COMMENT ON COLUMN public.markup_templates.description IS 'Описание шаблона и его назначения';
COMMENT ON COLUMN public.markup_templates.is_default IS 'Флаг шаблона по умолчанию';

-- 11. Создание стандартных шаблонов
INSERT INTO public.markup_templates (name, description, is_default) VALUES
('Стандартный', 'Стандартные проценты накруток для большинства проектов', true),
('Минимальный', 'Минимальные накрутки для конкурентных тендеров', false),
('Премиальный', 'Повышенные накрутки для сложных проектов', false)
ON CONFLICT (name) DO NOTHING;

-- Обновление значений для шаблона "Минимальный"
UPDATE public.markup_templates 
SET works_16_markup = 140.00,
    works_cost_growth = 3.00,
    materials_cost_growth = 2.00,
    subcontract_works_cost_growth = 5.00,
    subcontract_materials_cost_growth = 3.00,
    contingency_costs = 1.00,
    overhead_own_forces = 5.00,
    overhead_subcontract = 4.00,
    general_costs_without_subcontract = 3.00,
    profit_own_forces = 8.00,
    profit_subcontract = 5.00
WHERE name = 'Минимальный';

-- Обновление значений для шаблона "Премиальный"
UPDATE public.markup_templates 
SET works_16_markup = 180.00,
    mechanization_service = 5.00,
    mbp_gsm = 3.00,
    warranty_period = 2.00,
    works_cost_growth = 8.00,
    materials_cost_growth = 5.00,
    subcontract_works_cost_growth = 10.00,
    subcontract_materials_cost_growth = 6.00,
    contingency_costs = 5.00,
    overhead_own_forces = 12.00,
    overhead_subcontract = 10.00,
    general_costs_without_subcontract = 8.00,
    profit_own_forces = 18.00,
    profit_subcontract = 12.00
WHERE name = 'Премиальный';

-- 12. Создание записей по умолчанию для существующих тендеров
INSERT INTO public.tender_markup_percentages (tender_id, notes)
SELECT id, 'Конфигурация по умолчанию'
FROM public.tenders
WHERE NOT EXISTS (
    SELECT 1 FROM public.tender_markup_percentages tmp 
    WHERE tmp.tender_id = tenders.id
);

-- 13. Функция для применения шаблона к тендеру
CREATE OR REPLACE FUNCTION public.apply_markup_template(
    p_tender_id uuid,
    p_template_id uuid
) RETURNS uuid AS $$
DECLARE
    v_new_markup_id uuid;
BEGIN
    -- Деактивируем текущие активные накрутки
    UPDATE public.tender_markup_percentages 
    SET is_active = false 
    WHERE tender_id = p_tender_id AND is_active = true;
    
    -- Создаем новую конфигурацию из шаблона
    INSERT INTO public.tender_markup_percentages (
        tender_id,
        works_16_markup,
        mechanization_service,
        mbp_gsm,
        warranty_period,
        works_cost_growth,
        materials_cost_growth,
        subcontract_works_cost_growth,
        subcontract_materials_cost_growth,
        contingency_costs,
        overhead_own_forces,
        overhead_subcontract,
        general_costs_without_subcontract,
        profit_own_forces,
        profit_subcontract,
        template_id,
        notes,
        is_active
    )
    SELECT 
        p_tender_id,
        works_16_markup,
        mechanization_service,
        mbp_gsm,
        warranty_period,
        works_cost_growth,
        materials_cost_growth,
        subcontract_works_cost_growth,
        subcontract_materials_cost_growth,
        contingency_costs,
        overhead_own_forces,
        overhead_subcontract,
        general_costs_without_subcontract,
        profit_own_forces,
        profit_subcontract,
        p_template_id,
        'Применен шаблон: ' || name,
        true
    FROM public.markup_templates
    WHERE id = p_template_id
    RETURNING id INTO v_new_markup_id;
    
    RETURN v_new_markup_id;
END;
$$ LANGUAGE plpgsql;

-- Проверка успешного создания
SELECT 'Таблицы tender_markup_percentages и markup_templates успешно созданы!' as status;
SELECT 'Тендеры с накрутками:', COUNT(*) as tender_count FROM public.tender_markup_percentages;
SELECT 'Шаблоны:', COUNT(*) as template_count FROM public.markup_templates;