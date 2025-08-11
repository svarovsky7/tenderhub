# Миграция: Удаление неиспользуемых коэффициентов

## Описание
Удаление полей `material_quantity_per_work` и `usage_coefficient` из системы, так как они везде имеют значение 1.0 и не используются в расчетах.

## Изменения в базе данных

### 1. Проверка данных
Перед миграцией выполните SQL запрос из файла `supabase/migrations/20250111_check_usage_fields.sql` чтобы убедиться, что все значения равны 1.

### 2. Применение миграции
Выполните миграцию из файла `supabase/migrations/20250111_remove_unused_coefficients.sql` в Supabase Dashboard.

Миграция выполняет:
- Обновление view `work_material_links_detailed` 
- Обновление функций `get_materials_for_work` и `get_works_using_material`
- Удаление столбцов из таблицы `work_material_links`

## Изменения в коде

### Обновленные файлы:
1. **src/lib/supabase/api/work-material-links.ts**
   - Удалены поля из интерфейсов
   - Убрано использование в createLink и updateLink

2. **src/utils/materialCalculations.ts**
   - Упрощена функция `calculateMaterialVolume`
   - Удален параметр `usageCoefficient`

3. **src/components/tender/TenderBOQManagerNew.tsx**
   - Обновлены вызовы `calculateMaterialVolume`
   - Убраны параметры при создании связей

4. **src/lib/supabase/types/database/**
   - tables.ts - обновлены типы для work_material_links
   - views.ts - обновлены типы для work_material_links_detailed

## Новая формула расчета

### Было:
```
объем = work.quantity × material_quantity_per_work × usage_coefficient × consumption_coefficient × conversion_coefficient
```

### Стало:
```
объем = work.quantity × consumption_coefficient × conversion_coefficient
```

## Проверка
После применения миграции:
1. Проверьте создание новых связей работа-материал
2. Убедитесь что расчеты объемов корректны
3. Проверьте отображение в интерфейсе

## Откат (если необходимо)
Для отката нужно:
1. Восстановить столбцы в БД со значениями по умолчанию 1.0
2. Откатить изменения кода через git