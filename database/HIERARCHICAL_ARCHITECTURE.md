# Иерархическая архитектура базы данных TenderHub

## Обзор архитектуры

Новая схема базы данных реализует трехуровневую иерархию для управления тендерами:

```
Тендер (Tender)
├── Позиция заказчика 1 (Client Position)
│   ├── 1.1 Материал/Работа (BOQ Item)
│   ├── 1.2 Материал/Работа (BOQ Item)
│   └── 1.3 Материал/Работа (BOQ Item)
├── Позиция заказчика 2 (Client Position)
│   ├── 2.1 Материал/Работа (BOQ Item)
│   └── 2.2 Материал/Работа (BOQ Item)
└── Позиция заказчика N...
```

## Ключевые улучшения

### 1. Производительность
- **Импорт 5000+ записей**: <30 секунд
- **Рендеринг 10000+ строк**: <100мс  
- **Материализованные представления** для кэширования статистики
- **Оптимизированные индексы** для иерархических запросов

### 2. Автоматизация
- **Автоматическая нумерация** позиций (1, 2, 3...)
- **Автоматическое формирование подномеров** (1.1, 1.2, 2.1...)
- **Триггеры для пересчета** итогов по позициям
- **Валидация данных** на уровне БД

### 3. Аналитика
- **Анализ распределения затрат** по категориям
- **Выявление аномально дорогих позиций**
- **Сравнение с библиотечными ценами**
- **Мониторинг производительности**

## Структура таблиц

### Основные таблицы

#### 1. `client_positions` - Позиции заказчика
```sql
-- Основные поля
id UUID PRIMARY KEY
tender_id UUID → tenders(id)
position_number INTEGER -- Автоматическая нумерация: 1, 2, 3...
title TEXT -- Название позиции от заказчика
description TEXT

-- Вычисляемые итоги (автоматически обновляются)
total_materials_cost DECIMAL(15,2)
total_works_cost DECIMAL(15,2) 
total_position_cost DECIMAL(15,2) -- Генерируемое поле

-- Организация
category TEXT -- Категория позиции
priority INTEGER -- Приоритет для сортировки
status client_position_status -- 'active', 'inactive', 'completed'
```

#### 2. `boq_items` - Расширенная таблица BOQ
```sql
-- Новые поля для иерархии
client_position_id UUID → client_positions(id)
sub_number INTEGER -- Подномер внутри позиции: 1, 2, 3...
sort_order INTEGER -- Порядок сортировки
item_number TEXT -- Автоформат: "1.1", "1.2", "2.1"...

-- Связи с библиотеками (без изменений)
material_id UUID → materials_library(id)
work_id UUID → works_library(id)
```

### Производительные индексы

```sql
-- Для иерархических запросов
CREATE INDEX idx_boq_items_hierarchy 
ON boq_items(tender_id, client_position_id, sub_number);

-- Для группировок по позициям
CREATE INDEX idx_client_positions_number 
ON client_positions(tender_id, position_number);

-- Для анализа дорогих позиций
CREATE INDEX idx_client_positions_total_cost 
ON client_positions(total_position_cost DESC);
```

## Ключевые функции

### 1. Быстрый импорт данных
```sql
-- Импорт 5000+ записей за <30 секунд
SELECT * FROM fast_bulk_import_boq(
    'tender-id'::UUID,
    '[{"client_position_id": "pos-id", "item_type": "material", ...}]'::jsonb
);
```

### 2. Оптимизированное получение иерархии
```sql
-- Получение иерархии с пагинацией для рендеринга 10000+ строк
SELECT * FROM get_tender_hierarchy_optimized(
    'tender-id'::UUID,
    1000, -- лимит
    0     -- смещение
);
```

### 3. Автоматическая нумерация
```sql
-- Позиции автоматически получают номера 1, 2, 3...
INSERT INTO client_positions (tender_id, title) 
VALUES ('tender-id', 'Фундаментные работы');

-- BOQ элементы автоматически получают подномера 1.1, 1.2...
INSERT INTO boq_items (tender_id, client_position_id, description, ...)
VALUES ('tender-id', 'position-id', 'Бетон B25', ...);
```

### 4. Аналитические запросы

#### Анализ дорогих позиций
```sql
SELECT * FROM get_expensive_items_analysis(
    'tender-id'::UUID,
    10000.00, -- порог стоимости  
    20        -- топ N позиций
);
```

#### Сравнение с библиотечными ценами
```sql
SELECT * FROM price_variance_analysis 
WHERE tender_id = 'your-tender-id'
AND variance_status = 'ТРЕБУЕТ_ВНИМАНИЯ';
```

#### Распределение затрат по категориям
```sql
SELECT * FROM cost_analysis_by_category
WHERE tender_id = 'your-tender-id'
ORDER BY percentage_of_total DESC;
```

## Представления для упрощения работы

### 1. `tender_hierarchy` - Полная иерархия
Объединяет все уровни: тендер → позиции → элементы BOQ
```sql
SELECT * FROM tender_hierarchy WHERE tender_id = 'your-id';
```

### 2. `client_positions_summary` - Сводка по позициям  
Итоги, счетчики, проценты по каждой позиции заказчика
```sql
SELECT * FROM client_positions_summary WHERE tender_id = 'your-id';
```

### 3. `tender_summary` - Общая сводка по тендеру
Агрегированная статистика на уровне тендера
```sql
SELECT * FROM tender_summary WHERE tender_id = 'your-id';
```

## Кэширование и производительность

### Материализованные представления
```sql
-- Кэшированная статистика (обновляется по расписанию)
SELECT * FROM tender_stats_cache;

-- Ручное обновление кэша
SELECT refresh_tender_stats_cache();
```

### Мониторинг производительности
```sql
-- Медленные запросы
SELECT * FROM slow_queries_monitor;

-- Использование индексов
SELECT * FROM index_usage_stats;

-- Бенчмарк тестирование
SELECT * FROM run_performance_benchmark('tender-id'::UUID, 10);
```

## Миграция данных

### Шаг 1: Применение схемы
```sql
-- Выполнить файлы в порядке:
\i database/hierarchical_schema.sql
\i database/performance_queries.sql
```

### Шаг 2: Миграция существующих данных
```sql
-- Создать позиции заказчика из существующих категорий BOQ
INSERT INTO client_positions (tender_id, title, category)
SELECT DISTINCT 
    tender_id,
    COALESCE(category, 'Общие работы') as title,
    category
FROM boq_items 
WHERE category IS NOT NULL;

-- Привязать BOQ элементы к позициям
UPDATE boq_items 
SET client_position_id = cp.id
FROM client_positions cp 
WHERE boq_items.tender_id = cp.tender_id 
AND COALESCE(boq_items.category, 'Общие работы') = cp.title;
```

### Шаг 3: Пересчет нумерации
```sql
-- Пересчитать номера позиций и элементов
SELECT renumber_client_positions(tender_id) 
FROM tenders;
```

## Примеры использования в API

### Создание новой позиции заказчика
```typescript
const createClientPosition = async (tenderId: string, title: string) => {
    const { data } = await supabase
        .from('client_positions')
        .insert({
            tender_id: tenderId,
            title: title,
            category: 'Строительные работы'
        })
        .select()
        .single();
    return data;
};
```

### Добавление BOQ элементов к позиции
```typescript
const addBOQItems = async (clientPositionId: string, items: BOQItem[]) => {
    const { data } = await supabase
        .from('boq_items')
        .insert(
            items.map(item => ({
                client_position_id: clientPositionId,
                ...item
            }))
        );
    return data;
};
```

### Получение иерархии с пагинацией
```typescript
const getTenderHierarchy = async (tenderId: string, page: number = 0, limit: number = 1000) => {
    const { data } = await supabase
        .rpc('get_tender_hierarchy_optimized', {
            p_tender_id: tenderId,
            p_limit: limit,
            p_offset: page * limit
        });
    return data;
};
```

## Рекомендации по оптимизации

### 1. Регулярное обслуживание
```sql
-- Еженедельное обновление статистики таблиц
ANALYZE client_positions;
ANALYZE boq_items;

-- Обновление кэша (ежедневно)
SELECT refresh_tender_stats_cache();
```

### 2. Мониторинг производительности
```sql
-- Проверка медленных запросов (еженедельно)
SELECT * FROM slow_queries_monitor 
WHERE mean_time > 1000; -- >1 секунды

-- Проверка неиспользуемых индексов (ежемесячно)
SELECT * FROM index_usage_stats 
WHERE usage_status = 'НЕИСПОЛЬЗУЕМЫЙ';
```

### 3. Настройка PostgreSQL
```postgresql.conf
# Рекомендуемые настройки для работы с большими BOQ
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 256MB
effective_cache_size = 1GB
random_page_cost = 1.1
```

## Заключение

Новая иерархическая архитектура обеспечивает:

✅ **Высокую производительность** - импорт 5000+ записей за <30 сек  
✅ **Автоматизацию** - нумерация и пересчет итогов  
✅ **Аналитику** - встроенные отчеты и мониторинг  
✅ **Масштабируемость** - оптимизация для роста данных  
✅ **Удобство разработки** - готовые функции и представления  

Архитектура готова к использованию в продакшене и поддерживает все требования TenderHub по производительности и функциональности.