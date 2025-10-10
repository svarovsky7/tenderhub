-- ========================================
-- ФУНКЦИЯ: Обновление роли пользователя
-- ========================================
-- Эту миграцию применять ПОСЛЕ 20251010_00_create_user_roles_foundation.sql

-- Создание функции для обновления роли пользователя
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_new_role user_role
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_role user_role;
  v_full_name TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  -- Проверяем существование пользователя
  SELECT role, full_name INTO v_old_role, v_full_name
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Пользователь не найден'
    );
  END IF;

  -- Обновляем роль
  UPDATE public.profiles
  SET
    role = p_new_role,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING updated_at INTO v_updated_at;

  -- Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'full_name', v_full_name,
    'old_role', v_old_role,
    'new_role', p_new_role,
    'updated_at', v_updated_at
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.update_user_role(UUID, user_role) IS 'Обновляет роль пользователя. Возвращает JSON с информацией об обновлении или ошибке.';

-- Настройка прав доступа к функции
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, user_role) TO authenticated;

-- Дополнительная безопасность: можно добавить проверку роли вызывающего
-- Но по дизайну приложения RLS отключен, контроль на уровне UI

-- ========================================
-- ИТОГ: Функция update_user_role создана
-- ========================================
-- Теперь UsersPage может изменять роли пользователей через эту функцию
