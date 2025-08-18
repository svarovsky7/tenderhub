# Enhanced Quick Add Components

Улучшенные компоненты для быстрого добавления работ и материалов в TenderHub.

## Компоненты

### EnhancedQuickAddCard

Основной компонент карточки с современным дизайном и расширенной функциональностью.

**Расположение:** `src/components/tender/EnhancedQuickAddCard.tsx`

**Пропсы:**
```typescript
interface EnhancedQuickAddCardProps {
  type: 'work' | 'material';
  onAdd: (data: any) => Promise<void>;
  loading?: boolean;
}
```

**Особенности:**
- Glass morphism дизайн с градиентами
- Анимированные состояния (hover, focus, loading, success)
- Реальное время подсчета стоимости
- Прогресс-индикаторы при отправке
- Адаптивный дизайн
- Поддержка accessibility

### EnhancedAutocomplete

Умный компонент автодополнения с превью и расширенной информацией.

**Расположение:** `src/components/tender/EnhancedAutocomplete.tsx`

**Пропсы:**
```typescript
interface EnhancedAutocompleteProps {
  type: 'work' | 'material';
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: Material | Work) => void;
  suggestions: (Material | Work)[];
  loading: boolean;
  placeholder?: string;
  className?: string;
}
```

**Особенности:**
- Поиск с превью элементов
- Показ популярности и категорий
- Анимированное появление результатов
- Клик вне области для закрытия
- Индикаторы загрузки

### SuccessNotification

Красивые уведомления об успешных операциях.

**Расположение:** `src/components/ui/SuccessNotification.tsx`

**Пропсы:**
```typescript
interface SuccessNotificationProps {
  visible: boolean;
  title: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
}
```

## Стили

### CSS Modules

**Расположение:** `src/styles/EnhancedQuickAddCard.module.css`

**Основные классы:**
- `.cardContainer` - основной контейнер карточки
- `.materialCard` - модификатор для карточки материалов
- `.glassMorphism` - эффект стеклянного морфизма
- `.suggestionItem` - элемент автодополнения
- `.submitButton` - кнопка отправки с анимациями

## Использование

### В BOQPage

```typescript
import EnhancedQuickAddCard from '../components/tender/EnhancedQuickAddCard';

// В компоненте
<EnhancedQuickAddCard 
  type="work" 
  onAdd={handleQuickAdd}
  loading={loading}
/>
```

### Демо-страница

Для демонстрации всех возможностей создан компонент `QuickAddDemo`:

```typescript
import QuickAddDemo from '../components/ui/QuickAddDemo';
```

## Технические особенности

### Производительность
- Мемоизация с `React.memo`
- `useCallback` для обработчиков событий
- Debounced поиск (300ms)
- Lazy loading для автодополнения

### Анимации
- CSS transitions и transforms
- Cubic-bezier кривые для плавности
- Поддержка `prefers-reduced-motion`
- Микроанимации при взаимодействии

### Accessibility
- Поддержка клавиатурной навигации
- ARIA-атрибуты для скрин-ридеров
- Высокий контраст в режиме `prefers-contrast: high`
- Семантичная HTML-разметка

### Адаптивность
- Mobile-first подход
- Responsive breakpoints
- Touch-friendly интерфейс
- Оптимизация для разных размеров экрана

## Интеграция с API

Компоненты интегрированы с существующими API:
- `worksApi.search()` для поиска работ
- `materialsApi.search()` для поиска материалов
- Полная совместимость с текущей архитектурой

## Кастомизация

### Цветовые схемы
Легко изменить через CSS переменные в модулях:
```css
.cardContainer {
  background: var(--gradient-work, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
}
```

### Анимации
Настройка длительности и easing:
```css
.cardContainer {
  transition: all var(--duration, 0.4s) var(--easing, cubic-bezier(0.4, 0, 0.2, 1));
}
```

## Миграция

Для перехода с старого `QuickAddCard`:
1. Заменить импорт на `EnhancedQuickAddCard`
2. Пропсы остаются теми же
3. Добавить CSS модули в проект
4. Протестировать функциональность