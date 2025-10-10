-- ========================================
-- ФУНКЦИЯ: Получение всех пользователей с данными из auth.users и profiles
-- ========================================
-- Эту миграцию применять ПОСЛЕ 20251010_02_update_profile_trigger.sql

-- Создание функции для получения всех пользователей
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role user_role,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    COALESCE(u.email, '') as email,
    p.full_name,
    p.role,
    p.created_at,
    p.updated_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_all_users() IS 'Returns all users with profile and auth data combined';

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO anon;

-- ========================================
-- ИТОГ: Функция get_all_users создана
-- ========================================
-- UsersPage использует эту функцию для отображения списка пользователей
