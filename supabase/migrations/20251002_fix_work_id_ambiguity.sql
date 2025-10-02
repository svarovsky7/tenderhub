-- Migration: Fix ambiguous work_id/material_id variable names in update_linked_material_total_amount()
-- Date: 2025-10-02
-- Issue: PostgreSQL error 42702 - column reference "work_id" is ambiguous
--
-- The function had local variables named work_id and material_id which conflict
-- with potential column names when executing SELECT queries.
--
-- Solution: Rename variables to v_work_id and v_material_id to avoid ambiguity

CREATE OR REPLACE FUNCTION public.update_linked_material_total_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_work RECORD;
    v_material RECORD;
    new_quantity DECIMAL(15,2);
    new_total DECIMAL(15,2);
    v_material_id UUID;  -- Renamed from material_id
    v_work_id UUID;      -- Renamed from work_id
BEGIN
    -- Определяем IDs
    IF TG_OP = 'DELETE' THEN
        v_material_id := COALESCE(OLD.material_boq_item_id, OLD.sub_material_boq_item_id);
        v_work_id := COALESCE(OLD.work_boq_item_id, OLD.sub_work_boq_item_id);
        RETURN OLD; -- При удалении не обновляем
    ELSE
        v_material_id := COALESCE(NEW.material_boq_item_id, NEW.sub_material_boq_item_id);
        v_work_id := COALESCE(NEW.work_boq_item_id, NEW.sub_work_boq_item_id);
    END IF;

    IF v_material_id IS NULL OR v_work_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Получаем работу
    SELECT quantity INTO v_work FROM boq_items WHERE id = v_work_id;

    -- Получаем материал
    SELECT
        unit_rate, currency_type, currency_rate,
        delivery_price_type, delivery_amount,
        consumption_coefficient, conversion_coefficient
    INTO v_material FROM boq_items WHERE id = v_material_id;

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
    UPDATE boq_items
    SET
        quantity = new_quantity,
        total_amount = new_total,
        updated_at = NOW()
    WHERE id = v_material_id;

    RETURN NEW;
END;
$function$;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION public.update_linked_material_total_amount() IS
'Автоматически обновляет quantity и total_amount связанного материала при изменении work_material_links. Использует v_work_id и v_material_id для избежания конфликтов с именами колонок.';
