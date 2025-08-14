-- Create cost_nodes table if not exists
CREATE TABLE IF NOT EXISTS public.cost_nodes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id uuid REFERENCES public.cost_nodes(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('group', 'item')),
    name text NOT NULL,
    code text,
    unit_id uuid REFERENCES public.units(id),
    location_id uuid REFERENCES public.location(id),
    sort_order integer DEFAULT 100,
    is_active boolean DEFAULT true,
    path text GENERATED ALWAYS AS (
        CASE 
            WHEN parent_id IS NULL THEN id::text
            ELSE parent_id::text || '.' || id::text
        END
    ) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cost_nodes_check_kind_unit CHECK (
        (kind = 'group') OR 
        (kind = 'item')
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cost_nodes_parent_id ON public.cost_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_nodes_kind ON public.cost_nodes(kind);
CREATE INDEX IF NOT EXISTS idx_cost_nodes_name ON public.cost_nodes(name);
CREATE INDEX IF NOT EXISTS idx_cost_nodes_path ON public.cost_nodes(path);
CREATE INDEX IF NOT EXISTS idx_cost_nodes_is_active ON public.cost_nodes(is_active);

-- Add RLS policies (disabled)
ALTER TABLE public.cost_nodes ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since RLS is disabled in the project)
CREATE POLICY "Allow all operations on cost_nodes" ON public.cost_nodes FOR ALL USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cost_nodes_updated_at ON public.cost_nodes;
CREATE TRIGGER update_cost_nodes_updated_at 
    BEFORE UPDATE ON public.cost_nodes 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();