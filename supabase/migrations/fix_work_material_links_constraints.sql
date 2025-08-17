-- =====================================================
-- Исправление уникальных ограничений в work_material_links
-- =====================================================
-- Проблема: сейчас одна работа может быть связана только с одним материалом,
-- и один материал может быть связан только с одной работой во всей БД.
-- Решение: убираем неправильные ограничения и создаем правильное - 
-- уникальность пары (work_boq_item_id, material_boq_item_id)

-- 1. Удаляем все существующие уникальные ограничения с именем uq_work_material_link
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Находим все ограничения с именем uq_work_material_link
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.work_material_links'::regclass
        AND conname LIKE 'uq_work_material%'
    LOOP
        EXECUTE format('ALTER TABLE public.work_material_links DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
        RAISE NOTICE 'Удалено ограничение: %', constraint_record.conname;
    END LOOP;
END $$;

-- 2. Создаем правильное уникальное ограничение на пару
-- Это позволит:
-- - Одной работе быть связанной с множеством материалов
-- - Одному материалу быть связанным с множеством работ
-- - Но не позволит дублировать одну и ту же связь
ALTER TABLE public.work_material_links 
ADD CONSTRAINT uq_work_material_pair 
UNIQUE (work_boq_item_id, material_boq_item_id);

-- 3. Проверяем результат
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.work_material_links'::regclass
AND contype = 'u'
ORDER BY conname;

-- 4. Обновляем комментарий таблицы
COMMENT ON TABLE public.work_material_links IS 
'Связи между работами и материалами. Одна работа может быть связана с множеством материалов, один материал может быть связан с множеством работ. Уникальна пара (work_boq_item_id, material_boq_item_id).';

-- =====================================================
-- ВАЖНО: После выполнения этого скрипта:
-- 1. Перезапустите PostgREST через Supabase Dashboard
--    Settings -> API -> Restart Server
-- 2. Подождите 30-60 секунд
-- 3. Обновите страницу в браузере (Ctrl+F5)
-- =====================================================