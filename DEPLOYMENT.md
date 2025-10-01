# TenderHub - Инструкция по развертыванию тестовой среды

Эта инструкция поможет развернуть публично доступную тестовую версию TenderHub для тестировщиков.

## Архитектура

- **Production:** `localhost:5173` → Production Supabase БД (разработка)
- **Test:** `https://tenderhub.vercel.app` → Test Supabase БД (тестирование)

**Важно:** Test и Production полностью изолированы - изменения в одной среде не влияют на другую.

---

## Шаг 1: Создание тестового Supabase проекта

### 1.1 Создать новый проект

1. Открыть https://supabase.com/dashboard
2. Нажать кнопку **"New Project"**
3. Заполнить форму:
   - **Name:** `TenderHub Test`
   - **Database Password:** придумать и сохранить надежный пароль
   - **Region:** выбрать ближайший регион (например, `Frankfurt` или `Singapore`)
   - **Pricing Plan:** `Free` (достаточно для тестирования)
4. Нажать **"Create new project"**
5. Подождать ~2 минуты пока проект создается

### 1.2 Скопировать схему базы данных

1. В новом проекте открыть **SQL Editor** (слева в меню)
2. Открыть файл `supabase/schemas/prod.sql` из этого репозитория
3. Скопировать **всё содержимое** файла
4. Вставить в SQL Editor в Supabase
5. Нажать **"Run"** (или `Ctrl+Enter`)
6. Дождаться выполнения (может занять 10-30 секунд)
7. Проверить что таблицы созданы: открыть **Table Editor** → должны появиться все таблицы

### 1.3 Получить credentials

1. Открыть **Settings** → **API**
2. Скопировать и сохранить:
   - **Project URL** (например: `https://abcdefgh.supabase.co`)
   - **Project API keys** → **anon/public** (длинный JWT токен начинается с `eyJ...`)

**Важно:** Сохраните эти значения - они понадобятся для Vercel!

---

## Шаг 2: Развертывание на Vercel

### 2.1 Регистрация и подключение GitHub

1. Открыть https://vercel.com
2. Нажать **"Sign Up"** (или **"Log In"** если уже есть аккаунт)
3. Выбрать **"Continue with GitHub"**
4. Авторизовать Vercel для доступа к репозиториям

### 2.2 Импорт проекта

1. На главной странице Vercel нажать **"Add New"** → **"Project"**
2. Найти репозиторий **`tenderhub`** в списке
3. Нажать **"Import"**

### 2.3 Настройка проекта

1. **Framework Preset:** должно автоматически определиться как `Vite`
2. **Root Directory:** оставить `./` (корень проекта)
3. **Build Command:** `npm run build` (уже настроено по умолчанию)
4. **Output Directory:** `dist` (уже настроено по умолчанию)

### 2.4 Добавление Environment Variables

В разделе **"Environment Variables"** добавить следующие переменные:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Project URL из Шага 1.3 |
| `VITE_SUPABASE_ANON_KEY` | Anon key из Шага 1.3 |
| `VITE_APP_NAME` | `TenderHub Test` |
| `VITE_APP_VERSION` | `0.0.0` |

**Как добавить:**
1. Нажать **"Add"** или **"New"**
2. Ввести Name и Value
3. Убедиться что выбрано **"Production"** (можно выбрать также Preview и Development)
4. Повторить для всех 4 переменных

### 2.5 Деплой

1. Нажать **"Deploy"**
2. Дождаться завершения build и деплоя (~2-5 минут)
3. После успешного деплоя появится ссылка (например: `https://tenderhub.vercel.app`)

---

## Шаг 3: Проверка

### 3.1 Проверить работу приложения

1. Открыть полученную Vercel URL
2. Должна открыться главная страница TenderHub
3. Создать новый тендер
4. Добавить несколько позиций
5. Убедиться что всё работает

### 3.2 Проверить что данные в test БД

1. Открыть Supabase Dashboard → Test проект
2. Открыть **Table Editor** → **tenders**
3. Убедиться что созданный тендер появился в таблице
4. Открыть **Table Editor** → **client_positions**
5. Убедиться что позиции появились

### 3.3 Проверить изоляцию от production

1. Открыть localhost:5173 (ваша локальная версия)
2. Убедиться что **НЕТ** тестовых данных из шага 3.1
3. Открыть Supabase Dashboard → Production проект
4. Убедиться что **НЕТ** тестовых данных

✅ Если тестовые данные есть только в test проекте - всё настроено правильно!

---

## Шаг 4: Передача тестировщикам

### 4.1 Отправить ссылку

Отправить тестировщикам:
- **URL:** `https://tenderhub.vercel.app` (ваша ссылка из Vercel)
- **Инструкция:** "Просто открой ссылку в браузере и работай как обычно"

### 4.2 Что могут делать тестировщики

- ✅ Открывать в любом браузере (Chrome, Firefox, Safari, Edge)
- ✅ Работать одновременно несколько человек
- ✅ Создавать тендеры, позиции, вносить изменения
- ✅ Импортировать/экспортировать Excel
- ✅ Использовать все функции приложения

### 4.3 Что НЕ нужно тестировщикам

- ❌ Устанавливать Node.js
- ❌ Клонировать репозиторий
- ❌ Настраивать окружение
- ❌ Иметь доступ к Supabase
- ❌ Запускать команды в терминале

---

## Автоматическое обновление

### Как работает

После настройки Vercel автоматически:
1. Отслеживает изменения в GitHub репозитории
2. При каждом `git push origin main` запускает новый деплой
3. Обновляет test версию (~2-5 минут)

### Процесс обновления

```bash
# 1. Внести изменения в код
git add .
git commit -m "🔧 Исправление бага X"

# 2. Запушить в GitHub
git push origin main

# 3. Vercel автоматически задеплоит
# 4. Тестировщики увидят обновления (~5 минут)
```

### Отслеживание деплоев

1. Открыть https://vercel.com/dashboard
2. Выбрать проект **tenderhub**
3. Видеть историю деплоев, логи, статус

---

## Управление test средой

### Просмотр логов

**Vercel:**
- Dashboard → Проект → Deployments → выбрать деплой → Function Logs

**Supabase:**
- Dashboard → Test проект → Logs → выбрать тип логов

### Очистка test данных

**Вариант 1: Удалить все данные (схема остается)**
```sql
-- Выполнить в SQL Editor test проекта
TRUNCATE TABLE boq_items CASCADE;
TRUNCATE TABLE client_positions CASCADE;
TRUNCATE TABLE tenders CASCADE;
TRUNCATE TABLE materials_library CASCADE;
TRUNCATE TABLE works_library CASCADE;
TRUNCATE TABLE work_material_links CASCADE;
-- и т.д. для всех таблиц
```

**Вариант 2: Пересоздать схему**
1. SQL Editor → `DROP SCHEMA public CASCADE;`
2. SQL Editor → `CREATE SCHEMA public;`
3. Заново выполнить `prod.sql`

**Вариант 3: Удалить весь test проект**
1. Settings → General
2. Scroll вниз → **Delete Project**
3. Подтвердить удаление
4. Создать новый проект (повторить Шаг 1)

### Обновление схемы БД

Если изменилась структура БД в production:

```bash
# 1. Экспортировать актуальную схему
npm run db:schema

# 2. Открыть SQL Editor в test проекте

# 3. Выполнить новую схему или миграцию
# (можно удалить таблицы и пересоздать, или выполнить ALTER)
```

---

## Troubleshooting

### Проблема: Build failed на Vercel

**Решение:**
1. Проверить логи в Vercel Dashboard → Deployments → Failed → View Logs
2. Убедиться что все зависимости установлены
3. Проверить что `npm run build` работает локально
4. Проверить что все environment variables добавлены

### Проблема: Приложение открывается, но ошибки при работе с БД

**Решение:**
1. Проверить что environment variables правильные:
   - VITE_SUPABASE_URL точно совпадает с Project URL
   - VITE_SUPABASE_ANON_KEY точно совпадает с anon key
2. Проверить что схема БД создана (Table Editor должен показывать таблицы)
3. Проверить логи в Supabase → Logs → API

### Проблема: Изменения в коде не появляются на test версии

**Решение:**
1. Убедиться что изменения закоммичены: `git status`
2. Убедиться что изменения запушены: `git push origin main`
3. Проверить статус деплоя в Vercel Dashboard
4. Очистить кеш браузера (`Ctrl+F5` или `Cmd+Shift+R`)

### Проблема: Тестовые данные появляются в production

**Решение:**
1. ❗ **КРИТИЧНО:** Это значит что test использует production БД!
2. Проверить environment variables в Vercel
3. Убедиться что используется test Supabase URL, а не production
4. Пересоздать environment variables с правильными значениями
5. Redeploy на Vercel

---

## Безопасность

### ✅ Что безопасно

- Anon key в environment variables (это публичный ключ)
- Публичный Vercel URL (доступен всем)
- RLS отключен в Supabase (по дизайну проекта)

### ⚠️ Что НЕ делать

- ❌ НЕ коммитить `.env.production` в Git
- ❌ НЕ использовать production credentials в test среде
- ❌ НЕ давать тестировщикам доступ к Supabase Dashboard
- ❌ НЕ использовать Service Role Key (только Anon Key)

---

## Дополнительные возможности

### Custom Domain

Можно добавить свой домен вместо `tenderhub.vercel.app`:

1. Vercel Dashboard → Проект → Settings → Domains
2. Добавить домен (например: `test.tenderhub.com`)
3. Настроить DNS записи у регистратора домена
4. Vercel автоматически выпустит SSL сертификат

### Multiple Environments

Можно создать несколько сред:

- `main` ветка → `https://tenderhub.vercel.app` (test)
- `staging` ветка → `https://tenderhub-staging.vercel.app` (staging)
- `production` ветка → `https://tenderhub-prod.vercel.app` (production)

Каждая ветка может использовать свою Supabase БД.

### Preview Deployments

Vercel автоматически создает preview deployment для каждого Pull Request:
- Открыть PR на GitHub
- Vercel создаст временный URL для просмотра изменений
- После мержа PR - изменения попадут в main deployment

---

## Полезные ссылки

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs

---

## Контакты

При возникновении проблем:
1. Проверить раздел Troubleshooting в этой инструкции
2. Проверить логи в Vercel и Supabase
3. Обратиться к разработчику

**Дата создания:** 2025-01-10
**Версия:** 1.0
