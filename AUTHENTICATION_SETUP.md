# 🔐 Настройка аутентификации и ролей в TenderHub

## 📋 Обзор

TenderHub использует систему аутентификации на основе **Supabase Auth** с **5-уровневой системой ролей**:

1. **Administrator** - Полный доступ ко всем страницам и функциям
2. **moderator** - Ограниченный доступ к управлению (без управления пользователями)
3. **engineer** - Доступ к расчетам и просмотру данных
4. **manager** - Доступ только к страницам анализа и финансовых показателей
5. **director** - Доступ только к странице согласований и аналитике

---

## 🚀 Быстрый старт: Пошаговая инструкция

### Шаг 1: Применение миграций в Supabase

Откройте **Supabase Dashboard** → **SQL Editor** → **New query**

https://supabase.com/dashboard/project/lkmgbizyyaaacetllbzr/sql/new

Применяйте миграции **строго в указанном порядке**:

#### 1️⃣ Базовая структура (ENUM + таблица profiles)
```sql
-- Файл: supabase/migrations/20251010_00_create_user_roles_foundation.sql
```
Скопируйте содержимое файла, вставьте в SQL Editor и нажмите **Run** (или F5)

**Что создается**:
- ENUM тип `user_role` с 5 ролями
- Таблица `public.profiles` с полями id, full_name, role, created_at, updated_at
- Индексы для оптимизации
- Триггер автообновления updated_at
- Права доступа

#### 2️⃣ Функция изменения ролей
```sql
-- Файл: supabase/migrations/20251010_01_create_update_role_function.sql
```
**Что создается**:
- Функция `update_user_role(p_user_id, p_new_role)` для изменения ролей

#### 3️⃣ Триггер автосоздания профилей
```sql
-- Файл: supabase/migrations/20251010_update_profile_trigger.sql
```
**Что создается**:
- Триггер `on_auth_user_created` - автоматически создает профиль при регистрации
- Функция `create_profile_for_user()` - извлекает данные из user_metadata

#### 4️⃣ Функция получения всех пользователей
```sql
-- Файл: supabase/migrations/20251010_create_get_all_users_function.sql
```
**Что создается**:
- Функция `get_all_users()` - возвращает таблицу пользователей с объединенными данными из profiles и auth.users

#### 5️⃣ Синхронизация существующих пользователей
```sql
-- Файл: supabase/migrations/20251010_sync_existing_users.sql
```
**Что делает**:
- Переносит всех существующих пользователей из `auth.users` в `profiles`
- Маппит старые роли на новые (Administrator → Administrator, Engineer → engineer, View-only → manager)
- Выводит статистику синхронизации

---

### Шаг 2: Настройка Email подтверждения в Supabase

#### Вариант A: Отключить подтверждение (для разработки) ✅ Рекомендуется

1. Откройте **Supabase Dashboard** → **Authentication** → **Providers**
2. Найдите **Email** провайдер
3. В секции **Email confirmation** выберите **Disable email confirmation**
4. Нажмите **Save**

**Результат**: Новые пользователи создаются мгновенно без подтверждения email

#### Вариант B: Настроить email шаблоны (для продакшена)

1. Откройте **Authentication** → **Email Templates**
2. Настройте шаблон **Confirm signup**
3. Укажите правильный **Site URL** (например, `https://yourdomain.com`)
4. Customize confirmation email text
5. Нажмите **Save**

**Результат**: Пользователи получают email с подтверждением регистрации

---

### Шаг 3: Проверка RLS (Row Level Security)

⚠️ **ВАЖНО**: По дизайну TenderHub, RLS должен быть **ОТКЛЮЧЕН**

1. Откройте **Database** → **Tables** → **profiles**
2. Убедитесь что **Enable RLS** = **OFF**
3. Если RLS включен - выключите его

**Причина**: Приложение контролирует доступ на уровне приложения через систему ролей в `permissions.ts`

---

### Шаг 4: Тестирование

#### Проверка существующих пользователей

1. Откройте приложение: http://localhost:5174/admin/users
2. Вы должны увидеть всех пользователей из `auth.users`
3. Проверьте что роли правильно назначены

#### Создание нового пользователя

1. На странице `/admin/users` нажмите **"Добавить пользователя"**
2. Заполните форму:
   - Email: `test@example.com`
   - Пароль: минимум 6 символов
   - ФИО: `Тестовый Пользователь`
   - Роль: выберите любую
3. Нажмите **"Создать"**
4. Пользователь должен появиться в таблице

#### Изменение роли

1. В таблице пользователей найдите пользователя
2. В колонке **"Роль"** выберите новую роль из выпадающего списка
3. Роль изменится мгновенно
4. Должно появиться уведомление об успешном изменении

#### Проверка прав доступа

1. Войдите под пользователем с ролью **engineer**
2. Попробуйте открыть `/admin/users` - должен быть доступ ЗАПРЕЩЕН
3. Откройте `/libraries/materials-works` - должен быть доступ РАЗРЕШЕН

---

## 📊 Матрица прав доступа

### Страницы

| Страница | Administrator | moderator | engineer | manager | director |
|----------|--------------|-----------|----------|---------|----------|
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/boq` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/tenders` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/commercial-costs` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/cost-redistribution` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/financial-indicators` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/libraries/*` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/construction-costs/*` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/admin/users` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/nomenclatures` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/admin/settings` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/approvals` | ✅ | ❌ | ❌ | ❌ | ✅ |

### Действия

| Действие | Administrator | moderator | engineer | manager | director |
|----------|--------------|-----------|----------|---------|----------|
| Создавать тендеры | ✅ | ✅ | ✅ | ❌ | ❌ |
| Редактировать тендеры | ✅ | ✅ | ✅ | ❌ | ❌ |
| Удалять тендеры | ✅ | ✅ | ❌ | ❌ | ❌ |
| Создавать BOQ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Управлять материалами | ✅ | ✅ | ✅ | ❌ | ❌ |
| Управлять работами | ✅ | ✅ | ✅ | ❌ | ❌ |
| Редактировать коммерческие затраты | ✅ | ✅ | ✅ | ❌ | ❌ |
| Просмотр финансовых показателей | ✅ | ✅ | ✅ | ✅ | ✅ |
| Согласование тендеров | ✅ | ❌ | ❌ | ❌ | ✅ |
| Управление пользователями | ✅ | ❌ | ❌ | ❌ | ❌ |
| Управление настройками | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🗂️ Структура базы данных

### Таблица `public.profiles`

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'engineer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### ENUM `user_role`

```sql
CREATE TYPE user_role AS ENUM (
  'Administrator',
  'moderator',
  'engineer',
  'manager',
  'director'
);
```

---

## 🔧 Функции API

### Создание пользователя (frontend)

```typescript
import { createUser } from '@/lib/supabase/api/users';

const { data, error } = await createUser(
  'user@example.com',
  'password123',
  'Иванов Иван Иванович',
  'engineer'
);
```

Использует `supabase.auth.signUp()` с метаданными

### Получение всех пользователей

```typescript
import { getAllUsers } from '@/lib/supabase/api/users';

const { data, error } = await getAllUsers();
```

Использует RPC функцию `get_all_users()`

### Изменение роли

```typescript
import { updateUserRole } from '@/lib/supabase/api/users';

const { data, error } = await updateUserRole(userId, 'moderator');
```

Использует RPC функцию `update_user_role(p_user_id, p_new_role)`

### Удаление пользователя

```typescript
import { deleteUser } from '@/lib/supabase/api/users';

const { error } = await deleteUser(userId);
```

⚠️ Требует admin привилегий, сейчас не работает через anon ключ

---

## ⚠️ Известные проблемы и решения

### Проблема 1: Не удается создать пользователя (403 Forbidden)

**Причина**: Попытка использовать `supabase.auth.admin.createUser()` с anon ключом

**Решение**: Используется обычный `signUp()` вместо admin API

### Проблема 2: Пользователи не появляются на странице

**Причина**: Миграция синхронизации не применена или таблица profiles пустая

**Решение**: Применить миграцию `20251010_sync_existing_users.sql`

### Проблема 3: Ошибка "user_role does not exist"

**Причина**: Базовая миграция не применена

**Решение**: Применить `20251010_00_create_user_roles_foundation.sql` ПЕРВОЙ

### Проблема 4: Не удается удалить пользователя

**Причина**: `supabase.auth.admin.deleteUser()` требует service_role ключ

**Решение**: Либо использовать service_role ключ на backend, либо создать RPC функцию с SECURITY DEFINER

---

## 📝 Checklist после настройки

- [ ] Применены все 5 миграций в правильном порядке
- [ ] Email подтверждение настроено (отключено для dev или настроены templates для prod)
- [ ] RLS отключен для таблицы profiles
- [ ] Проверена страница `/admin/users` - видны все пользователи
- [ ] Создан тестовый пользователь через UI
- [ ] Изменена роль тестового пользователя
- [ ] Проверены права доступа к разным страницам
- [ ] CLAUDE.md обновлен (Authentication: Enabled)
- [ ] Проверена матрица прав доступа для разных ролей

---

## 🎯 Дополнительные настройки (опционально)

### Настройка Session Timeout

1. **Authentication** → **Settings**
2. **JWT expiry** - время жизни токена (по умолчанию 3600 секунд = 1 час)
3. **Refresh token rotation** - автоматическое обновление токенов

### Настройка Password Requirements

1. **Authentication** → **Policies**
2. **Minimum password length** - минимум 6 символов (по умолчанию)
3. **Password strength** - можно включить проверку сложности пароля

### Включение Multi-Factor Authentication (MFA)

1. **Authentication** → **Settings** → **Multi-Factor Authentication**
2. Включить **TOTP** (Time-based One-Time Password)
3. Обновить UI для поддержки MFA

---

## 📚 Дополнительные ресурсы

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Managing User Roles](https://supabase.com/docs/guides/auth/managing-user-data)

---

## 💬 Поддержка

При возникновении проблем:
1. Проверьте Supabase Dashboard → Logs
2. Проверьте Browser Console (F12)
3. Проверьте Network tab для ошибок API
4. Убедитесь что все миграции применены в правильном порядке
