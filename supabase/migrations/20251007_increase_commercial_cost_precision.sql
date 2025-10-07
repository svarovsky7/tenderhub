-- Migration: Increase precision of commercial_cost column
-- Date: 2025-10-07
-- Description: Change commercial_cost from numeric(9,2) to numeric(15,2) to support larger values
--              Current limitation: ~75M, New limit: ~10T (9,999,999,999,999.99)
--              This is needed for tenders with commercial costs exceeding 75 million rubles

-- Increase precision of commercial_cost column in boq_items table
ALTER TABLE public.boq_items
ALTER COLUMN commercial_cost TYPE numeric(15,2);

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated commercial_cost to numeric(15,2)';
  RAISE NOTICE 'New maximum value: 9,999,999,999,999.99';
END $$;
