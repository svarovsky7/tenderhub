-- Supabase initial schema for TenderHub

-- Enum types
create type user_role as enum ('admin', 'engineer', 'viewer');
create type item_type as enum ('work', 'material', 'sub_work', 'sub_material');
create type tender_status as enum ('draft','active','closed');
create type cost_scenario as enum ('base','best','worst');

-- Profiles table extends auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generic updated_at trigger
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
before update on profiles
for each row execute procedure handle_updated_at();

-- Tenders
create table if not exists tenders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status tender_status not null default 'draft',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tenders_updated_at
before update on tenders
for each row execute procedure handle_updated_at();

-- Assignment of users to tenders
create table if not exists tender_users (
  tender_id uuid references tenders(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  tender_role user_role not null default 'engineer',
  primary key (tender_id, user_id)
);

-- Libraries
create table if not exists lib_works (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  unit text,
  coef numeric default 1,
  price_unit numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lib_works_updated_at
before update on lib_works
for each row execute procedure handle_updated_at();

create table if not exists lib_materials (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  unit text,
  coef numeric default 1,
  price_unit numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lib_materials_updated_at
before update on lib_materials
for each row execute procedure handle_updated_at();

-- BOQ rows
create table if not exists tender_rows (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  parent_id uuid references tender_rows(id) on delete cascade,
  position integer,
  item_type item_type not null,
  name text not null,
  unit text,
  quantity numeric not null default 0,
  coef numeric not null default 1,
  price_unit numeric not null default 0,
  total numeric generated always as (quantity * coef * price_unit) stored,
  work_id uuid references lib_works(id),
  material_id uuid references lib_materials(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 0
);

create index if not exists tender_rows_tender_id_idx on tender_rows (tender_id);
create trigger tender_rows_updated_at
before update on tender_rows
for each row execute procedure handle_updated_at();

-- Files metadata
create table if not exists tender_files (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  path text not null,
  version integer not null default 1,
  file_type text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

create index if not exists tender_files_tender_id_idx on tender_files (tender_id);

-- History log
create table if not exists history_log (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references tenders(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists history_log_tender_id_idx on history_log (tender_id);

-- Commercial cost parameters
create table if not exists tender_costs (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  scenario cost_scenario not null,
  overhead_pct numeric not null default 0,
  risk_pct numeric not null default 0,
  margin_pct numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tender_costs_tender_id_idx on tender_costs (tender_id);

-- Row Level Security policies
alter table profiles enable row level security;
create policy "Profiles are viewable by owner" on profiles
for select using (auth.uid() = id);
create policy "Profiles can insert own record" on profiles
for insert with check (auth.uid() = id);
create policy "Profiles can update own record" on profiles
for update using (auth.uid() = id);

alter table tenders enable row level security;
create policy "Tenders viewable by assigned" on tenders
for select using (
  exists (
    select 1 from tender_users tu
    where tu.tender_id = id and tu.user_id = auth.uid()
  )
);
create policy "Tenders insertable by owner" on tenders
for insert with check (auth.uid() = created_by);
create policy "Tenders updatable by assigned" on tenders
for update using (
  exists (
    select 1 from tender_users tu
    where tu.tender_id = id and tu.user_id = auth.uid()
  )
);

alter table tender_rows enable row level security;
create policy "Rows viewable by assigned" on tender_rows
for select using (
  exists (
    select 1 from tender_users tu
    where tu.tender_id = tender_rows.tender_id and tu.user_id = auth.uid()
  )
);
create policy "Rows updatable by assigned" on tender_rows
for update using (
  exists (
    select 1 from tender_users tu
    where tu.tender_id = tender_rows.tender_id and tu.user_id = auth.uid()
  )
);

