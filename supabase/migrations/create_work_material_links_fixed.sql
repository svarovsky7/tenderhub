-- Создание таблицы для связывания работ и материалов в позициях ВОРа
CREATE TABLE IF NOT EXISTS public.work_material_links (
    id UUID DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    
    -- Связь с позицией заказчика
    client_position_id UUID NOT NULL,
    
    -- Связь с работой (BOQ item типа 'work')
    work_boq_item_id UUID NOT NULL,
    
    -- Связь с материалом (BOQ item типа 'material')
    material_boq_item_id UUID NOT NULL,
    
    -- Количество материала на единицу работы
    material_quantity_per_work DECIMAL(12,4) DEFAULT 1.0000,
    
    -- Коэффициент использования материала
    usage_coefficient DECIMAL(12,4) DEFAULT 1.0000,
    
    -- Примечание к связи
    notes TEXT,
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ограничения внешних ключей
    CONSTRAINT fk_work_material_links_position 
        FOREIGN KEY (client_position_id) 
        REFERENCES public.client_positions(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_work_material_links_work 
        FOREIGN KEY (work_boq_item_id) 
        REFERENCES public.boq_items(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_work_material_links_material 
        FOREIGN KEY (material_boq_item_id) 
        REFERENCES public.boq_items(id) 
        ON DELETE CASCADE,
    
    -- Уникальное ограничение: одна работа не может быть связана с одним материалом дважды
    CONSTRAINT uq_work_material_link 
        UNIQUE (work_boq_item_id, material_boq_item_id),
    
    -- Проверочные ограничения
    CONSTRAINT chk_material_quantity_positive 
        CHECK (material_quantity_per_work > 0),
    
    CONSTRAINT chk_usage_coefficient_positive 
        CHECK (usage_coefficient > 0)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_work_material_links_position 
    ON public.work_material_links(client_position_id);

CREATE INDEX idx_work_material_links_work 
    ON public.work_material_links(work_boq_item_id);

CREATE INDEX idx_work_material_links_material 
    ON public.work_material_links(material_boq_item_id);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.work_material_links IS 
    'Связи между работами и материалами в позициях ВОРа заказчика';

COMMENT ON COLUMN public.work_material_links.client_position_id IS 
    'ID позиции заказчика, в которой находятся связываемые работы и материалы';

COMMENT ON COLUMN public.work_material_links.work_boq_item_id IS 
    'ID элемента BOQ типа work (работа)';

COMMENT ON COLUMN public.work_material_links.material_boq_item_id IS 
    'ID элемента BOQ типа material (материал)';

COMMENT ON COLUMN public.work_material_links.material_quantity_per_work IS 
    'Количество материала, необходимое на единицу работы';

COMMENT ON COLUMN public.work_material_links.usage_coefficient IS 
    'Коэффициент использования материала в работе';

COMMENT ON COLUMN public.work_material_links.notes IS 
    'Примечания к связи работы и материала';

-- Функция для обновления updated_at (создается только если не существует)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
CREATE OR REPLACE TRIGGER update_work_material_links_updated_at
    BEFORE UPDATE ON public.work_material_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Представление для удобного получения связанных данных
CREATE OR REPLACE VIEW public.work_material_links_detailed AS
SELECT 
    wml.id,
    wml.client_position_id,
    wml.work_boq_item_id,
    wml.material_boq_item_id,
    wml.material_quantity_per_work,
    wml.usage_coefficient,
    wml.notes,
    wml.created_at,
    wml.updated_at,
    
    -- Информация о позиции заказчика
    cp.position_number,
    cp.work_name AS position_name,
    cp.tender_id,
    
    -- Информация о работе
    w.item_number AS work_item_number,
    w.description AS work_description,
    w.unit AS work_unit,
    w.quantity AS work_quantity,
    w.unit_rate AS work_unit_rate,
    w.total_amount AS work_total_amount,
    
    -- Информация о материале
    m.item_number AS material_item_number,
    m.description AS material_description,
    m.unit AS material_unit,
    m.quantity AS material_quantity,
    m.unit_rate AS material_unit_rate,
    m.total_amount AS material_total_amount,
    m.consumption_coefficient AS material_consumption_coefficient,
    m.conversion_coefficient AS material_conversion_coefficient,
    
    -- Расчетные поля
    (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient) AS total_material_needed,
    (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient * m.unit_rate) AS total_material_cost
    
FROM public.work_material_links wml
INNER JOIN public.client_positions cp ON wml.client_position_id = cp.id
INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
INNER JOIN public.boq_items m ON wml.material_boq_item_id = m.id
WHERE w.item_type = 'work' AND m.item_type = 'material';

-- Функция для проверки, что связываются только работы с материалами
CREATE OR REPLACE FUNCTION check_work_material_types()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем, что work_boq_item_id действительно указывает на работу
    IF NOT EXISTS (
        SELECT 1 FROM public.boq_items 
        WHERE id = NEW.work_boq_item_id 
        AND item_type = 'work'
    ) THEN
        RAISE EXCEPTION 'work_boq_item_id must reference a BOQ item with type "work"';
    END IF;
    
    -- Проверяем, что material_boq_item_id действительно указывает на материал
    IF NOT EXISTS (
        SELECT 1 FROM public.boq_items 
        WHERE id = NEW.material_boq_item_id 
        AND item_type = 'material'
    ) THEN
        RAISE EXCEPTION 'material_boq_item_id must reference a BOQ item with type "material"';
    END IF;
    
    -- Проверяем, что оба элемента принадлежат одной позиции
    IF NOT EXISTS (
        SELECT 1 FROM public.boq_items w, public.boq_items m
        WHERE w.id = NEW.work_boq_item_id 
        AND m.id = NEW.material_boq_item_id
        AND w.client_position_id = NEW.client_position_id
        AND m.client_position_id = NEW.client_position_id
    ) THEN
        RAISE EXCEPTION 'Both work and material must belong to the specified client position';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки типов при вставке и обновлении
CREATE TRIGGER check_work_material_types_trigger
    BEFORE INSERT OR UPDATE ON public.work_material_links
    FOR EACH ROW
    EXECUTE FUNCTION check_work_material_types();

-- Функция для получения всех материалов, связанных с работой
CREATE OR REPLACE FUNCTION get_materials_for_work(p_work_boq_item_id UUID)
RETURNS TABLE (
    link_id UUID,
    material_id UUID,
    material_description TEXT,
    material_unit TEXT,
    material_quantity DECIMAL,
    material_unit_rate DECIMAL,
    quantity_per_work DECIMAL,
    usage_coefficient DECIMAL,
    total_needed DECIMAL,
    total_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wml.id AS link_id,
        m.id AS material_id,
        m.description AS material_description,
        m.unit AS material_unit,
        m.quantity AS material_quantity,
        m.unit_rate AS material_unit_rate,
        wml.material_quantity_per_work AS quantity_per_work,
        wml.usage_coefficient,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient) AS total_needed,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient * m.unit_rate) AS total_cost
    FROM public.work_material_links wml
    INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
    INNER JOIN public.boq_items m ON wml.material_boq_item_id = m.id
    WHERE wml.work_boq_item_id = p_work_boq_item_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения всех работ, использующих материал
CREATE OR REPLACE FUNCTION get_works_using_material(p_material_boq_item_id UUID)
RETURNS TABLE (
    link_id UUID,
    work_id UUID,
    work_description TEXT,
    work_unit TEXT,
    work_quantity DECIMAL,
    work_unit_rate DECIMAL,
    quantity_per_work DECIMAL,
    usage_coefficient DECIMAL,
    total_material_usage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wml.id AS link_id,
        w.id AS work_id,
        w.description AS work_description,
        w.unit AS work_unit,
        w.quantity AS work_quantity,
        w.unit_rate AS work_unit_rate,
        wml.material_quantity_per_work AS quantity_per_work,
        wml.usage_coefficient,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient) AS total_material_usage
    FROM public.work_material_links wml
    INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
    WHERE wml.material_boq_item_id = p_material_boq_item_id;
END;
$$ LANGUAGE plpgsql;

-- Отключаем RLS для таблицы (согласно требованиям проекта)
ALTER TABLE public.work_material_links DISABLE ROW LEVEL SECURITY;

-- Даем права на таблицу
GRANT ALL ON TABLE public.work_material_links TO anon;
GRANT ALL ON TABLE public.work_material_links TO authenticated;
GRANT ALL ON TABLE public.work_material_links TO service_role;