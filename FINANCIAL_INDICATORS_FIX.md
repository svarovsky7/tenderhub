# Исправление расчета базовых затрат в финансовых показателях

## Проблема
На странице "Финансовые показатели" в блоке "Базовые затраты" отображались неверные стоимости из BOQ из-за следующих ошибок:

### Найденные проблемы:
1. **Неправильная типизация элементов BOQ**: Код не учитывал все типы (`work`, `material`, `sub_work`, `sub_material`)
2. **Дублирование субматериалов и субработ**: Добавлялись проценты от всех позиций, вместо реальных данных
3. **Неправильная обработка доставки**: Доставка добавлялась отдельно, хотя уже включена в `total_amount`
4. **Отсутствие валидации**: Некорректные данные могли привести к ошибкам

## Внесенные исправления

### 1. Корректная группировка по типам BOQ элементов
```typescript
// Старый код (неправильный)
if (itemType === 'material') {
  totalMaterials += totalItemAmount;
  totalMaterials += (item.delivery_amount || 0); // Дублирование!
} else if (itemType === 'work') {
  totalWorks += totalItemAmount;
} else {
  // Игнорировались sub_material и sub_work
}

// Новый код (правильный)
switch (itemType) {
  case 'material':
    totalMaterials += totalItemAmount;
    break;
  case 'work':
    totalWorks += totalItemAmount;
    break;
  case 'sub_material':
    totalSubmaterials += totalItemAmount;
    break;
  case 'sub_work':
    totalSubworks += totalItemAmount;
    break;
}
```

### 2. Оптимизированные запросы к базе данных
- **Добавлена RPC функция** `get_tender_costs_by_type()` для эффективной агрегации
- **Fallback логика** при недоступности RPC
- **Ограничение полей** в запросах для улучшения производительности

### 3. Валидация и обработка ошибок
```typescript
// Валидация результатов
if (totalCost < 0 || isNaN(totalCost)) {
  throw new Error('Некорректные данные расчета стоимости');
}

// Защита от отрицательных значений
setStats({
  actualTotalMaterials: Math.max(0, totalMaterials),
  actualTotalWorks: Math.max(0, totalWorks),
  // ...
});
```

### 4. Улучшенная диагностика
- Подробное логирование процесса обработки
- Информация о источнике данных (RPC или manual aggregation)
- Отслеживание каждого обрабатываемого элемента BOQ

## Созданные файлы

### SQL функция для агрегации
`/sql/CREATE_TENDER_COSTS_AGGREGATION_FUNCTION.sql`
```sql
CREATE OR REPLACE FUNCTION get_tender_costs_by_type(tender_id uuid)
RETURNS TABLE (
  item_type boq_item_type,
  total_amount numeric,
  item_count bigint
)
```

## Схема базы данных
Подтверждены следующие типы элементов BOQ:
- `material` - Материалы
- `work` - Работы  
- `sub_material` - Субматериалы
- `sub_work` - Субработы

## Результат
✅ **Корректный расчет базовых затрат** по всем категориям  
✅ **Исключение дублирования** доставки и субподрядов  
✅ **Улучшенная производительность** через RPC агрегацию  
✅ **Надежная обработка ошибок** и валидация данных  
✅ **Подробная диагностика** для отладки  

## Как применить исправления

1. **Выполните SQL функцию** из файла `sql/CREATE_TENDER_COSTS_AGGREGATION_FUNCTION.sql` в Supabase
2. **Код уже обновлен** в `src/pages/FinancialIndicatorsPage.tsx` 
3. **Проверьте работу** на странице "Финансовые показатели"

## Мониторинг
Проверьте логи в консоли браузера:
- `📊 [FinancialIndicatorsPage] Processing BOQ items` - обработка элементов
- `✅ [FinancialIndicatorsPage] Financial stats calculated` - результат расчета
- Поле `dataSource` показывает источник данных: `rpc_function` или `manual_aggregation`