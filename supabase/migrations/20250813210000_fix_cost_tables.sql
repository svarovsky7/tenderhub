-- Миграция для исправления структуры таблиц cost_categories и detail_cost_categories

-- 1. Создаем таблицу cost_categories если её нет
CREATE TABLE IF NOT EXISTS public.cost_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    title text,
    unit_id uuid REFERENCES public.units(id),
    order_num integer DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Проверяем и добавляем недостающие колонки в cost_categories
DO $$ 
BEGIN
    -- Добавляем колонку title если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cost_categories' AND column_name = 'title') THEN
        ALTER TABLE public.cost_categories ADD COLUMN title text;
    END IF;
    
    -- Добавляем колонку unit_id если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cost_categories' AND column_name = 'unit_id') THEN
        ALTER TABLE public.cost_categories ADD COLUMN unit_id uuid REFERENCES public.units(id);
    END IF;
    
    -- Добавляем колонку order_num если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cost_categories' AND column_name = 'order_num') THEN
        ALTER TABLE public.cost_categories ADD COLUMN order_num integer DEFAULT 100;
    END IF;
    
    -- Добавляем колонку is_active если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cost_categories' AND column_name = 'is_active') THEN
        ALTER TABLE public.cost_categories ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- 3. Модифицируем таблицу detail_cost_categories для соответствия нашей логике импорта
DO $$ 
BEGIN
    -- Переименовываем cost_category_id в category_id если нужно
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'detail_cost_categories' AND column_name = 'cost_category_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'detail_cost_categories' AND column_name = 'category_id') THEN
        ALTER TABLE public.detail_cost_categories RENAME COLUMN cost_category_id TO category_id;
    END IF;
    
    -- Добавляем колонку title если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'detail_cost_categories' AND column_name = 'title') THEN
        ALTER TABLE public.detail_cost_categories ADD COLUMN title text;
    END IF;
    
    -- Добавляем колонку unit_id если её нет  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'detail_cost_categories' AND column_name = 'unit_id') THEN
        ALTER TABLE public.detail_cost_categories ADD COLUMN unit_id uuid REFERENCES public.units(id);
    END IF;
    
    -- Добавляем колонку sort_order если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'detail_cost_categories' AND column_name = 'sort_order') THEN
        ALTER TABLE public.detail_cost_categories ADD COLUMN sort_order integer DEFAULT 100;
    END IF;
    
    -- Добавляем колонку is_active если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'detail_cost_categories' AND column_name = 'is_active') THEN
        ALTER TABLE public.detail_cost_categories ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    
    -- Делаем location_id необязательным если он обязательный
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'detail_cost_categories' 
               AND column_name = 'location_id' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE public.detail_cost_categories ALTER COLUMN location_id DROP NOT NULL;
    END IF;
END $$;

-- 4. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_cost_categories_name ON public.cost_categories(name);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_category_id ON public.detail_cost_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_name ON public.detail_cost_categories(name);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_location_id ON public.detail_cost_categories(location_id);

-- 5. Отключаем RLS если включен
ALTER TABLE public.cost_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_cost_categories DISABLE ROW LEVEL SECURITY;