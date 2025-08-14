# Инструкция по применению миграций

## Необходимые миграции

### 1. Создание таблицы location
**Файл**: `supabase/migrations/20250813201000_create_location_table.sql`

Эта миграция создает справочную таблицу:
- `location` - локализации (Россия, Китай, Местный и т.д.)

### 2. Создание таблицы cost_nodes
**Файл**: `supabase/migrations/20250813202000_create_cost_nodes_table.sql`

Создает основную таблицу для хранения структуры затрат:
- `cost_nodes` - иерархическая структура категорий и элементов затрат

### 3. Исправленная RPC функция для импорта затрат
**Файл**: `supabase/migrations/20250813203000_fix_import_costs_rpc.sql`

Создает исправленную функцию `import_costs_row` для импорта данных из Excel.
(Использует правильное имя таблицы `location` вместо `locations`)

## Как применить миграции

### Вариант 1: Через Supabase Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в раздел **SQL Editor**
4. Скопируйте содержимое файла миграции
5. Вставьте в редактор и нажмите **Run**

### Вариант 2: Через Supabase CLI

```bash
# Установите Supabase CLI если еще не установлен
npm install -g supabase

# Примените миграции
supabase db push
```

## Порядок применения

1. Примените ТОЛЬКО исправленную функцию: `20250813203000_fix_import_costs_rpc.sql`

**Примечание**: Таблицы `cost_nodes`, `location` и `units` уже существуют в БД, поэтому миграции для их создания не нужны.

## Проверка

После применения миграций проверьте:
1. Таблица `location` создана и содержит записи
2. Таблица `cost_nodes` создана
3. Функция `import_costs_row` создана

Можно проверить через SQL:
```sql
-- Проверка таблиц
SELECT COUNT(*) FROM location;
SELECT COUNT(*) FROM cost_nodes;

-- Проверка функции
SELECT proname FROM pg_proc WHERE proname = 'import_costs_row';

-- Проверка структуры таблицы cost_nodes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cost_nodes';
```