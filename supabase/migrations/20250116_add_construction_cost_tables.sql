-- Миграция для создания таблиц затрат на строительство

-- Таблица категорий затрат
create table if not exists public.cost_categories (
    id uuid primary key default gen_random_uuid(),
    code text,
    name text not null,
    unit text,
    description text,
    created_at timestamptz default now()
);

-- Таблица локаций
create table if not exists public.location (
    id uuid primary key default gen_random_uuid(),
    country text,
    region text,
    city text,
    created_at timestamptz default now()
);

-- Таблица детализации затрат
create table if not exists public.detail_cost_categories (
    id uuid primary key default gen_random_uuid(),
    cost_category_id uuid not null references public.cost_categories(id) on delete cascade,
    location_id uuid not null references public.location(id) on delete cascade,
    name text not null,
    unit text,
    unit_cost numeric(12,2),
    created_at timestamptz default now()
);

-- Индексы для ускорения выборок
create index if not exists detail_cost_categories_cost_category_id_idx on public.detail_cost_categories(cost_category_id);
create index if not exists detail_cost_categories_location_id_idx on public.detail_cost_categories(location_id);
