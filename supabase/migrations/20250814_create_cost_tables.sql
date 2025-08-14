-- Создание таблиц для импорта затрат на строительство

-- 1. Таблица категорий затрат
CREATE TABLE IF NOT EXISTS public.cost_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Таблица локализаций
CREATE TABLE IF NOT EXISTS public.location (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    country text,
    region text,
    city text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(country, region, city)
);

-- 3. Таблица детальных категорий затрат
CREATE TABLE IF NOT EXISTS public.detail_cost_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cost_category_id uuid NOT NULL REFERENCES public.cost_categories(id) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES public.location(id) ON DELETE CASCADE,
    name text NOT NULL,
    unit_cost numeric(12,2),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(cost_category_id, name, location_id)
);

-- 4. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_cost_categories_name ON public.cost_categories(name);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_name ON public.detail_cost_categories(name);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_category_id ON public.detail_cost_categories(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_location_id ON public.detail_cost_categories(location_id);
CREATE INDEX IF NOT EXISTS idx_location_country ON public.location(country);
CREATE INDEX IF NOT EXISTS idx_location_city ON public.location(city);

-- 5. Отключаем RLS для всех таблиц
ALTER TABLE public.cost_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.location DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_cost_categories DISABLE ROW LEVEL SECURITY;

-- 6. Даем полные права на таблицы
GRANT ALL ON public.cost_categories TO anon, authenticated;
GRANT ALL ON public.location TO anon, authenticated;
GRANT ALL ON public.detail_cost_categories TO anon, authenticated;

-- 7. Обновляем схему для PostgREST
NOTIFY pgrst, 'reload schema';