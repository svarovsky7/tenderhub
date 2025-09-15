-- Add category column to works_library table
ALTER TABLE public.works_library
ADD COLUMN IF NOT EXISTS category VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN public.works_library.category IS 'Category of the work item (e.g., Installation works, Electrical installation, etc.)';

-- Optionally, you can add some default categories to existing records
-- UPDATE public.works_library SET category = 'Other works' WHERE category IS NULL;