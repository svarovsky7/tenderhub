-- Создание правильных таблиц для затрат на строительство

-- 1. Таблица категорий затрат на строительство
CREATE TABLE IF NOT EXISTS public.construction_cost_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    description text,
    parent_id uuid REFERENCES public.construction_cost_categories(id) ON DELETE CASCADE,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Таблица затрат на строительство
CREATE TABLE IF NOT EXISTS public.construction_costs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid REFERENCES public.construction_cost_categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    unit text NOT NULL,
    base_price numeric(12,2) NOT NULL,
    market_price numeric(12,2),
    price_date date,
    supplier text,
    description text,
    specifications jsonb DEFAULT '{}',
    tags text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Таблица истории цен затрат
CREATE TABLE IF NOT EXISTS public.construction_cost_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cost_id uuid NOT NULL REFERENCES public.construction_costs(id) ON DELETE CASCADE,
    price numeric(12,2) NOT NULL,
    price_date date NOT NULL,
    supplier text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid -- For future user tracking
);

-- 4. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_construction_cost_categories_name ON public.construction_cost_categories(name);
CREATE INDEX IF NOT EXISTS idx_construction_cost_categories_code ON public.construction_cost_categories(code);
CREATE INDEX IF NOT EXISTS idx_construction_cost_categories_parent_id ON public.construction_cost_categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_construction_costs_name ON public.construction_costs(name);
CREATE INDEX IF NOT EXISTS idx_construction_costs_code ON public.construction_costs(code);
CREATE INDEX IF NOT EXISTS idx_construction_costs_category_id ON public.construction_costs(category_id);
CREATE INDEX IF NOT EXISTS idx_construction_costs_supplier ON public.construction_costs(supplier);
CREATE INDEX IF NOT EXISTS idx_construction_costs_tags ON public.construction_costs USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_construction_cost_history_cost_id ON public.construction_cost_history(cost_id);
CREATE INDEX IF NOT EXISTS idx_construction_cost_history_price_date ON public.construction_cost_history(price_date);

-- 5. Отключаем RLS для всех таблиц (согласно CLAUDE.md)
ALTER TABLE public.construction_cost_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_cost_history DISABLE ROW LEVEL SECURITY;

-- 6. Даем полные права на таблицы
GRANT ALL ON public.construction_cost_categories TO anon, authenticated;
GRANT ALL ON public.construction_costs TO anon, authenticated;
GRANT ALL ON public.construction_cost_history TO anon, authenticated;

-- 7. Создаем триггеры для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_construction_cost_categories_updated_at 
    BEFORE UPDATE ON public.construction_cost_categories
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_construction_costs_updated_at 
    BEFORE UPDATE ON public.construction_costs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Вставляем тестовые категории
INSERT INTO public.construction_cost_categories (name, code, description, sort_order) VALUES 
    ('Материалы', 'MAT', 'Строительные материалы', 1),
    ('Работы', 'WRK', 'Строительные работы', 2),
    ('Оборудование', 'EQP', 'Строительное оборудование', 3),
    ('Транспорт', 'TRN', 'Транспортные расходы', 4)
ON CONFLICT (code) DO NOTHING;

-- 9. Вставляем тестовые затраты
INSERT INTO public.construction_costs (
    category_id, name, code, unit, base_price, market_price, supplier, description, tags
) 
SELECT 
    cat.id,
    'Бетон М300',
    'MAT-001',
    'м³',
    4500,
    4800,
    'ООО "СтройПоставка"',
    'Бетон марки М300 для фундамента',
    ARRAY['бетон', 'фундамент', 'м300']
FROM public.construction_cost_categories cat
WHERE cat.code = 'MAT'
LIMIT 1
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.construction_costs (
    category_id, name, code, unit, base_price, market_price, supplier, description, tags
) 
SELECT 
    cat.id,
    'Арматура А500С d12',
    'MAT-002', 
    'тн',
    85000,
    87000,
    'ООО "МеталлТрейд"',
    'Арматура класса А500С диаметр 12мм',
    ARRAY['арматура', 'металл', 'а500с']
FROM public.construction_cost_categories cat
WHERE cat.code = 'MAT'
LIMIT 1
ON CONFLICT (code) DO NOTHING;

-- 10. Обновляем схему для PostgREST
NOTIFY pgrst, 'reload schema';