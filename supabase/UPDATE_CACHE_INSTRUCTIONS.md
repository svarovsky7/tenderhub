# 🔴 КАК ОБНОВИТЬ КЭШ СХЕМЫ В SUPABASE

## Проблема
PostgREST (API слой Supabase) кэширует схему базы данных и не видит новые колонки.

## РЕШЕНИЕ (выполните по порядку):

### ШАГ 1: Выполните SQL для добавления колонок
```sql
-- Скопируйте и выполните содержимое файла:
-- supabase/migrations/add_missing_columns.sql
```

### ШАГ 2: Перезапустите PostgREST сервер

#### Способ A: Через Dashboard (РЕКОМЕНДУЕТСЯ) ✅
1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Слева в меню выберите **Settings** (Настройки)
4. Выберите вкладку **API**
5. Найдите секцию **Service Status**
6. Нажмите кнопку **Restart Server** (Перезапустить сервер)
7. Подождите 30-60 секунд

#### Способ B: Через SQL (если способ A не помог)
```sql
-- Выполните в SQL Editor:

-- 1. Обновляем комментарий таблицы (это форсирует обновление)
COMMENT ON TABLE public.work_material_links IS 
'Связи между работами и материалами. Обновлено: ' || NOW()::text;

-- 2. Отправляем сигнал на перезагрузку
NOTIFY pgrst, 'reload schema';

-- 3. Пересоздаем права (радикальный способ)
REVOKE ALL ON public.work_material_links FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_material_links TO authenticated;
```

### ШАГ 3: Проверка
После перезапуска выполните в SQL Editor:
```sql
-- Тестовая вставка
INSERT INTO work_material_links (
    client_position_id,
    work_boq_item_id,
    material_boq_item_id,
    material_quantity_per_work,
    usage_coefficient
) 
SELECT 
    cp.id,
    w.id,
    m.id,
    1.5,
    2.0
FROM client_positions cp
CROSS JOIN LATERAL (
    SELECT id FROM boq_items WHERE item_type = 'work' AND client_position_id = cp.id LIMIT 1
) w
CROSS JOIN LATERAL (
    SELECT id FROM boq_items WHERE item_type = 'material' AND client_position_id = cp.id LIMIT 1
) m
LIMIT 1
ON CONFLICT (work_boq_item_id, material_boq_item_id) DO NOTHING;

-- Если вставка прошла успешно, значит все работает!
```

### ШАГ 4: В браузере
1. Полностью обновите страницу: **Ctrl + F5** (или Cmd + Shift + R на Mac)
2. Попробуйте связать материал с работой

## Если все еще не работает:

### Экстренные меры:
1. **Подождите 2-3 минуты** - иногда кэш обновляется не сразу
2. **Откройте новую вкладку инкогнито** - чтобы исключить кэш браузера
3. **Проверьте логи**:
   - Supabase Dashboard → Logs → API logs
   - Посмотрите есть ли ошибки при вызове API

### Последний вариант:
Если ничего не помогает, возможно нужно:
1. Остановить локальный dev сервер (Ctrl+C)
2. Очистить кэш npm: `npm cache clean --force`
3. Перезапустить: `npm run dev`

## Контакты поддержки:
Если проблема не решается:
- Supabase Discord: https://discord.supabase.com
- Supabase Support: support@supabase.io

---

⚠️ **ВАЖНО**: После обновления схемы ВСЕГДА нужно перезапускать PostgREST сервер!