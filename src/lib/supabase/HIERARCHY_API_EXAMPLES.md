# TenderHub Hierarchical API Usage Examples

## Обзор API

Новый API TenderHub поддерживает трехуровневую иерархию:
- **Тендер** → **Позиции заказчика** → **Материалы/Работы (BOQ)**

## Основные API модули

### 1. `clientPositionsApi` - Позиции заказчика

#### Создание позиции заказчика
```typescript
import { clientPositionsApi } from '@/lib/supabase/api';

// Создать новую позицию (номер автоматически присваивается)
const result = await clientPositionsApi.create({
  tender_id: 'tender-uuid',
  title: 'Фундаментные работы',
  description: 'Устройство монолитного железобетонного фундамента',
  category: 'Строительные работы',
  priority: 1,
  status: 'active'
});

if (result.error) {
  console.error('Ошибка:', result.error);
} else {
  console.log('Позиция создана:', result.data);
  // result.data.position_number будет автоматически назначен (1, 2, 3...)
}
```

#### Получение позиций тендера с итогами
```typescript
// Получить все позиции с автоматическими итогами
const positions = await clientPositionsApi.getByTenderId('tender-uuid', {
  // Фильтры
  status: ['active'],
  min_cost: 10000,
  search: 'фундамент'
}, {
  // Пагинация
  page: 1,
  limit: 20
});

positions.data?.forEach(position => {
  console.log(`Позиция ${position.position_number}: ${position.title}`);
  console.log(`Материалы: ${position.total_materials_cost}`);
  console.log(`Работы: ${position.total_works_cost}`);
  console.log(`Общая стоимость: ${position.total_position_cost}`);
});
```

#### Перестановка позиций (drag & drop)
```typescript
// Изменить порядок позиций
await clientPositionsApi.reorder('tender-uuid', [
  { positionId: 'pos-1-uuid', newNumber: 2 },
  { positionId: 'pos-2-uuid', newNumber: 1 },
  { positionId: 'pos-3-uuid', newNumber: 3 }
]);
```

### 2. `boqApi` - BOQ элементы (расширенный)

#### Создание BOQ элемента в позиции заказчика
```typescript
import { boqApi } from '@/lib/supabase/api';

// Создать элемент BOQ (sub_number автоматически присваивается)
const boqItem = await boqApi.create({
  tender_id: 'tender-uuid',
  client_position_id: 'position-uuid',
  item_type: 'material',
  description: 'Бетон B25',
  unit: 'м3',
  quantity: 15.5,
  unit_rate: 4500.00,
  material_id: 'material-library-uuid',
  category: 'Строительные материалы'
  // sub_number и item_number будут автоматически назначены (например, "1.1", "1.2")
});
```

#### Получение BOQ элементов по позиции
```typescript
// Получить все элементы конкретной позиции заказчика
const items = await boqApi.getByClientPositionId('position-uuid', {
  item_type: ['material'],
  min_amount: 1000
});

items.data?.forEach(item => {
  console.log(`${item.item_number}: ${item.description}`);
  console.log(`Количество: ${item.quantity} ${item.unit}`);
  console.log(`Стоимость: ${item.total_amount}`);
});
```

#### Массовое добавление BOQ элементов в позицию
```typescript
// Оптимизированная массовая вставка
const bulkItems = [
  {
    item_type: 'material' as const,
    description: 'Арматура A500C',
    unit: 'т',
    quantity: 2.5,
    unit_rate: 75000.00,
    material_id: 'material-uuid'
  },
  {
    item_type: 'work' as const,
    description: 'Укладка бетона',
    unit: 'м3',
    quantity: 15.5,
    unit_rate: 1200.00,
    work_id: 'work-uuid'
  }
];

const result = await boqApi.bulkCreateInPosition('position-uuid', bulkItems);
console.log(`Создано ${result.data} элементов BOQ`);
```

#### Перемещение BOQ элементов между позициями
```typescript
// Переместить элемент в другую позицию
await boqApi.moveToPosition(
  'boq-item-uuid',
  'target-position-uuid',
  0 // новый sort_order
);

// Массовое перемещение (drag & drop)
await boqApi.batchMove([
  {
    itemId: 'item-1-uuid',
    sourcePositionId: 'pos-1-uuid',
    targetPositionId: 'pos-2-uuid',
    newSortOrder: 0
  },
  {
    itemId: 'item-2-uuid',
    sourcePositionId: 'pos-1-uuid',
    targetPositionId: 'pos-2-uuid',
    newSortOrder: 1
  }
]);
```

### 3. `hierarchyApi` - Полная иерархия

#### Получение полной структуры тендера
```typescript
import { hierarchyApi } from '@/lib/supabase/api';

// Получить тендер со всеми позициями и BOQ элементами
const fullTender = await hierarchyApi.getTenderWithPositions('tender-uuid', {
  include_items: true,    // включить BOQ элементы
  limit: 1000            // лимит для производительности
});

fullTender.data?.client_positions?.forEach(position => {
  console.log(`Позиция ${position.position_number}: ${position.title}`);
  
  position.boq_items?.forEach(item => {
    console.log(`  ${item.item_number}: ${item.description}`);
  });
});
```

#### Получение иерархии из представления (для больших объемов)
```typescript
// Оптимизированное получение иерархии для отображения
const hierarchy = await hierarchyApi.getTenderHierarchy('tender-uuid', {
  limit: 5000,           // для рендеринга больших списков
  offset: 0,
  positions_only: false  // включить все BOQ элементы
});

// Данные уже отсортированы по position_number, sub_number
hierarchy.data?.forEach(row => {
  if (row.boq_item_id) {
    // Это BOQ элемент
    console.log(`  ${row.item_number}: ${row.item_description}`);
  } else {
    // Это позиция заказчика
    console.log(`Позиция ${row.position_number}: ${row.position_title}`);
  }
});
```

#### Клонирование структуры тендера
```typescript
// Скопировать всю иерархию в новый тендер
const cloneResult = await hierarchyApi.cloneTenderStructure(
  'source-tender-uuid',
  'target-tender-uuid'
);

console.log(`Клонировано: ${cloneResult.data?.positionsCreated} позиций, ${cloneResult.data?.itemsCreated} элементов`);
```

#### Поиск по всей иерархии тендера
```typescript
// Полнотекстовый поиск
const searchResults = await hierarchyApi.searchInTender(
  'tender-uuid',
  'бетон',
  {
    includePositions: true,
    includeItems: true,
    itemTypes: ['material', 'work']
  }
);

console.log(`Найдено позиций: ${searchResults.data?.positions.length}`);
console.log(`Найдено элементов: ${searchResults.data?.items.length}`);
```

#### Создание структуры из шаблона
```typescript
// Создать полную структуру тендера из импорта
const structure = {
  positions: [
    {
      tender_id: 'tender-uuid',
      title: 'Земляные работы',
      category: 'Подготовительные'
    },
    {
      tender_id: 'tender-uuid', 
      title: 'Фундаментные работы',
      category: 'Строительные'
    }
  ],
  itemsByPosition: {
    '0': [ // для первой позиции
      {
        item_type: 'work' as const,
        description: 'Разработка грунта',
        unit: 'м3',
        quantity: 100,
        unit_rate: 250
      }
    ],
    '1': [ // для второй позиции
      {
        item_type: 'material' as const,
        description: 'Бетон B25',
        unit: 'м3', 
        quantity: 15,
        unit_rate: 4500
      }
    ]
  }
};

const result = await hierarchyApi.createTenderStructure('tender-uuid', structure);
```

### 4. Real-time подписки (обновленные)

#### Подписка на изменения позиций заказчика
```typescript
import { subscriptions } from '@/lib/supabase/api';

// Подписаться на изменения позиций в тендере
const unsubscribe = subscriptions.subscribeClientPositions(
  'tender-uuid',
  (payload) => {
    console.log('Позиция изменена:', payload);
    // Обновить UI
  }
);

// Отписаться
unsubscribe();
```

#### Подписка на полную иерархию тендера
```typescript
// Подписаться на все изменения в иерархии тендера
const unsubscribe = subscriptions.subscribeTenderHierarchy(
  'tender-uuid',
  (payload) => {
    const { table, eventType, new: newData, old: oldData } = payload;
    
    switch (table) {
      case 'client_positions':
        console.log('Позиция заказчика изменена');
        break;
      case 'boq_items':
        console.log('BOQ элемент изменен');
        break;
      case 'tenders':
        console.log('Тендер изменен');
        break;
    }
    
    // Обновить компоненты
  }
);
```

#### Подписка на изменения в конкретной позиции
```typescript
// Подписаться на BOQ элементы в конкретной позиции
const unsubscribe = subscriptions.subscribeBOQByPosition(
  'position-uuid',
  (payload) => {
    console.log('BOQ элемент в позиции изменен:', payload);
    // Обновить только эту позицию в UI
  }
);
```

## Производительность и оптимизация

### Пагинация для больших списков
```typescript
// Для отображения 10,000+ строк используйте пагинацию
const loadBOQPage = async (tenderId: string, page: number) => {
  return await boqApi.getByTenderId(tenderId, {}, {
    page,
    limit: 100 // загружать по 100 элементов
  });
};
```

### Загрузка только позиций (без BOQ элементов)
```typescript
// Для быстрого обзора загружайте только позиции
const positions = await hierarchyApi.getTenderHierarchy('tender-uuid', {
  positions_only: true
});
```

### Массовые операции
```typescript
// Используйте массовые операции для импорта Excel
const importData = {
  positions: excelData.positions,
  itemsByPosition: excelData.itemsByPosition
};

await hierarchyApi.createTenderStructure('tender-uuid', importData);
```

## Обработка ошибок

```typescript
const handleApiCall = async () => {
  const result = await clientPositionsApi.create(positionData);
  
  if (result.error) {
    // Логирование ошибки (требование проекта)
    console.error('API Error:', {
      operation: 'create_client_position',
      error: result.error,
      data: positionData,
      timestamp: new Date().toISOString()
    });
    
    // Показать пользователю
    showErrorMessage(result.error);
    return;
  }
  
  // Успешное выполнение
  console.log('Success:', result.message);
  updateUI(result.data);
};
```

## Интеграция с React компонентами

```tsx
// Пример React компонента с иерархией
const TenderHierarchy: React.FC<{ tenderId: string }> = ({ tenderId }) => {
  const [hierarchy, setHierarchy] = useState<TenderWithFullHierarchy | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      const result = await hierarchyApi.getTenderWithPositions(tenderId);
      if (result.data) {
        setHierarchy(result.data);
      }
    };
    
    loadData();
    
    // Подписка на изменения
    const unsubscribe = subscriptions.subscribeTenderHierarchy(
      tenderId,
      () => loadData() // Перезагрузить при изменениях
    );
    
    return unsubscribe;
  }, [tenderId]);
  
  return (
    <div>
      {hierarchy?.client_positions?.map(position => (
        <div key={position.id}>
          <h3>{position.position_number}. {position.title}</h3>
          <p>Стоимость: {position.total_position_cost}</p>
          
          {position.boq_items?.map(item => (
            <div key={item.id} style={{ marginLeft: '20px' }}>
              {item.item_number}: {item.description}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

Этот API обеспечивает полную поддержку иерархической структуры TenderHub с автоматической нумерацией, оптимизированными запросами и real-time обновлениями.