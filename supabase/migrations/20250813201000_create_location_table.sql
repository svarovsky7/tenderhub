-- Create location table if not exists
CREATE TABLE IF NOT EXISTS public.location (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    code text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create index on location
CREATE INDEX IF NOT EXISTS idx_location_title ON public.location(title);
CREATE INDEX IF NOT EXISTS idx_location_code ON public.location(code);

-- Insert default locations if table is empty
INSERT INTO public.location (title, code) 
SELECT * FROM (VALUES
    ('Россия', 'RU'),
    ('Местный', 'LOCAL'),
    ('Китай', 'CN'),
    ('Германия', 'DE'),
    ('США', 'US'),
    ('Япония', 'JP'),
    ('Южная Корея', 'KR'),
    ('Турция', 'TR'),
    ('Италия', 'IT'),
    ('Франция', 'FR'),
    ('Беларусь', 'BY'),
    ('Казахстан', 'KZ'),
    ('Импортный', 'IMPORT')
) AS v(title, code)
WHERE NOT EXISTS (SELECT 1 FROM public.location LIMIT 1);

-- Add RLS policies (disabled)
ALTER TABLE public.location ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since RLS is disabled in the project)
CREATE POLICY "Allow all operations on location" ON public.location FOR ALL USING (true);