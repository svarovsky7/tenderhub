-- ФИНАЛЬНОЕ исправление расчета totals
-- Применять эту миграцию в Supabase SQL Editor

-- ШАГ 1: Триггер для обновления total_amount связанных материалов
CREATE OR REPLACE FUNCTION update_linked_material_total_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_work RECORD;
    v_material RECORD;
    new_quantity DECIMAL(15,2);
    new_total DECIMAL(15,2);
    material_id UUID;
    work_id UUID;
BEGIN
    -- Определяем IDs
    IF TG_OP = 'DELETE' THEN
        material_id := COALESCE(OLD.material_boq_item_id, OLD.sub_material_boq_item_id);
        work_id := COALESCE(OLD.work_boq_item_id, OLD.sub_work_boq_item_id);
        RETURN OLD; -- При удалении не обновляем
    ELSE
        material_id := COALESCE(NEW.material_boq_item_id, NEW.sub_material_boq_item_id);
        work_id := COALESCE(NEW.work_boq_item_id, NEW.sub_work_boq_item_id);
    END IF;

    IF material_id IS NULL OR work_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Получаем работу
    SELECT quantity INTO v_work FROM boq_items WHERE id = work_id;

    -- Получаем материал
    SELECT
        unit_rate, currency_type, currency_rate,
        delivery_price_type, delivery_amount,
        consumption_coefficient, conversion_coefficient
    INTO v_material FROM boq_items WHERE id = material_id;

    -- Пересчитываем quantity
    new_quantity := COALESCE(v_work.quantity, 0) *
                   COALESCE(v_material.consumption_coefficient, NEW.material_quantity_per_work, 1) *
                   COALESCE(v_material.conversion_coefficient, NEW.usage_coefficient, 1);

    -- Пересчитываем total_amount
    new_total := new_quantity * COALESCE(v_material.unit_rate, 0) *
                CASE WHEN v_material.currency_type IS NOT NULL AND v_material.currency_type != 'RUB'
                     THEN COALESCE(v_material.currency_rate, 1) ELSE 1 END;

    -- Delivery cost
    new_total := new_total + CASE
        WHEN v_material.delivery_price_type = 'amount' THEN
            COALESCE(v_material.delivery_amount, 0) * new_quantity
        WHEN v_material.delivery_price_type = 'not_included' THEN new_total * 0.03
        ELSE 0
    END;

    -- Обновляем материал
    UPDATE boq_items SET quantity = new_quantity, total_amount = new_total, updated_at = NOW()
    WHERE id = material_id;

    RETURN NEW;
END;
$$;

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS update_material_total_on_link_change ON work_material_links;

-- Создаем триггер
CREATE TRIGGER update_material_total_on_link_change
AFTER INSERT OR UPDATE ON work_material_links
FOR EACH ROW EXECUTE FUNCTION update_linked_material_total_amount();

-- ШАГ 2: Обновляем триггер пересчета позиций (простое суммирование)
CREATE OR REPLACE FUNCTION trigger_recalc_position_on_wml_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_position_id UUID;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
    commercial_materials_total DECIMAL(15,2);
    commercial_works_total DECIMAL(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_position_id := OLD.client_position_id;
    ELSE
        v_position_id := NEW.client_position_id;
    END IF;

    IF v_position_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- ПРОСТОЕ суммирование total_amount
    SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('material', 'sub_material');

    SELECT COALESCE(SUM(total_amount), 0) INTO works_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('work', 'sub_work');

    SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_materials_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('material', 'sub_material');

    SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_works_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('work', 'sub_work');

    -- Обновляем позицию
    UPDATE client_positions SET
        total_materials_cost = materials_total,
        total_works_cost = works_total,
        total_commercial_materials_cost = commercial_materials_total,
        total_commercial_works_cost = commercial_works_total,
        updated_at = NOW()
    WHERE id = v_position_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ШАГ 3: Исправляем существующие total_amount для связанных материалов
DO $$
DECLARE
    v_link RECORD;
    v_work RECORD;
    v_material RECORD;
    new_quantity DECIMAL(15,2);
    new_total DECIMAL(15,2);
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Fixing existing linked materials...';

    FOR v_link IN
        SELECT
            COALESCE(wml.work_boq_item_id, wml.sub_work_boq_item_id) as work_id,
            COALESCE(wml.material_boq_item_id, wml.sub_material_boq_item_id) as material_id,
            wml.material_quantity_per_work,
            wml.usage_coefficient
        FROM work_material_links wml
    LOOP
        SELECT quantity INTO v_work FROM boq_items WHERE id = v_link.work_id;

        SELECT unit_rate, currency_type, currency_rate, delivery_price_type, delivery_amount,
               consumption_coefficient, conversion_coefficient
        INTO v_material FROM boq_items WHERE id = v_link.material_id;

        new_quantity := COALESCE(v_work.quantity, 0) *
                       COALESCE(v_material.consumption_coefficient, v_link.material_quantity_per_work, 1) *
                       COALESCE(v_material.conversion_coefficient, v_link.usage_coefficient, 1);

        new_total := new_quantity * COALESCE(v_material.unit_rate, 0) *
                    CASE WHEN v_material.currency_type IS NOT NULL AND v_material.currency_type != 'RUB'
                         THEN COALESCE(v_material.currency_rate, 1) ELSE 1 END;

        new_total := new_total + CASE
            WHEN v_material.delivery_price_type = 'amount' THEN
                COALESCE(v_material.delivery_amount, 0) * new_quantity
            WHEN v_material.delivery_price_type = 'not_included' THEN new_total * 0.03
            ELSE 0
        END;

        UPDATE boq_items SET quantity = new_quantity, total_amount = new_total, updated_at = NOW()
        WHERE id = v_link.material_id;

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % linked materials', v_count;
END $$;

-- ШАГ 4: Пересчитываем все позиции
DO $$
DECLARE
    v_position RECORD;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
    commercial_materials_total DECIMAL(15,2);
    commercial_works_total DECIMAL(15,2);
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Recalculating all positions...';

    FOR v_position IN
        SELECT DISTINCT client_position_id as id FROM boq_items WHERE client_position_id IS NOT NULL
    LOOP
        SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
        FROM boq_items WHERE client_position_id = v_position.id AND item_type IN ('material', 'sub_material');

        SELECT COALESCE(SUM(total_amount), 0) INTO works_total
        FROM boq_items WHERE client_position_id = v_position.id AND item_type IN ('work', 'sub_work');

        SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_materials_total
        FROM boq_items WHERE client_position_id = v_position.id AND item_type IN ('material', 'sub_material');

        SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_works_total
        FROM boq_items WHERE client_position_id = v_position.id AND item_type IN ('work', 'sub_work');

        UPDATE client_positions SET
            total_materials_cost = materials_total,
            total_works_cost = works_total,
            total_commercial_materials_cost = commercial_materials_total,
            total_commercial_works_cost = commercial_works_total,
            updated_at = NOW()
        WHERE id = v_position.id;

        v_count := v_count + 1;
        IF v_count % 10 = 0 THEN
            RAISE NOTICE 'Processed % positions...', v_count;
        END IF;
    END LOOP;

    RAISE NOTICE 'Done! Updated % positions', v_count;
END $$;

-- Проверка
SELECT id, work_name, total_materials_cost, total_works_cost,
       (total_materials_cost + total_works_cost) as total_cost
FROM client_positions
WHERE work_name IN (
    'Банковская гарантия на авансовые платежи',
    'Новая строка заказчика',
    'Страхование всех рисков'
)
ORDER BY work_name;
