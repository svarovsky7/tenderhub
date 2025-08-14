-- =====================================================
-- SQL запросы для экспорта структуры БД из Supabase
-- =====================================================

-- 1. Список всех таблиц в схеме public
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Детальная структура всех таблиц (колонки, типы данных, ограничения)
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    c.is_identity,
    c.is_generated
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- 3. Первичные ключи
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name, kcu.ordinal_position;

-- 4. Внешние ключи
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- 5. Индексы
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Проверочные ограничения (CHECK constraints)
SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

-- 7. Функции и процедуры
SELECT 
    routine_name,
    routine_type,
    data_type AS return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 8. Триггеры
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. Представления (Views)
SELECT 
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 10. Политики RLS (Row Level Security)
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
ORDER BY tablename, policyname;

-- =====================================================
-- ЕДИНЫЙ ЗАПРОС ДЛЯ ЭКСПОРТА DDL ВСЕХ ОБЪЕКТОВ
-- Выполните этот запрос для получения полной структуры
-- =====================================================

WITH table_ddl AS (
    SELECT 
        'CREATE TABLE IF NOT EXISTS ' || schemaname || '.' || tablename || ' (' || chr(10) ||
        array_to_string(
            array_agg(
                '    ' || column_name || ' ' || 
                data_type || 
                CASE 
                    WHEN character_maximum_length IS NOT NULL 
                    THEN '(' || character_maximum_length || ')'
                    ELSE ''
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
                ORDER BY ordinal_position
            ), 
            ',' || chr(10)
        ) || chr(10) || ');' AS ddl
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY schemaname, tablename
)
SELECT ddl FROM table_ddl
ORDER BY ddl;

-- =====================================================
-- АЛЬТЕРНАТИВНЫЙ ВАРИАНТ: Используйте pg_dump
-- Если у вас есть доступ к командной строке Supabase
-- =====================================================
-- В Supabase SQL Editor выполните:
-- SELECT pg_get_tabledef('public.ИМЯ_ТАБЛИЦЫ'::regclass);
-- Для каждой таблицы, чтобы получить её полное определение