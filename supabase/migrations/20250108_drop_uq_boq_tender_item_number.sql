-- Drop the unique constraint on (tender_id, item_number) from boq_items table
-- This constraint causes conflicts when multiple positions have similar item numbering
ALTER TABLE ONLY "public"."boq_items"
    DROP CONSTRAINT IF EXISTS "uq_boq_tender_item_number";

-- Add comment explaining why this constraint was removed
COMMENT ON TABLE "public"."boq_items" IS 'Bill of Quantities line items for each tender. Note: uq_boq_tender_item_number constraint was removed to allow flexibility in item numbering across different positions';