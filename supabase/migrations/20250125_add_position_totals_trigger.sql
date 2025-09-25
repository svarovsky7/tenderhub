-- Migration: Add trigger for automatic recalculation of client_positions totals
-- Date: 2025-01-25
-- Purpose: Fix issue with incorrect total_materials_cost and total_works_cost values in client_positions table

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS recalculate_position_totals_trigger ON public.boq_items;

-- Create trigger for automatic recalculation of position totals
-- This trigger will fire after any insert, delete, or update of relevant fields in boq_items
CREATE TRIGGER recalculate_position_totals_trigger
AFTER INSERT OR DELETE OR UPDATE OF total_amount, quantity, unit_rate, item_type, client_position_id
ON public.boq_items
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_client_position_totals();

-- Recalculate all existing position totals to fix current incorrect values
-- This is a one-time operation to fix existing data
DO $$
DECLARE
    pos_record RECORD;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
    commercial_materials_total DECIMAL(15,2);
    commercial_works_total DECIMAL(15,2);
BEGIN
    -- Loop through all client positions
    FOR pos_record IN
        SELECT DISTINCT cp.id
        FROM public.client_positions cp
        WHERE EXISTS (
            SELECT 1 FROM public.boq_items bi
            WHERE bi.client_position_id = cp.id
        )
    LOOP
        -- Recalculate material costs (including sub_material)
        SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
        FROM public.boq_items
        WHERE client_position_id = pos_record.id
        AND item_type IN ('material', 'sub_material');

        -- Recalculate work costs (including sub_work)
        SELECT COALESCE(SUM(total_amount), 0) INTO works_total
        FROM public.boq_items
        WHERE client_position_id = pos_record.id
        AND item_type IN ('work', 'sub_work');

        -- Recalculate commercial material costs
        SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_materials_total
        FROM public.boq_items
        WHERE client_position_id = pos_record.id
        AND item_type IN ('material', 'sub_material');

        -- Recalculate commercial work costs
        SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_works_total
        FROM public.boq_items
        WHERE client_position_id = pos_record.id
        AND item_type IN ('work', 'sub_work');

        -- Update client position with correct totals
        UPDATE public.client_positions
        SET
            total_materials_cost = materials_total,
            total_works_cost = works_total,
            total_commercial_materials_cost = commercial_materials_total,
            total_commercial_works_cost = commercial_works_total,
            updated_at = NOW()
        WHERE id = pos_record.id;

        RAISE NOTICE 'Updated position %: materials=%, works=%',
            pos_record.id, materials_total, works_total;
    END LOOP;

    RAISE NOTICE 'Recalculation of all position totals completed';
END $$;

-- Add comment to document the trigger
COMMENT ON TRIGGER recalculate_position_totals_trigger ON public.boq_items IS
'Automatically recalculates total_materials_cost and total_works_cost in client_positions table when BOQ items are modified';