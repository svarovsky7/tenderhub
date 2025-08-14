-- Добавляем недостающие поля в таблицы cost_categories и location если их нет

-- Добавляем поле description в cost_categories если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cost_categories' AND column_name = 'description') THEN
        ALTER TABLE public.cost_categories ADD COLUMN description text;
    END IF;
END $$;

-- Добавляем поля в location если их нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'location' AND column_name = 'country') THEN
        ALTER TABLE public.location ADD COLUMN country text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'location' AND column_name = 'region') THEN
        ALTER TABLE public.location ADD COLUMN region text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'location' AND column_name = 'city') THEN
        ALTER TABLE public.location ADD COLUMN city text;
    END IF;
END $$;

-- Создаем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_cost_categories_name ON public.cost_categories(name);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_name ON public.detail_cost_categories(name);
CREATE INDEX IF NOT EXISTS idx_location_country ON public.location(country);
CREATE INDEX IF NOT EXISTS idx_location_city ON public.location(city);