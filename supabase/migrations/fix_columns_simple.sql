-- =====================================================
-- ПРОСТОЕ РЕШЕНИЕ: Добавление недостающих колонок
-- =====================================================

-- Шаг 1: Добавляем колонки (если их нет, будет ошибка - это нормально)
ALTER TABLE public.work_material_links 
ADD COLUMN IF NOT EXISTS material_quantity_per_work numeric(12,4) DEFAULT 1.0000;

ALTER TABLE public.work_material_links 
ADD COLUMN IF NOT EXISTS usage_coefficient numeric(12,4) DEFAULT 1.0000;

-- Шаг 2: Проверяем что колонки добавились
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'work_material_links' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Шаг 3: Удаляем дублирующиеся constraints
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS uq_work_material_link CASCADE;

-- Шаг 4: Создаем правильный constraint
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS uq_work_material_link_pair CASCADE;

ALTER TABLE public.work_material_links 
ADD CONSTRAINT uq_work_material_link_pair 
UNIQUE (work_boq_item_id, material_boq_item_id);

-- Шаг 5: Создаем индексы
CREATE INDEX IF NOT EXISTS idx_wml_work ON public.work_material_links(work_boq_item_id);
CREATE INDEX IF NOT EXISTS idx_wml_material ON public.work_material_links(material_boq_item_id);
CREATE INDEX IF NOT EXISTS idx_wml_position ON public.work_material_links(client_position_id);

-- Шаг 6: Даем права
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_material_links TO authenticated;
GRANT SELECT ON public.work_material_links TO anon;

-- Шаг 7: Отключаем RLS
ALTER TABLE public.work_material_links DISABLE ROW LEVEL SECURITY;

-- Шаг 8: Обновляем комментарий таблицы (простой способ)
COMMENT ON TABLE public.work_material_links IS 
'Связи между работами и материалами. Один материал может быть связан с несколькими работами.';

-- Шаг 9: Обновление кэша
SELECT pg_notify('pgrst', 'reload schema');

-- =====================================================
-- ВАЖНАЯ ИНФОРМАЦИЯ
-- =====================================================
-- После выполнения этого скрипта:
-- 1. Перезапустите PostgREST через Supabase Dashboard:
--    Settings -> API -> Restart Server
-- 2. Подождите 30-60 секунд
-- 3. Обновите страницу в браузере (Ctrl+F5)
-- =====================================================