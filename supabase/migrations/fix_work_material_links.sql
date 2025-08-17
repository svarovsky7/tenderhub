-- =====================================================
-- Исправление таблицы work_material_links
-- =====================================================

-- 1. Удаляем дублирующиеся и неправильные constraints
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS uq_work_material_link CASCADE;

-- 2. Создаем правильные уникальные ограничения
-- Каждый материал может быть связан только с одной работой
ALTER TABLE public.work_material_links 
ADD CONSTRAINT uq_work_material_link_material 
UNIQUE (material_boq_item_id);

-- Опционально: если нужно ограничить, чтобы работа могла иметь только уникальные материалы
-- (раскомментируйте если нужно)
-- ALTER TABLE public.work_material_links 
-- ADD CONSTRAINT uq_work_material_link_pair 
-- UNIQUE (work_boq_item_id, material_boq_item_id);

-- 3. Добавляем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_work_material_links_work 
ON public.work_material_links(work_boq_item_id);

CREATE INDEX IF NOT EXISTS idx_work_material_links_material 
ON public.work_material_links(material_boq_item_id);

CREATE INDEX IF NOT EXISTS idx_work_material_links_position 
ON public.work_material_links(client_position_id);

-- 4. Добавляем ON DELETE CASCADE для автоматического удаления связей
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS fk_work_material_links_material,
DROP CONSTRAINT IF EXISTS fk_work_material_links_work,
DROP CONSTRAINT IF EXISTS fk_work_material_links_position;

ALTER TABLE public.work_material_links
ADD CONSTRAINT fk_work_material_links_material 
  FOREIGN KEY (material_boq_item_id) 
  REFERENCES public.boq_items(id) 
  ON DELETE CASCADE,
ADD CONSTRAINT fk_work_material_links_work 
  FOREIGN KEY (work_boq_item_id) 
  REFERENCES public.boq_items(id) 
  ON DELETE CASCADE,
ADD CONSTRAINT fk_work_material_links_position 
  FOREIGN KEY (client_position_id) 
  REFERENCES public.client_positions(id) 
  ON DELETE CASCADE;

-- 5. Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_work_material_links_updated_at ON public.work_material_links;
CREATE TRIGGER update_work_material_links_updated_at 
BEFORE UPDATE ON public.work_material_links 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 7. Создаем представление для удобного получения связей с полной информацией
CREATE OR REPLACE VIEW work_material_links_detailed AS
SELECT 
    wml.*,
    -- Информация о работе
    w.description as work_description,
    w.quantity as work_quantity,
    w.unit as work_unit,
    w.unit_rate as work_unit_rate,
    w.item_number as work_item_number,
    -- Информация о материале  
    m.description as material_description,
    m.quantity as material_quantity,
    m.unit as material_unit,
    m.unit_rate as material_unit_rate,
    m.item_number as material_item_number,
    -- Расчетные поля
    (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient) as calculated_material_quantity,
    (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient * m.unit_rate) as calculated_material_cost,
    -- Информация о позиции
    cp.position_number,
    cp.work_name as position_name
FROM public.work_material_links wml
JOIN public.boq_items w ON w.id = wml.work_boq_item_id AND w.item_type = 'work'
JOIN public.boq_items m ON m.id = wml.material_boq_item_id AND m.item_type = 'material'
JOIN public.client_positions cp ON cp.id = wml.client_position_id;

-- 8. Даем права на представление
GRANT SELECT ON work_material_links_detailed TO authenticated;
GRANT SELECT ON work_material_links_detailed TO anon;

-- 9. Создаем функцию для получения материалов по работе
CREATE OR REPLACE FUNCTION get_materials_for_work(p_work_boq_item_id uuid)
RETURNS TABLE (
    link_id uuid,
    material_id uuid,
    material_description text,
    material_unit text,
    material_unit_rate numeric,
    quantity_per_work numeric,
    usage_coefficient numeric,
    work_quantity numeric,
    total_needed numeric,
    total_cost numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wml.id as link_id,
        m.id as material_id,
        m.description as material_description,
        m.unit as material_unit,
        m.unit_rate as material_unit_rate,
        wml.material_quantity_per_work as quantity_per_work,
        wml.usage_coefficient,
        w.quantity as work_quantity,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient) as total_needed,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient * m.unit_rate) as total_cost
    FROM work_material_links wml
    JOIN boq_items m ON m.id = wml.material_boq_item_id
    JOIN boq_items w ON w.id = wml.work_boq_item_id
    WHERE wml.work_boq_item_id = p_work_boq_item_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Комментарии для документации
COMMENT ON VIEW work_material_links_detailed IS 'Детальное представление связей работ и материалов с расчетными полями';
COMMENT ON FUNCTION get_materials_for_work IS 'Получить все материалы, связанные с работой, с расчетными полями';

-- =====================================================
-- Проверка данных и очистка дубликатов (если есть)
-- =====================================================

-- Находим и удаляем дубликаты (оставляем только последнюю связь)
WITH duplicates AS (
    SELECT 
        material_boq_item_id,
        MAX(created_at) as latest_created
    FROM work_material_links
    GROUP BY material_boq_item_id
    HAVING COUNT(*) > 1
)
DELETE FROM work_material_links wml
WHERE EXISTS (
    SELECT 1 
    FROM duplicates d 
    WHERE d.material_boq_item_id = wml.material_boq_item_id 
    AND wml.created_at < d.latest_created
);

-- Вывод статистики
DO $$
DECLARE
    link_count integer;
    work_count integer;
    material_count integer;
BEGIN
    SELECT COUNT(*) INTO link_count FROM work_material_links;
    SELECT COUNT(DISTINCT work_boq_item_id) INTO work_count FROM work_material_links;
    SELECT COUNT(DISTINCT material_boq_item_id) INTO material_count FROM work_material_links;
    
    RAISE NOTICE 'Статистика work_material_links:';
    RAISE NOTICE '  Всего связей: %', link_count;
    RAISE NOTICE '  Уникальных работ: %', work_count;
    RAISE NOTICE '  Уникальных материалов: %', material_count;
END $$;