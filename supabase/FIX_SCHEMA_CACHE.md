# Исправление ошибки "Could not find the 'material_quantity_per_work' column"

## Проблема
Supabase PostgREST кэширует схему БД и не видит колонку `material_quantity_per_work` в таблице `work_material_links`, хотя она существует.

## Решение

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Нажмите кнопку **Restart Server**
5. Подождите 30-60 секунд пока сервер перезапустится

### Вариант 2: Через SQL Editor

1. Откройте SQL Editor в Supabase Dashboard
2. Выполните следующие команды:

```sql
-- Обновить кэш схемы
NOTIFY pgrst, 'reload schema';

-- Проверить что колонка существует
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_material_links' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Вариант 3: Пересоздать представления

Если предыдущие варианты не помогли, выполните в SQL Editor:

```sql
-- Удалить и пересоздать представления
DROP VIEW IF EXISTS work_material_links_detailed CASCADE;

-- Пересоздать представление
CREATE VIEW work_material_links_detailed AS
SELECT 
    wml.*,
    w.description as work_description,
    w.quantity as work_quantity,
    w.unit as work_unit,
    m.description as material_description,
    m.quantity as material_quantity,
    m.unit as material_unit,
    m.unit_rate as material_unit_rate
FROM public.work_material_links wml
JOIN public.boq_items w ON w.id = wml.work_boq_item_id
JOIN public.boq_items m ON m.id = wml.material_boq_item_id;

-- Дать права
GRANT SELECT ON work_material_links_detailed TO authenticated;
GRANT SELECT ON work_material_links_detailed TO anon;

-- Обновить кэш
NOTIFY pgrst, 'reload schema';
```

### Вариант 4: Проверка прав доступа

Убедитесь что у anon и authenticated роли есть права на чтение:

```sql
-- Проверить права
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'work_material_links';

-- Дать права если их нет
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_material_links TO authenticated;
GRANT SELECT ON public.work_material_links TO anon;
```

## После исправления

1. Обновите страницу в браузере (Ctrl+F5)
2. Попробуйте снова связать материал с работой
3. Если ошибка повторяется, подождите 1-2 минуты и попробуйте снова

## Проверка

Чтобы убедиться что все работает, выполните в SQL Editor:

```sql
-- Тестовая вставка
INSERT INTO work_material_links (
    client_position_id,
    work_boq_item_id,
    material_boq_item_id,
    material_quantity_per_work,
    usage_coefficient
) VALUES (
    (SELECT id FROM client_positions LIMIT 1),
    (SELECT id FROM boq_items WHERE item_type = 'work' LIMIT 1),
    (SELECT id FROM boq_items WHERE item_type = 'material' LIMIT 1),
    1.5,
    2.0
) ON CONFLICT DO NOTHING;

-- Если вставка прошла успешно, удалите тестовую запись
DELETE FROM work_material_links 
WHERE created_at > NOW() - INTERVAL '1 minute';
```

## Если ничего не помогает

1. Проверьте логи в Supabase Dashboard → **Logs** → **API logs**
2. Убедитесь что используете правильные ключи API (anon key)
3. Проверьте что RLS отключен: `ALTER TABLE work_material_links DISABLE ROW LEVEL SECURITY;`
4. Обратитесь в поддержку Supabase с описанием проблемы