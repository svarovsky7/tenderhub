-- =====================================================
-- Добавление недостающих колонок в work_material_links
-- =====================================================

-- 1. Проверяем какие колонки уже есть
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_material_links' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Добавляем недостающие колонки если их нет
DO $$ 
BEGIN
    -- Добавляем material_quantity_per_work если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_material_links' 
        AND column_name = 'material_quantity_per_work'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.work_material_links 
        ADD COLUMN material_quantity_per_work numeric(12,4) DEFAULT 1.0000;
        
        COMMENT ON COLUMN public.work_material_links.material_quantity_per_work 
        IS 'Количество материала на единицу работы (коэффициент расхода)';
        
        RAISE NOTICE 'Добавлена колонка material_quantity_per_work';
    ELSE
        RAISE NOTICE 'Колонка material_quantity_per_work уже существует';
    END IF;

    -- Добавляем usage_coefficient если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_material_links' 
        AND column_name = 'usage_coefficient'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.work_material_links 
        ADD COLUMN usage_coefficient numeric(12,4) DEFAULT 1.0000;
        
        COMMENT ON COLUMN public.work_material_links.usage_coefficient 
        IS 'Коэффициент перевода единиц измерения';
        
        RAISE NOTICE 'Добавлена колонка usage_coefficient';
    ELSE
        RAISE NOTICE 'Колонка usage_coefficient уже существует';
    END IF;
END $$;

-- 3. Проверяем структуру после добавления
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_material_links' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Удаляем дублирующиеся constraints если есть
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS uq_work_material_link CASCADE;

-- 5. Создаем правильное уникальное ограничение
-- Пара (работа, материал) должна быть уникальной
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS uq_work_material_link_pair CASCADE;

ALTER TABLE public.work_material_links 
ADD CONSTRAINT uq_work_material_link_pair 
UNIQUE (work_boq_item_id, material_boq_item_id);

-- 6. Добавляем индексы
CREATE INDEX IF NOT EXISTS idx_work_material_links_work 
ON public.work_material_links(work_boq_item_id);

CREATE INDEX IF NOT EXISTS idx_work_material_links_material 
ON public.work_material_links(material_boq_item_id);

CREATE INDEX IF NOT EXISTS idx_work_material_links_position 
ON public.work_material_links(client_position_id);

-- 7. Обновляем foreign keys с CASCADE
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS fk_work_material_links_material CASCADE,
DROP CONSTRAINT IF EXISTS fk_work_material_links_work CASCADE,
DROP CONSTRAINT IF EXISTS fk_work_material_links_position CASCADE;

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

-- 8. Создаем представление с проверкой существования колонок
DROP VIEW IF EXISTS work_material_links_detailed CASCADE;

CREATE VIEW work_material_links_detailed AS
SELECT 
    wml.id,
    wml.client_position_id,
    wml.work_boq_item_id,
    wml.material_boq_item_id,
    wml.notes,
    wml.created_at,
    wml.updated_at,
    -- Используем COALESCE для совместимости со старыми и новыми колонками
    COALESCE(wml.material_quantity_per_work, 1.0) as material_quantity_per_work,
    COALESCE(wml.usage_coefficient, 1.0) as usage_coefficient,
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
    (w.quantity * COALESCE(wml.material_quantity_per_work, 1.0) * COALESCE(wml.usage_coefficient, 1.0)) as calculated_material_quantity,
    (w.quantity * COALESCE(wml.material_quantity_per_work, 1.0) * COALESCE(wml.usage_coefficient, 1.0) * m.unit_rate) as calculated_material_cost,
    -- Информация о позиции
    cp.position_number,
    cp.work_name as position_name
FROM public.work_material_links wml
JOIN public.boq_items w ON w.id = wml.work_boq_item_id AND w.item_type = 'work'
JOIN public.boq_items m ON m.id = wml.material_boq_item_id AND m.item_type = 'material'
JOIN public.client_positions cp ON cp.id = wml.client_position_id;

-- 9. Даем права
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_material_links TO authenticated;
GRANT SELECT ON public.work_material_links TO anon;
GRANT SELECT ON work_material_links_detailed TO authenticated;
GRANT SELECT ON work_material_links_detailed TO anon;

-- 10. Отключаем RLS (если он включен)
ALTER TABLE public.work_material_links DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- ОБНОВЛЕНИЕ КЭША СХЕМЫ
-- =====================================================

-- Способ 1: Через NOTIFY (может не сработать сразу)
NOTIFY pgrst, 'reload schema';

-- Способ 2: Обновление комментария таблицы (форсирует обновление кэша)
DO $$
DECLARE
    current_time text;
BEGIN
    current_time := NOW()::text;
    EXECUTE 'COMMENT ON TABLE public.work_material_links IS ' ||
            quote_literal('Связи между работами и материалами. Обновлено: ' || current_time);
END $$;

-- Способ 3: Пересоздание роли (более радикальный способ)
-- ВНИМАНИЕ: Выполнять только если предыдущие способы не помогли
/*
DO $$ 
BEGIN
    -- Сохраняем права
    CREATE TEMP TABLE temp_grants AS
    SELECT * FROM information_schema.role_table_grants 
    WHERE table_name = 'work_material_links';
    
    -- Пересоздаем права
    REVOKE ALL ON public.work_material_links FROM authenticated;
    REVOKE ALL ON public.work_material_links FROM anon;
    
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_material_links TO authenticated;
    GRANT SELECT ON public.work_material_links TO anon;
END $$;
*/

-- =====================================================
-- ПРОВЕРКА
-- =====================================================

-- Финальная проверка структуры
DO $$
DECLARE
    col_count integer;
    has_material_qty boolean;
    has_usage_coef boolean;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'work_material_links' 
    AND table_schema = 'public';
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_material_links' 
        AND column_name = 'material_quantity_per_work'
        AND table_schema = 'public'
    ) INTO has_material_qty;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_material_links' 
        AND column_name = 'usage_coefficient'
        AND table_schema = 'public'
    ) INTO has_usage_coef;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Проверка таблицы work_material_links:';
    RAISE NOTICE '  Всего колонок: %', col_count;
    RAISE NOTICE '  material_quantity_per_work существует: %', has_material_qty;
    RAISE NOTICE '  usage_coefficient существует: %', has_usage_coef;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ВАЖНО: После выполнения этого скрипта:';
    RAISE NOTICE '1. Перезапустите PostgREST сервер через Supabase Dashboard';
    RAISE NOTICE '   Settings -> API -> Restart Server';
    RAISE NOTICE '2. Подождите 30-60 секунд';
    RAISE NOTICE '3. Обновите страницу в браузере (Ctrl+F5)';
    RAISE NOTICE '========================================';
END $$;