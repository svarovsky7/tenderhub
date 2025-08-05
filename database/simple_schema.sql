-- TenderHub PostgreSQL Schema - SIMPLIFIED VERSION
-- Essential tables for TenderHub functionality without authentication
-- Created: 2025-08-05
--
-- ⚠️  IMPORTANT: NO AUTHENTICATION SYSTEM
-- This schema does NOT include user authentication or authorization.
-- All features are accessible without login.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (drop and recreate to ensure correct values)
DROP TYPE IF EXISTS boq_item_type CASCADE;
CREATE TYPE boq_item_type AS ENUM ('work', 'material');

DROP TYPE IF EXISTS tender_status CASCADE;
CREATE TYPE tender_status AS ENUM ('draft', 'active', 'submitted', 'awarded', 'closed');

DROP TYPE IF EXISTS client_position_status CASCADE;
CREATE TYPE client_position_status AS ENUM ('active', 'inactive', 'completed');

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_estimated_value_positive CHECK (estimated_value >= 0)
);

-- Basic indexes for tenders table
CREATE INDEX idx_tenders_status ON public.tenders(status);
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
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_base_price_positive CHECK (base_price >= 0),
    CONSTRAINT uq_materials_code UNIQUE (code)
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
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_base_price_positive CHECK (base_price >= 0),
    CONSTRAINT chk_labor_component_range CHECK (labor_component >= 0 AND labor_component <= 1),
    CONSTRAINT uq_works_code UNIQUE (code)
);

-- Basic indexes for works library
CREATE INDEX idx_works_library_code ON public.works_library(code);
CREATE INDEX idx_works_library_name ON public.works_library(name);
CREATE INDEX idx_works_library_category ON public.works_library(category);
CREATE INDEX idx_works_library_active ON public.works_library(is_active) WHERE is_active = true;

-- ============================================================================
-- CLIENT POSITIONS TABLE
-- ============================================================================
-- Позиции заказчика - верхний уровень иерархии в тендере
-- Каждая позиция может содержать множество материалов и работ
DROP TABLE IF EXISTS public.client_positions CASCADE;
CREATE TABLE public.client_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    
    -- Нумерация и идентификация
    position_number INTEGER NOT NULL, -- Порядковый номер позиции (1, 2, 3...)
    title TEXT NOT NULL, -- Название позиции от заказчика
    description TEXT, -- Подробное описание позиции
    
    -- Организационные поля
    category TEXT, -- Категория позиции (строительство, материалы, оборудование)
    priority INTEGER DEFAULT 0, -- Приоритет позиции (для сортировки)
    status client_position_status NOT NULL DEFAULT 'active',
    
    -- Вычисляемые поля (будут обновляться триггерами)
    total_materials_cost DECIMAL(15,2) DEFAULT 0, -- Общая стоимость материалов
    total_works_cost DECIMAL(15,2) DEFAULT 0, -- Общая стоимость работ
    
    -- Метаданные
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT chk_position_number_positive CHECK (position_number > 0),
    CONSTRAINT chk_priority_valid CHECK (priority >= 0),
    CONSTRAINT uq_client_positions_tender_number UNIQUE (tender_id, position_number),
    CONSTRAINT uq_client_positions_tender_title UNIQUE (tender_id, title)
);

-- Basic indexes for client_positions
CREATE INDEX idx_client_positions_tender_id ON public.client_positions(tender_id);
CREATE INDEX idx_client_positions_number ON public.client_positions(tender_id, position_number);
CREATE INDEX idx_client_positions_status ON public.client_positions(status);

-- ============================================================================
-- BOQ ITEMS TABLE (Bill of Quantities) - Enhanced with Hierarchy Support
-- ============================================================================
DROP TABLE IF EXISTS public.boq_items CASCADE;
CREATE TABLE public.boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    
    -- Hierarchical structure support
    client_position_id UUID REFERENCES public.client_positions(id) ON DELETE CASCADE,
    item_number TEXT NOT NULL, -- Full format "X.Y" where X - position number, Y - sub number
    sub_number INTEGER DEFAULT 1, -- Sub-number within client position (1, 2, 3...)
    sort_order INTEGER DEFAULT 0, -- Sort order within client position
    
    -- BOQ item details
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_unit_rate_positive CHECK (unit_rate >= 0),
    CONSTRAINT chk_sub_number_positive CHECK (sub_number > 0),
    CONSTRAINT chk_sort_order_valid CHECK (sort_order >= 0),
    CONSTRAINT chk_item_type_reference CHECK (
        (item_type = 'material' AND material_id IS NOT NULL AND work_id IS NULL) OR
        (item_type = 'work' AND work_id IS NOT NULL AND material_id IS NULL) OR
        (item_type IN ('material', 'work') AND material_id IS NULL AND work_id IS NULL)
    ),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (tender_id, item_number),
    CONSTRAINT uq_boq_position_sub_number UNIQUE (client_position_id, sub_number)
);

-- Basic indexes for BOQ items
CREATE INDEX idx_boq_items_tender_id ON public.boq_items(tender_id);
CREATE INDEX idx_boq_items_client_position_id ON public.boq_items(client_position_id);
CREATE INDEX idx_boq_items_item_type ON public.boq_items(item_type);
CREATE INDEX idx_boq_items_material_id ON public.boq_items(material_id) WHERE material_id IS NOT NULL;
CREATE INDEX idx_boq_items_work_id ON public.boq_items(work_id) WHERE work_id IS NOT NULL;

-- ============================================================================
-- UPDATED_AT TRIGGERS
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

CREATE TRIGGER update_client_positions_updated_at
    BEFORE UPDATE ON public.client_positions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- BASIC CALCULATION TRIGGERS (ESSENTIAL ONLY)
-- ============================================================================

-- Function to recalculate client position totals
CREATE OR REPLACE FUNCTION public.recalculate_client_position_totals()
RETURNS TRIGGER AS $$
DECLARE
    position_id UUID;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
BEGIN
    -- Determine position ID for recalculation
    IF TG_OP = 'DELETE' THEN
        position_id = OLD.client_position_id;
    ELSE
        position_id = NEW.client_position_id;
    END IF;
    
    -- Skip if position_id is NULL
    IF position_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Recalculate material costs
    SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
    FROM public.boq_items 
    WHERE client_position_id = position_id AND item_type = 'material';
    
    -- Recalculate work costs
    SELECT COALESCE(SUM(total_amount), 0) INTO works_total
    FROM public.boq_items 
    WHERE client_position_id = position_id AND item_type = 'work';
    
    -- Update client position totals
    UPDATE public.client_positions 
    SET 
        total_materials_cost = materials_total,
        total_works_cost = works_total,
        updated_at = NOW()
    WHERE id = position_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate client position totals
CREATE TRIGGER recalculate_totals_on_boq_change
    AFTER INSERT OR UPDATE OR DELETE ON public.boq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_client_position_totals();

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.tenders IS 'Main tender projects with client details';
COMMENT ON TABLE public.materials_library IS 'Master catalog of materials with pricing';
COMMENT ON TABLE public.works_library IS 'Master catalog of work items with labor components';
COMMENT ON TABLE public.boq_items IS 'Bill of Quantities line items for each tender';
COMMENT ON TABLE public.client_positions IS 'Позиции заказчика - верхний уровень группировки в BOQ';
COMMENT ON COLUMN public.client_positions.position_number IS 'Порядковый номер позиции в тендере (1, 2, 3...)';
COMMENT ON COLUMN public.boq_items.item_number IS 'Полный номер позиции в формате "X.Y" где X - номер позиции заказчика, Y - подномер';
COMMENT ON COLUMN public.boq_items.sub_number IS 'Подномер элемента внутри позиции заказчика (1, 2, 3...)';
COMMENT ON COLUMN public.boq_items.sort_order IS 'Порядок сортировки внутри позиции заказчика';