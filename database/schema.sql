-- TenderHub PostgreSQL Schema for Supabase - MINIMAL VERSION
-- Essential tables only for basic functionality
-- Created: 2025-08-04
--
-- ⚠️  IMPORTANT: ROW LEVEL SECURITY (RLS) IS DISABLED
-- This schema does NOT use RLS policies. All data access control
-- is handled at the application level through role-based permissions.
-- Do NOT enable RLS on any tables or create RLS policies.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (drop and recreate to ensure correct values)
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('Administrator', 'Engineer', 'View-only');

DROP TYPE IF EXISTS boq_item_type CASCADE;
CREATE TYPE boq_item_type AS ENUM ('work', 'material');

DROP TYPE IF EXISTS tender_status CASCADE;
CREATE TYPE tender_status AS ENUM ('draft', 'active', 'submitted', 'awarded', 'closed');

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'View-only',
    organization_id UUID, -- For multi-tenant support
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Basic indexes for users table
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_active ON public.users(is_active) WHERE is_active = true;

-- ============================================================================
-- TENDERS TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.tenders CASCADE;
CREATE TABLE public.tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    client_name TEXT NOT NULL,
    tender_number TEXT UNIQUE NOT NULL,
    submission_deadline TIMESTAMPTZ,
    estimated_value DECIMAL(15,2),
    status tender_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES public.users(id),
    organization_id UUID, -- For multi-tenant support
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_estimated_value_positive CHECK (estimated_value >= 0)
);

-- Basic indexes for tenders table
CREATE INDEX idx_tenders_status ON public.tenders(status);
CREATE INDEX idx_tenders_created_by ON public.tenders(created_by);
CREATE INDEX idx_tenders_tender_number ON public.tenders(tender_number);
CREATE INDEX idx_tenders_created_at ON public.tenders(created_at DESC);

-- ============================================================================
-- MATERIALS LIBRARY TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.materials_library CASCADE;
CREATE TABLE public.materials_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL, -- e.g., 'kg', 'm', 'pcs', 'sqm'
    base_price DECIMAL(12,4) NOT NULL,
    supplier TEXT,
    category TEXT,
    organization_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_base_price_positive CHECK (base_price >= 0),
    CONSTRAINT uq_materials_org_code UNIQUE (organization_id, code)
);

-- Basic indexes for materials library
CREATE INDEX idx_materials_library_code ON public.materials_library(code);
CREATE INDEX idx_materials_library_name ON public.materials_library(name);
CREATE INDEX idx_materials_library_category ON public.materials_library(category);
CREATE INDEX idx_materials_library_active ON public.materials_library(is_active) WHERE is_active = true;

-- ============================================================================
-- WORKS LIBRARY TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.works_library CASCADE;
CREATE TABLE public.works_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL, -- e.g., 'sqm', 'lm', 'pcs', 'lot'
    base_price DECIMAL(12,4) NOT NULL,
    labor_component DECIMAL(5,4) DEFAULT 0.5, -- Percentage of labor in total cost
    category TEXT,
    organization_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_base_price_positive CHECK (base_price >= 0),
    CONSTRAINT chk_labor_component_range CHECK (labor_component >= 0 AND labor_component <= 1),
    CONSTRAINT uq_works_org_code UNIQUE (organization_id, code)
);

-- Basic indexes for works library
CREATE INDEX idx_works_library_code ON public.works_library(code);
CREATE INDEX idx_works_library_name ON public.works_library(name);
CREATE INDEX idx_works_library_category ON public.works_library(category);
CREATE INDEX idx_works_library_active ON public.works_library(is_active) WHERE is_active = true;

-- ============================================================================
-- BOQ ITEMS TABLE (Bill of Quantities) - SIMPLIFIED
-- ============================================================================
DROP TABLE IF EXISTS public.boq_items CASCADE;
CREATE TABLE public.boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    item_number TEXT NOT NULL, -- Sequential numbering like "1.1", "1.2", etc.
    item_type boq_item_type NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity DECIMAL(12,4) NOT NULL,
    unit_rate DECIMAL(12,4) NOT NULL,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,

    -- References to library items (nullable for custom items)
    material_id UUID REFERENCES public.materials_library(id),
    work_id UUID REFERENCES public.works_library(id),

    -- Additional fields for BOQ management
    category TEXT,
    subcategory TEXT,
    notes TEXT,

    -- Metadata
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_unit_rate_positive CHECK (unit_rate >= 0),
    CONSTRAINT chk_item_type_reference CHECK (
        (item_type = 'material' AND material_id IS NOT NULL AND work_id IS NULL) OR
        (item_type = 'work' AND work_id IS NOT NULL AND material_id IS NULL) OR
        (item_type IN ('material', 'work') AND material_id IS NULL AND work_id IS NULL)
    ),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (tender_id, item_number)
);

-- Basic indexes for BOQ items
CREATE INDEX idx_boq_items_tender_id ON public.boq_items(tender_id);
CREATE INDEX idx_boq_items_item_type ON public.boq_items(item_type);
CREATE INDEX idx_boq_items_material_id ON public.boq_items(material_id);
CREATE INDEX idx_boq_items_work_id ON public.boq_items(work_id);
CREATE INDEX idx_boq_items_created_by ON public.boq_items(created_by);

-- ============================================================================
-- UPDATED_AT TRIGGERS (MINIMAL)
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenders_updated_at
    BEFORE UPDATE ON public.tenders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_library_updated_at
    BEFORE UPDATE ON public.materials_library
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_works_library_updated_at
    BEFORE UPDATE ON public.works_library
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boq_items_updated_at
    BEFORE UPDATE ON public.boq_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- DISABLE ROW LEVEL SECURITY (EXPLICIT)
-- ============================================================================

-- Explicitly disable RLS on all tables to ensure no RLS policies are active
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.works_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth with roles';
COMMENT ON TABLE public.tenders IS 'Main tender projects with client details';
COMMENT ON TABLE public.materials_library IS 'Master catalog of materials with pricing';
COMMENT ON TABLE public.works_library IS 'Master catalog of work items with labor components';
COMMENT ON TABLE public.boq_items IS 'Bill of Quantities line items for each tender';