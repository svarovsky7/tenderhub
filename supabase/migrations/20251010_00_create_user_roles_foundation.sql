-- ========================================
-- БАЗОВАЯ МИГРАЦИЯ: Создание системы ролей и профилей пользователей
-- ========================================
-- Эту миграцию нужно применить ПЕРВОЙ перед всеми остальными миграциями пользователей

-- 1. Создание ENUM типа для ролей пользователей
-- ========================================
-- Проверяем существование типа перед созданием
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'Administrator',  -- Полный доступ ко всем страницам и функциям
      'moderator',      -- Ограниченный доступ к управлению (без управления пользователями)
      'engineer',       -- Доступ к расчетам и просмотру данных
      'manager',        -- Доступ только к страницам анализа и финансовых показателей
      'director'        -- Доступ только к странице согласований и аналитике
    );
  ELSE
    -- Если тип уже существует, добавляем недостающие значения
    -- Проверяем каждую роль и добавляем если её нет
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Administrator';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'engineer';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'director';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMENT ON TYPE user_role IS 'Роли пользователей системы: Administrator (полный доступ), moderator (управление), engineer (расчеты), manager (аналитика), director (согласования)';

-- 2. Создание таблицы профилей пользователей
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Уникальный идентификатор (соответствует auth.users.id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Полное имя пользователя
  full_name TEXT NOT NULL,

  -- Роль пользователя (по умолчанию - engineer)
  role user_role NOT NULL DEFAULT 'engineer',

  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Дополнительные ограничения
  CONSTRAINT full_name_not_empty CHECK (length(trim(full_name)) > 0)
);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.profiles IS 'Профили пользователей с расширенной информацией и ролями';
COMMENT ON COLUMN public.profiles.id IS 'UUID пользователя из auth.users';
COMMENT ON COLUMN public.profiles.full_name IS 'Полное имя пользователя (Фамилия Имя Отчество)';
COMMENT ON COLUMN public.profiles.role IS 'Роль пользователя в системе';
COMMENT ON COLUMN public.profiles.created_at IS 'Дата создания профиля';
COMMENT ON COLUMN public.profiles.updated_at IS 'Дата последнего обновления профиля';

-- 3. Создание индексов для оптимизации запросов
-- ========================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

COMMENT ON INDEX idx_profiles_role IS 'Индекс для быстрого поиска пользователей по роли';
COMMENT ON INDEX idx_profiles_created_at IS 'Индекс для сортировки пользователей по дате создания';
COMMENT ON INDEX idx_profiles_full_name IS 'Индекс для поиска пользователей по имени';

-- 4. Создание функции для автоматического обновления updated_at
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at() IS 'Автоматически обновляет поле updated_at при изменении записи';

-- 5. Создание триггера для updated_at
-- ========================================
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TRIGGER set_updated_at ON public.profiles IS 'Триггер для автоматического обновления поля updated_at';

-- 6. Настройка прав доступа
-- ========================================
-- Разрешаем чтение профилей для аутентифицированных пользователей
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Разрешаем вставку профилей (для триггера создания)
GRANT INSERT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;

-- Разрешаем обновление профилей (для изменения ролей админами)
GRANT UPDATE ON public.profiles TO authenticated;

COMMENT ON TABLE public.profiles IS 'Профили пользователей. RLS отключен по дизайну приложения. Доступ контролируется на уровне приложения.';

-- ========================================
-- ИТОГ: Базовая структура создана
-- ========================================
-- После применения этой миграции можно применять:
-- 1. 20251010_01_create_update_role_function.sql
-- 2. 20251010_update_profile_trigger.sql
-- 3. 20251010_create_get_all_users_function.sql
-- 4. 20251010_sync_existing_users.sql
