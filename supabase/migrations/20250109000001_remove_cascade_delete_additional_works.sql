-- Remove CASCADE DELETE from parent_position_id to make additional works independent
-- When parent position is deleted, additional works become orphaned (parent_position_id = NULL)

-- Drop existing foreign key constraint with CASCADE DELETE
ALTER TABLE public.client_positions 
DROP CONSTRAINT IF EXISTS client_positions_parent_position_id_fkey;

-- Add new foreign key constraint with SET NULL on delete
-- This makes additional works independent - they won't be deleted when parent is deleted
ALTER TABLE public.client_positions 
ADD CONSTRAINT client_positions_parent_position_id_fkey 
FOREIGN KEY (parent_position_id) 
REFERENCES public.client_positions(id) 
ON DELETE SET NULL;

-- Update comment to reflect new behavior
COMMENT ON COLUMN public.client_positions.parent_position_id IS 'Reference to the parent position for visual grouping of additional works. Set to NULL when parent is deleted.';