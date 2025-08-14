-- Проверка и отключение RLS для таблиц

-- 1. Проверка статуса RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('cost_nodes', 'units', 'location');

-- 2. Проверка политик RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cost_nodes', 'units', 'location');

-- 3. Если нужно отключить RLS (выполните только если RLS включен и мешает)
-- ALTER TABLE public.cost_nodes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.location DISABLE ROW LEVEL SECURITY;

-- 4. Или создать разрешающие политики
-- DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.cost_nodes;
-- CREATE POLICY "Enable all for authenticated users" ON public.cost_nodes
--     FOR ALL USING (true) WITH CHECK (true);

-- 5. Проверка прав доступа для anon роли
SELECT 
    tablename,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND tablename IN ('cost_nodes', 'units', 'location')
  AND grantee = 'anon'
ORDER BY tablename, privilege_type;

-- 6. Если нужно дать права anon пользователю
-- GRANT ALL ON public.cost_nodes TO anon;
-- GRANT ALL ON public.units TO anon;
-- GRANT ALL ON public.location TO anon;