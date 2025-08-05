-- ============================================================================
-- TenderHub Hierarchical Schema Enhancement
-- ============================================================================
-- Расширение схемы для поддержки иерархической структуры тендеров:
-- Тендер → Позиции заказчика → Материалы/Работы
-- Создано: 2025-08-04
-- 
-- АРХИТЕКТУРА:
-- 1. client_positions - позиции заказчика (верхний уровень группировки)
-- 2. boq_items - материалы и работы, привязанные к позициям заказчика
-- 3. Автоматическая нумерация и пересчет иерархии
-- 4. Оптимизация для быстрых группировок и суммирований
-- ============================================================================

-- Создаем тип для статуса позиций заказчика
DROP TYPE IF EXISTS client_position_status CASCADE;
CREATE TYPE client_position_status AS ENUM ('active', 'inactive', 'completed');

-- ============================================================================
-- ТАБЛИЦА ПОЗИЦИЙ ЗАКАЗЧИКА (CLIENT POSITIONS)
-- ============================================================================
-- Позиции заказчика - верхний уровень иерархии в тендере
-- Каждая позиция может содержать множество материалов и работ
DROP TABLE IF EXISTS public.client_positions CASCADE;
CREATE TABLE public.client_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    
    -- Нумерация и идентификация
    position_number INTEGER NOT NULL, -- Порядковый номер позиции (1, 2, 3...)
    title TEXT NOT NULL, -- Название позиции от заказчика
    description TEXT, -- Подробное описание позиции
    
    -- Организационные поля
    category TEXT, -- Категория позиции (строительство, материалы, оборудование)
    priority INTEGER DEFAULT 0, -- Приоритет позиции (для сортировки)
    status client_position_status NOT NULL DEFAULT 'active',
    
    -- Вычисляемые поля (будут обновляться триггерами)
    total_materials_cost DECIMAL(15,2) DEFAULT 0, -- Общая стоимость материалов
    total_works_cost DECIMAL(15,2) DEFAULT 0, -- Общая стоимость работ
    total_position_cost DECIMAL(15,2) GENERATED ALWAYS AS 
        (COALESCE(total_materials_cost, 0) + COALESCE(total_works_cost, 0)) STORED,
    
    -- Метаданные
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT chk_position_number_positive CHECK (position_number > 0),
    CONSTRAINT chk_priority_valid CHECK (priority >= 0),
    CONSTRAINT uq_client_positions_tender_number UNIQUE (tender_id, position_number),
    CONSTRAINT uq_client_positions_tender_title UNIQUE (tender_id, title)
);

-- Индексы для оптимизации запросов по позициям заказчика
CREATE INDEX idx_client_positions_tender_id ON public.client_positions(tender_id);
CREATE INDEX idx_client_positions_number ON public.client_positions(tender_id, position_number);
CREATE INDEX idx_client_positions_status ON public.client_positions(status);
CREATE INDEX idx_client_positions_category ON public.client_positions(category);
CREATE INDEX idx_client_positions_total_cost ON public.client_positions(total_position_cost DESC);

-- ============================================================================
-- МОДИФИКАЦИЯ ТАБЛИЦЫ BOQ_ITEMS
-- ============================================================================
-- Добавляем связь с позициями заказчика и улучшаем нумерацию

-- Сначала добавляем новые колонки к существующей таблице
ALTER TABLE public.boq_items 
ADD COLUMN IF NOT EXISTS client_position_id UUID REFERENCES public.client_positions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS sub_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Обновляем комментарий для колонки item_number
COMMENT ON COLUMN public.boq_items.item_number IS 'Полный номер позиции в формате "X.Y" где X - номер позиции заказчика, Y - подномер';
COMMENT ON COLUMN public.boq_items.sub_number IS 'Подномер элемента внутри позиции заказчика (1, 2, 3...)';
COMMENT ON COLUMN public.boq_items.sort_order IS 'Порядок сортировки внутри позиции заказчика';

-- Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_boq_items_client_position_id ON public.boq_items(client_position_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_position_sub ON public.boq_items(client_position_id, sub_number);
CREATE INDEX IF NOT EXISTS idx_boq_items_sort_order ON public.boq_items(client_position_id, sort_order);

-- Составной индекс для оптимизации иерархических запросов
CREATE INDEX IF NOT EXISTS idx_boq_items_hierarchy ON public.boq_items(tender_id, client_position_id, sub_number);

-- ============================================================================
-- ФУНКЦИИ ДЛЯ АВТОМАТИЧЕСКОЙ НУМЕРАЦИИ
-- ============================================================================

-- Функция для генерации следующего номера позиции заказчика
CREATE OR REPLACE FUNCTION public.get_next_client_position_number(p_tender_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(position_number), 0) + 1 
    INTO next_number
    FROM public.client_positions 
    WHERE tender_id = p_tender_id;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации следующего подномера в позиции
CREATE OR REPLACE FUNCTION public.get_next_sub_number(p_client_position_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_sub_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(sub_number), 0) + 1 
    INTO next_sub_number
    FROM public.boq_items 
    WHERE client_position_id = p_client_position_id;
    
    RETURN next_sub_number;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления item_number на основе позиции и подномера
CREATE OR REPLACE FUNCTION public.update_boq_item_number()
RETURNS TRIGGER AS $$
DECLARE
    position_num INTEGER;
BEGIN
    -- Получаем номер позиции заказчика
    SELECT position_number INTO position_num
    FROM public.client_positions 
    WHERE id = NEW.client_position_id;
    
    -- Обновляем item_number в формате "X.Y"
    NEW.item_number = position_num || '.' || NEW.sub_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция для пересчета стоимости позиций заказчика
CREATE OR REPLACE FUNCTION public.recalculate_client_position_totals()
RETURNS TRIGGER AS $$
DECLARE
    position_id UUID;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
BEGIN
    -- Определяем ID позиции для пересчета
    IF TG_OP = 'DELETE' THEN
        position_id = OLD.client_position_id;
    ELSE
        position_id = NEW.client_position_id;
    END IF;
    
    -- Пересчитываем общую стоимость материалов
    SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
    FROM public.boq_items 
    WHERE client_position_id = position_id AND item_type = 'material';
    
    -- Пересчитываем общую стоимость работ
    SELECT COALESCE(SUM(total_amount), 0) INTO works_total
    FROM public.boq_items 
    WHERE client_position_id = position_id AND item_type = 'work';
    
    -- Обновляем итоги в позиции заказчика
    UPDATE public.client_positions 
    SET 
        total_materials_cost = materials_total,
        total_works_cost = works_total,
        updated_at = NOW()
    WHERE id = position_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЗАЦИИ
-- ============================================================================

-- Триггер для автоматической установки номера позиции
CREATE OR REPLACE TRIGGER set_client_position_number
    BEFORE INSERT ON public.client_positions
    FOR EACH ROW
    WHEN (NEW.position_number IS NULL)
    EXECUTE FUNCTION (
        SELECT NEW.position_number = public.get_next_client_position_number(NEW.tender_id),
               NEW
    );

-- Альтернативная реализация триггера для установки номера позиции
CREATE OR REPLACE FUNCTION public.set_client_position_number_func()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.position_number IS NULL THEN
        NEW.position_number = public.get_next_client_position_number(NEW.tender_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_client_position_number
    BEFORE INSERT ON public.client_positions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_client_position_number_func();

-- Триггер для автоматической установки подномера BOQ элемента
CREATE OR REPLACE FUNCTION public.set_boq_sub_number_func()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sub_number IS NULL AND NEW.client_position_id IS NOT NULL THEN
        NEW.sub_number = public.get_next_sub_number(NEW.client_position_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_boq_sub_number
    BEFORE INSERT ON public.boq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_boq_sub_number_func();

-- Триггер для автоматического обновления номера элемента BOQ
CREATE TRIGGER update_boq_item_number_trigger
    BEFORE INSERT OR UPDATE ON public.boq_items
    FOR EACH ROW
    WHEN (NEW.client_position_id IS NOT NULL)
    EXECUTE FUNCTION public.update_boq_item_number();

-- Триггер для пересчета итогов позиций заказчика
CREATE TRIGGER recalculate_totals_on_boq_change
    AFTER INSERT OR UPDATE OR DELETE ON public.boq_items
    FOR EACH ROW
    WHEN (COALESCE(NEW.client_position_id, OLD.client_position_id) IS NOT NULL)
    EXECUTE FUNCTION public.recalculate_client_position_totals();

-- Триггер для updated_at на client_positions
CREATE TRIGGER update_client_positions_updated_at
    BEFORE UPDATE ON public.client_positions
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ УДОБНОЙ РАБОТЫ С ИЕРАРХИЕЙ
-- ============================================================================

-- Представление для получения полной иерархии тендера
CREATE OR REPLACE VIEW public.tender_hierarchy AS
SELECT 
    t.id as tender_id,
    t.title as tender_title,
    t.tender_number,
    t.status as tender_status,
    
    cp.id as client_position_id,
    cp.position_number,
    cp.title as position_title,
    cp.category as position_category,
    cp.total_position_cost,
    
    bi.id as boq_item_id,
    bi.item_number,
    bi.sub_number,
    bi.description as item_description,
    bi.item_type,
    bi.quantity,
    bi.unit_rate,
    bi.total_amount as item_total,
    bi.unit,
    
    -- Ссылки на библиотеки
    ml.name as material_name,
    ml.code as material_code,
    wl.name as work_name,
    wl.code as work_code
    
FROM public.tenders t
LEFT JOIN public.client_positions cp ON t.id = cp.tender_id
LEFT JOIN public.boq_items bi ON cp.id = bi.client_position_id
LEFT JOIN public.materials_library ml ON bi.material_id = ml.id
LEFT JOIN public.works_library wl ON bi.work_id = wl.id
ORDER BY t.id, cp.position_number, bi.sub_number;

-- Представление для итогов по позициям заказчика
CREATE OR REPLACE VIEW public.client_positions_summary AS
SELECT 
    cp.id,
    cp.tender_id,
    cp.position_number,
    cp.title,
    cp.category,
    cp.status,
    
    -- Счетчики элементов
    COUNT(bi.id) as items_count,
    COUNT(bi.id) FILTER (WHERE bi.item_type = 'material') as materials_count,
    COUNT(bi.id) FILTER (WHERE bi.item_type = 'work') as works_count,
    
    -- Итоговые суммы
    cp.total_materials_cost,
    cp.total_works_cost,
    cp.total_position_cost,
    
    -- Процентное соотношение
    CASE 
        WHEN cp.total_position_cost > 0 THEN 
            ROUND((cp.total_materials_cost / cp.total_position_cost * 100), 2)
        ELSE 0 
    END as materials_percentage,
    
    CASE 
        WHEN cp.total_position_cost > 0 THEN 
            ROUND((cp.total_works_cost / cp.total_position_cost * 100), 2)
        ELSE 0 
    END as works_percentage,
    
    cp.created_at,
    cp.updated_at
    
FROM public.client_positions cp
LEFT JOIN public.boq_items bi ON cp.id = bi.client_position_id
GROUP BY cp.id, cp.tender_id, cp.position_number, cp.title, cp.category, 
         cp.status, cp.total_materials_cost, cp.total_works_cost, 
         cp.total_position_cost, cp.created_at, cp.updated_at
ORDER BY cp.position_number;

-- Представление для итогов по тендеру
CREATE OR REPLACE VIEW public.tender_summary AS
SELECT 
    t.id as tender_id,
    t.title,
    t.tender_number,
    t.status,
    t.estimated_value,
    
    -- Счетчики позиций
    COUNT(DISTINCT cp.id) as positions_count,
    COUNT(DISTINCT bi.id) as total_items_count,
    
    -- Итоговые суммы
    COALESCE(SUM(cp.total_materials_cost), 0) as total_materials_cost,
    COALESCE(SUM(cp.total_works_cost), 0) as total_works_cost,
    COALESCE(SUM(cp.total_position_cost), 0) as total_tender_cost,
    
    -- Сравнение с оценочной стоимостью
    CASE 
        WHEN t.estimated_value > 0 AND SUM(cp.total_position_cost) > 0 THEN
            ROUND(((SUM(cp.total_position_cost) - t.estimated_value) / t.estimated_value * 100), 2)
        ELSE NULL
    END as cost_variance_percentage,
    
    t.created_at,
    t.updated_at
    
FROM public.tenders t
LEFT JOIN public.client_positions cp ON t.id = cp.tender_id
LEFT JOIN public.boq_items bi ON cp.id = bi.client_position_id
GROUP BY t.id, t.title, t.tender_number, t.status, t.estimated_value, 
         t.created_at, t.updated_at
ORDER BY t.created_at DESC;

-- ============================================================================
-- ФУНКЦИИ ДЛЯ МАССОВЫХ ОПЕРАЦИЙ
-- ============================================================================

-- Функция для массового создания BOQ элементов в позиции заказчика
CREATE OR REPLACE FUNCTION public.bulk_insert_boq_items_to_position(
    p_client_position_id UUID,
    p_items JSONB
) RETURNS INTEGER AS $$
DECLARE
    item JSONB;
    inserted_count INTEGER := 0;
    new_sub_number INTEGER;
BEGIN
    -- Получаем начальный подномер
    SELECT COALESCE(MAX(sub_number), 0) + 1 
    INTO new_sub_number
    FROM public.boq_items 
    WHERE client_position_id = p_client_position_id;
    
    -- Вставляем каждый элемент
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.boq_items (
            tender_id,
            client_position_id,
            sub_number,
            item_type,
            description,
            unit,
            quantity,
            unit_rate,
            material_id,
            work_id,
            category,
            notes
        ) 
        SELECT 
            cp.tender_id,
            p_client_position_id,
            new_sub_number,
            (item->>'item_type')::boq_item_type,
            item->>'description',
            item->>'unit',
            (item->>'quantity')::DECIMAL(12,4),
            (item->>'unit_rate')::DECIMAL(12,4),
            CASE WHEN item->>'material_id' != 'null' THEN (item->>'material_id')::UUID ELSE NULL END,
            CASE WHEN item->>'work_id' != 'null' THEN (item->>'work_id')::UUID ELSE NULL END,
            item->>'category',
            item->>'notes'
        FROM public.client_positions cp 
        WHERE cp.id = p_client_position_id;
        
        new_sub_number := new_sub_number + 1;
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Функция для перенумерации позиций заказчика
CREATE OR REPLACE FUNCTION public.renumber_client_positions(p_tender_id UUID)
RETURNS INTEGER AS $$
DECLARE
    position_record RECORD;
    new_number INTEGER := 1;
    updated_count INTEGER := 0;
BEGIN
    -- Перенумеровываем позиции в порядке их создания
    FOR position_record IN 
        SELECT id FROM public.client_positions 
        WHERE tender_id = p_tender_id 
        ORDER BY created_at, id
    LOOP
        UPDATE public.client_positions 
        SET position_number = new_number 
        WHERE id = position_record.id;
        
        new_number := new_number + 1;
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ И ФУНКЦИЯМ
-- ============================================================================

COMMENT ON TABLE public.client_positions IS 'Позиции заказчика - верхний уровень группировки в BOQ';
COMMENT ON COLUMN public.client_positions.position_number IS 'Порядковый номер позиции в тендере (1, 2, 3...)';
COMMENT ON COLUMN public.client_positions.total_position_cost IS 'Автоматически вычисляемая общая стоимость позиции';

COMMENT ON VIEW public.tender_hierarchy IS 'Полная иерархия тендера: тендер → позиции → элементы BOQ';
COMMENT ON VIEW public.client_positions_summary IS 'Сводка по позициям заказчика с итогами и статистикой';
COMMENT ON VIEW public.tender_summary IS 'Общая сводка по тендеру с итогами по всем позициям';

COMMENT ON FUNCTION public.bulk_insert_boq_items_to_position IS 'Массовая вставка BOQ элементов в позицию заказчика';
COMMENT ON FUNCTION public.renumber_client_positions IS 'Перенумерация позиций заказчика в порядке создания';

-- ============================================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ============================================================================

/*
-- 1. Создание позиции заказчика
INSERT INTO public.client_positions (tender_id, title, description, category)
VALUES (
    'your-tender-id',
    'Фундаментные работы',
    'Устройство монолитного железобетонного фундамента',
    'Строительные работы'
);

-- 2. Добавление BOQ элементов к позиции
INSERT INTO public.boq_items (
    tender_id, client_position_id, item_type, description, 
    unit, quantity, unit_rate, material_id
) VALUES (
    'your-tender-id',
    'your-position-id', 
    'material',
    'Бетон B25',
    'm3',
    15.5,
    4500.00,
    'material-id-from-library'
);

-- 3. Получение иерархии тендера
SELECT * FROM public.tender_hierarchy WHERE tender_id = 'your-tender-id';

-- 4. Получение итогов по позициям
SELECT * FROM public.client_positions_summary WHERE tender_id = 'your-tender-id';

-- 5. Массовая вставка элементов BOQ
SELECT public.bulk_insert_boq_items_to_position(
    'your-position-id',
    '[
        {
            "item_type": "material",
            "description": "Арматура A500C",
            "unit": "т",
            "quantity": 2.5,
            "unit_rate": 75000.00,
            "material_id": "material-id",
            "category": "Металл"
        }
    ]'::jsonb
);
*/