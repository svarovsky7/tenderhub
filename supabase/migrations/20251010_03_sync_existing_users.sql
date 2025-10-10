-- ========================================
-- СИНХРОНИЗАЦИЯ: Перенос существующих пользователей из auth.users в profiles
-- ========================================
-- Эту миграцию применять ПОСЛЕДНЕЙ после всех предыдущих

-- Вставляем всех существующих пользователей из auth.users в profiles
-- Используем ON CONFLICT для избежания дублирования
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT
  u.id,
  -- Извлекаем full_name из метаданных или используем email как fallback
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    SPLIT_PART(u.email, '@', 1)
  ) as full_name,
  -- Маппинг ролей с сохранением Administrator
  CASE
    -- Старые роли (оставляем как есть или маппим)
    WHEN u.raw_user_meta_data->>'role' = 'Administrator' THEN 'Administrator'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'Engineer' THEN 'engineer'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'View-only' THEN 'manager'::user_role
    -- Новые роли (если уже есть)
    WHEN u.raw_user_meta_data->>'role' = 'moderator' THEN 'moderator'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'engineer' THEN 'engineer'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'manager' THEN 'manager'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'director' THEN 'director'::user_role
    -- Fallback по умолчанию
    ELSE 'engineer'::user_role
  END as role,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Обновляем статистику
SELECT
  COUNT(*) FILTER (WHERE p.id IS NOT NULL) as synced_users,
  COUNT(*) FILTER (WHERE p.id IS NULL) as not_synced
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

COMMENT ON TABLE public.profiles IS 'User profiles synced with auth.users. All existing users have been migrated.';

-- ========================================
-- ИТОГ: Синхронизация завершена
-- ========================================
-- Все существующие пользователи из auth.users перенесены в profiles
-- Проверьте результат на странице /admin/users
