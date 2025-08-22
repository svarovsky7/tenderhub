-- Add position_type and hierarchy_level to client_positions table
-- This allows hierarchical structure for client positions from Excel

-- Add position_type column
ALTER TABLE public.client_positions 
ADD COLUMN IF NOT EXISTS position_type VARCHAR(50) DEFAULT 'executable';

-- Add hierarchy_level column for visual indentation
ALTER TABLE public.client_positions
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 6;

-- Add CHECK constraint for position types
ALTER TABLE public.client_positions
ADD CONSTRAINT check_position_type 
CHECK (position_type IN ('article', 'section', 'subsection', 'header', 'subheader', 'executable'));

-- Add comments
COMMENT ON COLUMN public.client_positions.position_type IS 'Тип позиции: article (статья), section (раздел), subsection (подраздел), header (заголовок), subheader (подзаголовок), executable (исполняемая)';
COMMENT ON COLUMN public.client_positions.hierarchy_level IS 'Уровень иерархии для визуальных отступов (1-6)';

-- Update existing records to executable type (default)
UPDATE public.client_positions 
SET position_type = 'executable', hierarchy_level = 6
WHERE position_type IS NULL;