# Инструкция по миграции на OptimizedClientPositionCard

## Описание изменений

Создан новый компонент `OptimizedClientPositionCard` который заменяет механизм drag-and-drop на модальные окна для связывания материалов с работами.

## Файлы

- **Новый компонент**: `src/components/tender/OptimizedClientPositionCard.tsx`
- **Требует изменения**: `src/pages/BOQPage.tsx` или `src/components/tender/TenderBOQManagerNew.tsx`

## Шаги миграции

### Вариант 1: Быстрая замена на странице BOQPage

1. Откройте файл `src/pages/BOQPage.tsx`

2. Замените импорт:
```typescript
// Старый импорт
import TenderBOQManagerNew from '../components/tender/TenderBOQManagerNew';

// Новый импорт
import OptimizedBOQManager from '../components/tender/OptimizedBOQManager';
```

3. Замените использование компонента:
```typescript
// Старый код
<TenderBOQManagerNew tenderId={selectedTenderId} />

// Новый код
<OptimizedBOQManager tenderId={selectedTenderId} />
```

### Вариант 2: Создание нового OptimizedBOQManager

Для полной интеграции нужно создать новый компонент `OptimizedBOQManager.tsx`, который будет использовать `OptimizedClientPositionCard`.

## Ключевые изменения функциональности

### Было (Drag & Drop):
- Перетаскивание материалов на работы мышью
- Визуальные индикаторы при перетаскивании
- Использование библиотек @dnd-kit

### Стало (Модальные окна):
- Кнопка "Переместить" (иконка SwapOutlined) в строке материала
- Модальное окно со списком доступных работ
- Клик по работе для привязки материала

## Преимущества новой версии

1. **Удобство на мобильных устройствах** - модальные окна работают лучше чем drag-and-drop
2. **Ясность действий** - понятные кнопки вместо неочевидного перетаскивания
3. **Меньше ошибок** - исключены случайные перемещения при перетаскивании
4. **Лучшая производительность** - меньше обработчиков событий и перерисовок

## Формулы и расчеты

Все формулы сохранены без изменений:
- **Итоговая стоимость материала** = К.перевода × К.расхода × Цена за единицу
- **Коэффициент перевода** (conversion_coefficient) - преобразование единиц измерения
- **Коэффициент расхода** (consumption_coefficient) - норма расхода материала

---

# Инструкция по применению миграции для добавления полей доставки

## Шаги для применения миграции в Supabase:

### 1. Откройте Supabase Dashboard
- Перейдите в ваш проект на https://supabase.com/dashboard
- Откройте раздел SQL Editor

### 2. Примените миграции
Выполните миграции в следующем порядке:

#### Миграция 1: Добавление полей доставки в work_material_links
Скопируйте и выполните содержимое файла `supabase/migrations/add_delivery_price_fields.sql`

**ВАЖНО**: Миграция добавляет не только поля доставки, но и базовые поля `material_quantity_per_work` и `usage_coefficient`, если они отсутствуют в вашей схеме.

#### Миграция 2: Добавление полей доставки в boq_items  
Скопируйте и выполните содержимое файла `supabase/migrations/add_delivery_to_boq_items.sql`

Эта миграция добавляет поля доставки непосредственно в таблицу boq_items, чтобы можно было указывать параметры доставки при создании материала.

Или выполните следующий SQL-скрипт:

```sql
-- Добавление полей для управления ценой доставки материалов
-- в таблицу work_material_links

-- Создаем enum для типа цены доставки (если еще не существует)
DO $$ BEGIN
    CREATE TYPE delivery_price_type AS ENUM ('included', 'not_included', 'amount');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Добавляем все необходимые колонки в таблицу work_material_links
ALTER TABLE public.work_material_links
ADD COLUMN IF NOT EXISTS material_quantity_per_work numeric(12,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS usage_coefficient numeric(12,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS delivery_price_type delivery_price_type DEFAULT 'included',
ADD COLUMN IF NOT EXISTS delivery_amount numeric(12,2) DEFAULT 0;

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN public.work_material_links.material_quantity_per_work IS 'Количество материала, необходимое на единицу работы';
COMMENT ON COLUMN public.work_material_links.usage_coefficient IS 'Коэффициент использования материала в работе';
COMMENT ON COLUMN public.work_material_links.delivery_price_type IS 'Тип цены доставки: included (в цене), not_included (не в цене), amount (сумма)';
COMMENT ON COLUMN public.work_material_links.delivery_amount IS 'Сумма доставки (используется только при delivery_price_type = amount)';

-- Пересоздаем представление work_material_links_detailed с новыми полями
DROP VIEW IF EXISTS public.work_material_links_detailed;

CREATE OR REPLACE VIEW public.work_material_links_detailed AS
 SELECT wml.id,
    wml.client_position_id,
    wml.work_boq_item_id,
    wml.material_boq_item_id,
    wml.material_quantity_per_work,
    wml.usage_coefficient,
    wml.delivery_price_type,
    wml.delivery_amount,
    wml.notes,
    wml.created_at,
    wml.updated_at,
    cp.position_number,
    cp.work_name AS position_name,
    cp.tender_id,
    w.item_number AS work_item_number,
    w.description AS work_description,
    w.unit AS work_unit,
    w.quantity AS work_quantity,
    w.unit_rate AS work_unit_rate,
    w.total_amount AS work_total_amount,
    m.item_number AS material_item_number,
    m.description AS material_description,
    m.unit AS material_unit,
    m.quantity AS material_quantity,
    m.unit_rate AS material_unit_rate,
    m.total_amount AS material_total_amount,
    m.consumption_coefficient AS material_consumption_coefficient,
    m.conversion_coefficient AS material_conversion_coefficient,
    ((COALESCE(w.quantity, 0) * COALESCE(wml.material_quantity_per_work, 1)) * COALESCE(wml.usage_coefficient, 1)) AS total_material_needed,
    (((COALESCE(w.quantity, 0) * COALESCE(wml.material_quantity_per_work, 1)) * COALESCE(wml.usage_coefficient, 1)) * COALESCE(m.unit_rate, 0)) AS total_material_cost,
    -- Добавляем расчет общей стоимости с учетом доставки
    CASE 
        WHEN wml.delivery_price_type = 'amount' THEN 
            (((COALESCE(w.quantity, 0) * COALESCE(wml.material_quantity_per_work, 1)) * COALESCE(wml.usage_coefficient, 1)) * COALESCE(m.unit_rate, 0)) + COALESCE(wml.delivery_amount, 0)
        ELSE 
            (((COALESCE(w.quantity, 0) * COALESCE(wml.material_quantity_per_work, 1)) * COALESCE(wml.usage_coefficient, 1)) * COALESCE(m.unit_rate, 0))
    END AS total_cost_with_delivery
   FROM work_material_links wml
     LEFT JOIN client_positions cp ON wml.client_position_id = cp.id
     LEFT JOIN boq_items w ON wml.work_boq_item_id = w.id
     LEFT JOIN boq_items m ON wml.material_boq_item_id = m.id;

COMMENT ON VIEW public.work_material_links_detailed IS 'Детализированное представление связей работ и материалов с информацией о доставке';

-- Создаем функцию для валидации данных доставки
CREATE OR REPLACE FUNCTION check_delivery_price_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Если тип доставки не "amount", то обнуляем сумму доставки
    IF NEW.delivery_price_type != 'amount' THEN
        NEW.delivery_amount := 0;
    END IF;
    
    -- Если тип доставки "amount" и сумма не указана, устанавливаем 0
    IF NEW.delivery_price_type = 'amount' AND NEW.delivery_amount IS NULL THEN
        NEW.delivery_amount := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической валидации
DROP TRIGGER IF EXISTS trigger_check_delivery_price ON public.work_material_links;
CREATE TRIGGER trigger_check_delivery_price
    BEFORE INSERT OR UPDATE ON public.work_material_links
    FOR EACH ROW
    EXECUTE FUNCTION check_delivery_price_consistency();
```

### 3. Проверьте результаты
После выполнения скрипта убедитесь, что:
- Не было ошибок при выполнении
- Новые поля появились в таблице `work_material_links`
- Представление `work_material_links_detailed` обновилось

### 4. Обновите схему локально (опционально)
Если хотите обновить локальную копию схемы:
```bash
npm run db:schema
```

## Как использовать новый функционал

### В интерфейсе приложения:

1. **При создании нового материала в BOQ:**
   - Нажмите кнопку "Добавить элемент BOQ"
   - Выберите тип "Материал"
   - Заполните основную информацию
   - В разделе "Параметры доставки" укажите:
     - **Цена доставки** - выберите один из вариантов:
       - "В цене" - доставка включена в стоимость материала
       - "Не в цене" - доставка оплачивается отдельно заказчиком  
       - "Сумма" - укажите конкретную сумму доставки
     - **Сумма доставки** - появляется только при выборе типа "Сумма"

2. **При создании связи материала с работой:**
   - Перетащите материал на работу в карточке позиции заказчика
   - В открывшемся модальном окне:
     - Параметры доставки автоматически заполнятся из карточки материала
     - При необходимости можно изменить параметры доставки для конкретной связи
     - Количество материала на единицу работы
     - Коэффициент использования

3. **При редактировании:**
   - **Редактирование материала**: используйте кнопку редактирования в списке BOQ
   - **Редактирование связи**: нажмите кнопку редактирования (карандаш) рядом со связанным материалом
   - В модальном окне измените параметры доставки

4. **Отображение информации:**
   - В списке связанных материалов отображается статус доставки с иконками:
     - 📦 Доставка в цене
     - 🚚 Доставка не в цене
     - 🚚 Доставка: [сумма] ₽
   - Общая стоимость автоматически учитывает сумму доставки (если указана)

## Важные замечания

- Поле `delivery_amount` автоматически обнуляется, если выбран тип доставки не "amount"
- Триггер обеспечивает консистентность данных
- Представление `work_material_links_detailed` автоматически рассчитывает общую стоимость с учетом доставки