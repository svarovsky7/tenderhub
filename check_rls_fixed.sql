-- Проверка RLS для таблиц
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('cost_nodes', 'units', 'location');

-- Если rowsecurity = true, значит RLS включен
-- Отключите его командами ниже:

-- ALTER TABLE public.cost_nodes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.location DISABLE ROW LEVEL SECURITY;