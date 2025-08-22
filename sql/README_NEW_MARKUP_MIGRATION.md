# Миграция на новую структуру накруток

## Обзор изменений

Система накруток тендера была полностью переработана с переходом от 10 старых типов накруток к 11 новым согласно требованиям:

### Старая структура (удалена):
1. profit_margin - Общая рентабельность
2. materials_markup - Накрутка на материалы
3. works_markup - Накрутка на работы
4. submaterials_markup - Накрутка на субматериалы
5. subworks_markup - Накрутка на субработы
6. overhead_percentage - Накладные расходы
7. contingency_percentage - Непредвиденные расходы
8. risk_adjustment - Поправка на риски
9. tax_percentage - НДС и налоги
10. insurance_percentage - Страхование

### Новая структура (реализована):
1. **works_16_markup** - Работы 1,6 (коэффициент)
2. **works_cost_growth** - Рост Стоимости Работ (%)
3. **materials_cost_growth** - Рост стоимости Материалов (%)
4. **subcontract_works_cost_growth** - Рост стоимости Работ субподряда (%)
5. **subcontract_materials_cost_growth** - Рост стоимости Материалов Субподряда (%)
6. **contingency_costs** - Непредвиденные затраты (%)
7. **overhead_own_forces** - ООЗ собств. силы (%)
8. **overhead_subcontract** - ООЗ Субподряд (%)
9. **general_costs_without_subcontract** - ОФЗ (Без субподряда) (%)
10. **profit_own_forces** - Прибыль собств. силы (%)
11. **profit_subcontract** - Прибыль Субподряд (%)

## Шаги миграции

### 1. Создание новой таблицы
Выполните в Supabase Dashboard > SQL Editor:
```sql
-- Загрузите и выполните файл:
sql/CREATE_NEW_MARKUP_TABLE.sql
```

### 2. Тестирование
- Перезапустите приложение: `npm run dev`
- Протестируйте работу с новыми накрутками
- Убедитесь, что расчеты работают корректно

### 3. Применение изменений (только после тестирования)
```sql
-- Загрузите и выполните файл:
sql/MIGRATE_TO_NEW_MARKUP_STRUCTURE.sql
```

## Изменения в коде

### TypeScript типы
- `src/lib/supabase/types/tender-markup.ts` - обновлены все интерфейсы

### API функции
- `src/lib/supabase/api/tender-markup.ts` - полностью переписана функция `calculateMarkupFinancials`

### UI компоненты
- `src/components/financial/MarkupEditor.tsx` - новые поля формы с новой логикой расчетов
- `src/pages/FinancialIndicatorsPage.tsx` - обновлена интеграция

## Новая логика расчетов

1. **Коэффициент работ**: `worksWithCoeff = works * works_16_markup`
2. **Применение роста**: материалы и работы умножаются на соответствующие проценты роста
3. **Разделение по типам**: собственные силы vs субподряд для раздельного расчета ООЗ и прибыли
4. **Поэтапные расчеты**: непредвиденные → ООЗ → ОФЗ → прибыль

## Значения по умолчанию

- works_16_markup: 1.6
- works_cost_growth: 5.00%
- materials_cost_growth: 3.00%
- subcontract_works_cost_growth: 7.00%
- subcontract_materials_cost_growth: 4.00%
- contingency_costs: 2.00%
- overhead_own_forces: 8.00%
- overhead_subcontract: 6.00%
- general_costs_without_subcontract: 5.00%
- profit_own_forces: 12.00%
- profit_subcontract: 8.00%

## Откат изменений (при необходимости)

Если нужно вернуться к старой структуре:

```sql
-- Восстановление старой таблицы
DROP TABLE public.tender_markup_percentages;
ALTER TABLE public.tender_markup_percentages_backup RENAME TO tender_markup_percentages;

-- Восстановление индексов и ограничений
-- (См. исходные файлы CREATE_MARKUP_TABLE.sql)
```

## Проверка статуса

После выполнения миграции проверьте:

```sql
SELECT COUNT(*) FROM public.tender_markup_percentages;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tender_markup_percentages' 
ORDER BY ordinal_position;
```