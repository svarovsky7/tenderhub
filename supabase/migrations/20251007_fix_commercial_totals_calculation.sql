-- Migration: Fix commercial totals calculation in recalculate_client_position_totals trigger
-- Date: 2025-10-07
-- Problem: Trigger multiplies commercial_cost by quantity, causing overflow
--          commercial_cost already includes quantity in its calculation!
-- Solution: SUM(commercial_cost) instead of SUM(quantity * commercial_cost)

CREATE OR REPLACE FUNCTION public.recalculate_client_position_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
  DECLARE
      position_id UUID;
      materials_total DECIMAL(15,2);
      works_total DECIMAL(15,2);
      commercial_materials_total DECIMAL(15,2);
      commercial_works_total DECIMAL(15,2);
  BEGIN
      -- Determine position ID for recalculation
      IF TG_OP = 'DELETE' THEN
          position_id = OLD.client_position_id;
      ELSE
          position_id = NEW.client_position_id;
      END IF;

      -- Skip if position_id is NULL
      IF position_id IS NULL THEN
          RETURN COALESCE(NEW, OLD);
      END IF;

      -- Recalculate material costs (including sub_material) - базовые
      SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('material', 'sub_material');

      -- Recalculate work costs (including sub_work) - базовые
      SELECT COALESCE(SUM(total_amount), 0) INTO works_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('work', 'sub_work');

      -- Recalculate commercial material costs (коммерческие)
      -- ИСПРАВЛЕНО: commercial_cost уже включает quantity, не нужно умножать!
      SELECT COALESCE(SUM(commercial_cost), 0) INTO commercial_materials_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('material', 'sub_material');

      -- Recalculate commercial work costs (коммерческие)
      -- ИСПРАВЛЕНО: commercial_cost уже включает quantity, не нужно умножать!
      SELECT COALESCE(SUM(commercial_cost), 0) INTO commercial_works_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('work', 'sub_work');

      -- Update client position totals (базовые и коммерческие)
      UPDATE public.client_positions
      SET
          total_materials_cost = materials_total,
          total_works_cost = works_total,
          total_commercial_materials_cost = commercial_materials_total,
          total_commercial_works_cost = commercial_works_total,
          updated_at = NOW()
      WHERE id = position_id;

      RETURN COALESCE(NEW, OLD);
  END;
$function$;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed trigger: recalculate_client_position_totals';
  RAISE NOTICE 'Changed: SUM(quantity * commercial_cost) → SUM(commercial_cost)';
  RAISE NOTICE 'Reason: commercial_cost already includes quantity in calculation';
END $$;
