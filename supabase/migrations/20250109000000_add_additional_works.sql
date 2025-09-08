-- Add support for additional works (ДОП работы) in client_positions table

-- Add is_additional flag to mark additional work positions
ALTER TABLE public.client_positions 
ADD COLUMN IF NOT EXISTS is_additional boolean DEFAULT false;

-- Add parent_position_id to link additional works to their parent positions
ALTER TABLE public.client_positions 
ADD COLUMN IF NOT EXISTS parent_position_id uuid REFERENCES public.client_positions(id) ON DELETE CASCADE;

-- Create index for faster lookup of additional works
CREATE INDEX IF NOT EXISTS idx_client_positions_parent_position_id 
ON public.client_positions(parent_position_id) 
WHERE parent_position_id IS NOT NULL;

-- Create index for filtering additional works
CREATE INDEX IF NOT EXISTS idx_client_positions_is_additional 
ON public.client_positions(is_additional) 
WHERE is_additional = true;

-- Add comment to columns
COMMENT ON COLUMN public.client_positions.is_additional IS 'Flag indicating if this position is an additional work (ДОП работа)';
COMMENT ON COLUMN public.client_positions.parent_position_id IS 'Reference to the parent position for additional works';