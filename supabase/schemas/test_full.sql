-- ============================================
-- FULL PRODUCTION SCHEMA FOR TENDERHUB TEST ENVIRONMENT
-- This file contains complete structure: tables, functions, triggers, indexes
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.boq_item_type AS ENUM ('work', 'sub_work', 'material', 'sub_material');
CREATE TYPE public.delivery_price_type AS ENUM ('included', 'not_included', 'amount', 'excluded');
CREATE TYPE public.material_type AS ENUM ('main', 'sub', 'additional');

-- ============================================
-- TABLES
-- ============================================

-- Tenders table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    client_name TEXT NOT NULL,
    tender_number TEXT NOT NULL UNIQUE,
    submission_deadline TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1 NOT NULL,
    area_sp NUMERIC(10,2),
    area_client NUMERIC(10,2),
    usd_rate NUMERIC,
    eur_rate NUMERIC,
    cny_rate NUMERIC,
    upload_folder TEXT,
    bsm_link TEXT,
    tz_clarification_link TEXT,
    qa_form_link TEXT,
    parent_version_id UUID REFERENCES public.tenders(id),
    version_status TEXT DEFAULT 'draft',
    version_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version_created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client positions table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.client_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    position_number INTEGER NOT NULL,
    item_no VARCHAR(10) NOT NULL,
    work_name TEXT NOT NULL,
    unit TEXT,
    volume NUMERIC(12,4),
    manual_volume NUMERIC,
    client_note TEXT,
    manual_note TEXT,
    position_type VARCHAR(50) DEFAULT 'executable',
    hierarchy_level INTEGER DEFAULT 6,
    is_additional BOOLEAN DEFAULT FALSE,
    parent_position_id UUID REFERENCES public.client_positions(id),
    total_materials_cost NUMERIC(15,2) DEFAULT 0,
    total_works_cost NUMERIC(15,2) DEFAULT 0,
    total_commercial_materials_cost NUMERIC(15,2) DEFAULT 0,
    total_commercial_works_cost NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tender_id, position_number)
);

-- BOQ items table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    client_position_id UUID REFERENCES public.client_positions(id) ON DELETE CASCADE,
    item_number TEXT NOT NULL,
    sub_number INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    item_type public.boq_item_type NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity NUMERIC(15,6) NOT NULL,
    unit_rate NUMERIC(15,4) NOT NULL,
    material_id UUID,
    work_id UUID,
    consumption_coefficient NUMERIC(15,8),
    conversion_coefficient NUMERIC(15,8),
    delivery_price_type public.delivery_price_type DEFAULT 'included',
    delivery_amount NUMERIC(12,2) DEFAULT 0,
    base_quantity NUMERIC(12,4),
    detail_cost_category_id UUID,
    total_amount NUMERIC(15,2),
    commercial_cost NUMERIC(15,2) DEFAULT 0 NOT NULL,
    commercial_markup_coefficient NUMERIC(15,8) DEFAULT 1.0 NOT NULL,
    material_type public.material_type DEFAULT 'main',
    currency_type VARCHAR(3) DEFAULT 'RUB',
    currency_rate NUMERIC,
    quote_link TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_at TIMESTAMP WITH TIME ZONE
);

-- Materials library table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.materials_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_id UUID NOT NULL,
    item_type VARCHAR(50),
    material_type VARCHAR(50),
    consumption_coefficient NUMERIC(10,4) DEFAULT 1,
    conversion_coefficient NUMERIC(10,4) DEFAULT 1.0,
    unit_rate NUMERIC(10,2),
    currency_type VARCHAR(10) DEFAULT 'RUB',
    delivery_price_type VARCHAR(20) DEFAULT 'included',
    delivery_amount NUMERIC(10,2),
    quote_link TEXT,
    default_type public.material_type DEFAULT 'main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Works library table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.works_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_id UUID NOT NULL,
    item_type VARCHAR(50),
    unit_rate NUMERIC(10,2),
    currency_type VARCHAR(10) DEFAULT 'RUB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work-material links table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.work_material_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_position_id UUID NOT NULL REFERENCES public.client_positions(id) ON DELETE CASCADE,
    work_boq_item_id UUID REFERENCES public.boq_items(id) ON DELETE CASCADE,
    material_boq_item_id UUID REFERENCES public.boq_items(id) ON DELETE CASCADE,
    sub_work_boq_item_id UUID REFERENCES public.boq_items(id) ON DELETE CASCADE,
    sub_material_boq_item_id UUID REFERENCES public.boq_items(id) ON DELETE CASCADE,
    notes TEXT,
    delivery_price_type public.delivery_price_type DEFAULT 'included',
    delivery_amount NUMERIC(12,2) DEFAULT 0,
    material_quantity_per_work NUMERIC(12,4) DEFAULT 1.0,
    usage_coefficient NUMERIC(12,4) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work-material templates table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.work_material_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    template_description TEXT,
    work_library_id UUID,
    sub_work_library_id UUID,
    material_library_id UUID,
    sub_material_library_id UUID,
    is_linked_to_work BOOLEAN DEFAULT TRUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost categories table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.cost_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detail cost categories table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.detail_cost_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_category_id UUID NOT NULL REFERENCES public.cost_categories(id) ON DELETE CASCADE,
    location_id UUID NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    unit_cost NUMERIC(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commercial costs by category table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.commercial_costs_by_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    detail_cost_category_id UUID NOT NULL,
    direct_materials NUMERIC(15,2) DEFAULT 0,
    direct_works NUMERIC(15,2) DEFAULT 0,
    direct_submaterials NUMERIC(15,2) DEFAULT 0,
    direct_subworks NUMERIC(15,2) DEFAULT 0,
    direct_total NUMERIC(15,2),
    commercial_materials NUMERIC(15,2) DEFAULT 0,
    commercial_works NUMERIC(15,2) DEFAULT 0,
    commercial_submaterials NUMERIC(15,2) DEFAULT 0,
    commercial_subworks NUMERIC(15,2) DEFAULT 0,
    commercial_total NUMERIC(15,2),
    markup_coefficient_materials NUMERIC(10,3),
    markup_coefficient_works NUMERIC(10,3),
    markup_coefficient_submaterials NUMERIC(10,3),
    markup_coefficient_subworks NUMERIC(10,3),
    last_calculation_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tender_id, detail_cost_category_id)
);

-- Tender markup percentages table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.tender_markup_percentages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    works_16_markup NUMERIC(5,2) DEFAULT 1.6,
    works_cost_growth NUMERIC(5,2) DEFAULT 5.00,
    materials_cost_growth NUMERIC(5,2) DEFAULT 3.00,
    subcontract_works_cost_growth NUMERIC(5,2) DEFAULT 7.00,
    subcontract_materials_cost_growth NUMERIC(5,2) DEFAULT 4.00,
    contingency_costs NUMERIC(5,2) DEFAULT 2.00,
    overhead_own_forces NUMERIC(5,2) DEFAULT 8.00,
    overhead_subcontract NUMERIC(5,2) DEFAULT 6.00,
    general_costs_without_subcontract NUMERIC(5,2) DEFAULT 5.00,
    profit_own_forces NUMERIC(5,2) DEFAULT 12.00,
    profit_subcontract NUMERIC(5,2) DEFAULT 8.00,
    mechanization_service NUMERIC(5,2) DEFAULT 0.00,
    mbp_gsm NUMERIC(5,2) DEFAULT 0.00,
    warranty_period NUMERIC(5,2) DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for active markup records per tender
CREATE UNIQUE INDEX IF NOT EXISTS tender_markup_active_unique
    ON public.tender_markup_percentages(tender_id)
    WHERE is_active = TRUE;

-- Markup templates table
CREATE TABLE IF NOT EXISTS public.markup_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL UNIQUE,
    equipment_rental_percent NUMERIC(5,2) DEFAULT 0,
    overhead_percent NUMERIC(5,2) DEFAULT 0,
    profit_percent NUMERIC(5,2) DEFAULT 0,
    risk_percent NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tender version mappings table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.tender_version_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    new_tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    old_position_id UUID REFERENCES public.client_positions(id) ON DELETE CASCADE,
    new_position_id UUID REFERENCES public.client_positions(id) ON DELETE CASCADE,
    old_position_number TEXT,
    old_work_name TEXT,
    new_position_number TEXT,
    new_work_name TEXT,
    mapping_type TEXT,
    confidence_score NUMERIC(3,2),
    fuzzy_score NUMERIC(3,2),
    context_score NUMERIC(3,2),
    hierarchy_score NUMERIC(3,2),
    mapping_status TEXT DEFAULT 'suggested',
    action_type TEXT,
    is_dop BOOLEAN DEFAULT FALSE,
    parent_mapping_id UUID,
    notes TEXT,
    old_volume NUMERIC,
    old_unit TEXT,
    old_client_note TEXT,
    old_item_no TEXT,
    new_volume NUMERIC,
    new_unit TEXT,
    new_client_note TEXT,
    new_item_no TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(new_position_id)
);

-- Tender version history table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.tender_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    positions_added INTEGER,
    positions_removed INTEGER,
    positions_modified INTEGER,
    dop_transferred INTEGER,
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- BOQ item version mappings table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.boq_item_version_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE CASCADE,
    new_boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE CASCADE,
    old_tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    new_tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    position_mapping_id UUID REFERENCES public.tender_version_mappings(id),
    mapping_type TEXT DEFAULT 'auto',
    item_number TEXT,
    description TEXT,
    item_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    title TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost nodes table (FULL STRUCTURE)
CREATE TABLE IF NOT EXISTS public.cost_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.cost_nodes(id),
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    unit_id UUID,
    location_id UUID REFERENCES public.location(id),
    sort_order INTEGER DEFAULT 100 NOT NULL,
    path LTREE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units table
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    title TEXT NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_boq_items_tender_id ON public.boq_items(tender_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_client_position_id ON public.boq_items(client_position_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_material_id ON public.boq_items(material_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_work_id ON public.boq_items(work_id);
CREATE INDEX IF NOT EXISTS idx_client_positions_tender_id ON public.client_positions(tender_id);
CREATE INDEX IF NOT EXISTS idx_work_material_links_client_position_id ON public.work_material_links(client_position_id);
CREATE INDEX IF NOT EXISTS idx_cost_nodes_parent_id ON public.cost_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_nodes_path ON public.cost_nodes USING GIST(path);

-- ============================================
-- FUNCTIONS (User-defined only, excluding ltree/pg_trgm system functions)
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate fuzzy score for position matching
CREATE OR REPLACE FUNCTION public.calculate_fuzzy_score(str1 text, str2 text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_str1 TEXT;
    v_str2 TEXT;
    v_distance INTEGER;
    v_max_length INTEGER;
BEGIN
    -- Нормализация строк
    v_str1 := LOWER(TRIM(COALESCE(str1, '')));
    v_str2 := LOWER(TRIM(COALESCE(str2, '')));

    -- Если обе строки пустые
    IF v_str1 = '' AND v_str2 = '' THEN
        RETURN 1.0;
    END IF;

    -- Если одна из строк пустая
    IF v_str1 = '' OR v_str2 = '' THEN
        RETURN 0.0;
    END IF;

    -- Если строки идентичны
    IF v_str1 = v_str2 THEN
        RETURN 1.0;
    END IF;

    -- Вычисляем расстояние Левенштейна
    v_distance := levenshtein(v_str1, v_str2);
    v_max_length := GREATEST(LENGTH(v_str1), LENGTH(v_str2));

    -- Возвращаем нормализованный score
    RETURN GREATEST(0, 1.0 - (v_distance::NUMERIC / v_max_length::NUMERIC));
END;
$$;

-- Get next position number
CREATE OR REPLACE FUNCTION public.get_next_position_number(p_tender_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_position_number INTEGER;
BEGIN
  PERFORM 1 FROM public.tenders WHERE id = p_tender_id FOR UPDATE;

  SELECT COALESCE(MAX(position_number), 0) + 1
  INTO v_next_position_number
  FROM public.client_positions
  WHERE tender_id = p_tender_id;

  RETURN v_next_position_number;
END;
$$;

-- Recalculate client position totals
CREATE OR REPLACE FUNCTION public.recalculate_client_position_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    position_id UUID;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
    commercial_materials_total DECIMAL(15,2);
    commercial_works_total DECIMAL(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        position_id = OLD.client_position_id;
    ELSE
        position_id = NEW.client_position_id;
    END IF;

    IF position_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
    FROM public.boq_items
    WHERE client_position_id = position_id
    AND item_type IN ('material', 'sub_material');

    SELECT COALESCE(SUM(total_amount), 0) INTO works_total
    FROM public.boq_items
    WHERE client_position_id = position_id
    AND item_type IN ('work', 'sub_work');

    SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_materials_total
    FROM public.boq_items
    WHERE client_position_id = position_id
    AND item_type IN ('material', 'sub_material');

    SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_works_total
    FROM public.boq_items
    WHERE client_position_id = position_id
    AND item_type IN ('work', 'sub_work');

    UPDATE public.client_positions
    SET
        total_materials_cost = materials_total,
        total_works_cost = works_total,
        total_commercial_materials_cost = commercial_materials_total,
        total_commercial_works_cost = commercial_works_total,
        updated_at = NOW()
    WHERE id = position_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update linked material total amount
CREATE OR REPLACE FUNCTION public.update_linked_material_total_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_work RECORD;
    v_material RECORD;
    new_quantity DECIMAL(15,2);
    new_total DECIMAL(15,2);
    material_id UUID;
    work_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        material_id := COALESCE(OLD.material_boq_item_id, OLD.sub_material_boq_item_id);
        work_id := COALESCE(OLD.work_boq_item_id, OLD.sub_work_boq_item_id);
        RETURN OLD;
    ELSE
        material_id := COALESCE(NEW.material_boq_item_id, NEW.sub_material_boq_item_id);
        work_id := COALESCE(NEW.work_boq_item_id, NEW.sub_work_boq_item_id);
    END IF;

    IF material_id IS NULL OR work_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT quantity INTO v_work FROM boq_items WHERE id = work_id;

    SELECT
        unit_rate, currency_type, currency_rate,
        delivery_price_type, delivery_amount,
        consumption_coefficient, conversion_coefficient
    INTO v_material FROM boq_items WHERE id = material_id;

    new_quantity := COALESCE(v_work.quantity, 0) *
                   COALESCE(v_material.consumption_coefficient, NEW.material_quantity_per_work, 1) *
                   COALESCE(v_material.conversion_coefficient, NEW.usage_coefficient, 1);

    new_total := new_quantity * COALESCE(v_material.unit_rate, 0) *
                CASE WHEN v_material.currency_type IS NOT NULL AND v_material.currency_type != 'RUB'
                     THEN COALESCE(v_material.currency_rate, 1) ELSE 1 END;

    new_total := new_total + CASE
        WHEN v_material.delivery_price_type = 'amount' THEN
            COALESCE(v_material.delivery_amount, 0) * new_quantity
        WHEN v_material.delivery_price_type = 'not_included' THEN new_total * 0.03
        ELSE 0
    END;

    UPDATE boq_items SET quantity = new_quantity, total_amount = new_total, updated_at = NOW()
    WHERE id = material_id;

    RETURN NEW;
END;
$$;

-- Trigger function: recalc position on work_material_links change
CREATE OR REPLACE FUNCTION public.trigger_recalc_position_on_wml_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_position_id UUID;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
    commercial_materials_total DECIMAL(15,2);
    commercial_works_total DECIMAL(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_position_id := OLD.client_position_id;
    ELSE
        v_position_id := NEW.client_position_id;
    END IF;

    IF v_position_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('material', 'sub_material');

    SELECT COALESCE(SUM(total_amount), 0) INTO works_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('work', 'sub_work');

    SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_materials_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('material', 'sub_material');

    SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_works_total
    FROM boq_items WHERE client_position_id = v_position_id
    AND item_type IN ('work', 'sub_work');

    UPDATE client_positions SET
        total_materials_cost = materials_total,
        total_works_cost = works_total,
        total_commercial_materials_cost = commercial_materials_total,
        total_commercial_works_cost = commercial_works_total,
        updated_at = NOW()
    WHERE id = v_position_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create tender version
CREATE OR REPLACE FUNCTION public.create_tender_version(p_parent_tender_id uuid, p_created_by uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_tender_id UUID;
    v_parent_tender RECORD;
    v_new_version INTEGER;
    v_new_tender_number TEXT;
    v_counter INTEGER := 2;
BEGIN
    SELECT * INTO v_parent_tender
    FROM tenders
    WHERE id = p_parent_tender_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent tender not found: %', p_parent_tender_id;
    END IF;

    SELECT COALESCE(MAX(version), 1) + 1 INTO v_new_version
    FROM tenders
    WHERE id = p_parent_tender_id
       OR parent_version_id = p_parent_tender_id;

    v_new_tender_number := v_parent_tender.tender_number || '_v' || v_new_version;

    WHILE EXISTS (SELECT 1 FROM tenders WHERE tender_number = v_new_tender_number) LOOP
        v_new_tender_number := v_parent_tender.tender_number || '_v' || v_new_version || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    INSERT INTO tenders (
        title, description, client_name, tender_number, submission_deadline,
        area_sp, area_client, usd_rate, eur_rate, cny_rate,
        upload_folder, bsm_link, tz_clarification_link, qa_form_link,
        version, parent_version_id, version_status, version_created_by
    )
    SELECT
        title, description, client_name, v_new_tender_number, submission_deadline,
        area_sp, area_client, usd_rate, eur_rate, cny_rate,
        upload_folder, bsm_link, tz_clarification_link, qa_form_link,
        v_new_version, p_parent_tender_id, 'draft', p_created_by
    FROM tenders
    WHERE id = p_parent_tender_id
    RETURNING id INTO v_new_tender_id;

    INSERT INTO tender_version_history (
        tender_id, version_number, action, details, performed_by
    ) VALUES (
        v_new_tender_id, v_new_version, 'created',
        jsonb_build_object(
            'parent_tender_id', p_parent_tender_id,
            'parent_version', v_parent_tender.version
        ),
        p_created_by
    );

    RETURN v_new_tender_id;
END;
$$;

-- Transfer work material links
CREATE OR REPLACE FUNCTION public.transfer_work_material_links(p_old_position_id uuid, p_new_position_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_link RECORD;
    v_old_boq RECORD;
    v_new_work_id UUID;
    v_new_mat_id UUID;
    v_new_sub_work_id UUID;
    v_new_sub_mat_id UUID;
    v_links_count INTEGER := 0;
BEGIN
    DELETE FROM work_material_links WHERE client_position_id = p_new_position_id;

    FOR v_link IN
        SELECT * FROM work_material_links
        WHERE client_position_id = p_old_position_id
    LOOP
        IF v_link.work_boq_item_id IS NOT NULL THEN
            SELECT b_old.sub_number INTO v_old_boq
            FROM boq_items b_old WHERE b_old.id = v_link.work_boq_item_id;

            SELECT id INTO v_new_work_id FROM boq_items
            WHERE client_position_id = p_new_position_id
            AND sub_number = v_old_boq.sub_number
            AND item_type IN ('work', 'sub_work')
            LIMIT 1;
        END IF;

        IF v_link.material_boq_item_id IS NOT NULL THEN
            SELECT b_old.sub_number INTO v_old_boq
            FROM boq_items b_old WHERE b_old.id = v_link.material_boq_item_id;

            SELECT id INTO v_new_mat_id FROM boq_items
            WHERE client_position_id = p_new_position_id
            AND sub_number = v_old_boq.sub_number
            AND item_type IN ('material', 'sub_material')
            LIMIT 1;
        END IF;

        IF v_link.sub_work_boq_item_id IS NOT NULL THEN
            SELECT b_old.sub_number INTO v_old_boq
            FROM boq_items b_old WHERE b_old.id = v_link.sub_work_boq_item_id;

            SELECT id INTO v_new_sub_work_id FROM boq_items
            WHERE client_position_id = p_new_position_id
            AND sub_number = v_old_boq.sub_number
            AND item_type = 'sub_work'
            LIMIT 1;
        END IF;

        IF v_link.sub_material_boq_item_id IS NOT NULL THEN
            SELECT b_old.sub_number INTO v_old_boq
            FROM boq_items b_old WHERE b_old.id = v_link.sub_material_boq_item_id;

            SELECT id INTO v_new_sub_mat_id FROM boq_items
            WHERE client_position_id = p_new_position_id
            AND sub_number = v_old_boq.sub_number
            AND item_type = 'sub_material'
            LIMIT 1;
        END IF;

        IF (v_new_work_id IS NOT NULL AND v_new_mat_id IS NOT NULL) OR
           (v_new_work_id IS NOT NULL AND v_new_sub_mat_id IS NOT NULL) OR
           (v_new_sub_work_id IS NOT NULL AND v_new_mat_id IS NOT NULL) OR
           (v_new_sub_work_id IS NOT NULL AND v_new_sub_mat_id IS NOT NULL) THEN

            INSERT INTO work_material_links (
                client_position_id, work_boq_item_id, material_boq_item_id,
                sub_work_boq_item_id, sub_material_boq_item_id, notes,
                delivery_price_type, delivery_amount, material_quantity_per_work,
                usage_coefficient, created_at, updated_at
            )
            VALUES (
                p_new_position_id, v_new_work_id, v_new_mat_id,
                v_new_sub_work_id, v_new_sub_mat_id, v_link.notes,
                v_link.delivery_price_type, v_link.delivery_amount,
                v_link.material_quantity_per_work, v_link.usage_coefficient,
                now(), now()
            )
            ON CONFLICT DO NOTHING;

            v_links_count := v_links_count + 1;
        END IF;
    END LOOP;

    RETURN v_links_count;
END;
$$;

-- Transfer BOQ with mapping
CREATE OR REPLACE FUNCTION public.transfer_boq_with_mapping(p_mapping_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_mapping RECORD;
    v_old_boq RECORD;
    v_new_position RECORD;
    v_old_position RECORD;
    v_inserted_count INTEGER := 0;
    v_links_result JSON;
BEGIN
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF v_mapping IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mapping not found');
    END IF;

    SELECT * INTO v_new_position
    FROM client_positions
    WHERE id = v_mapping.new_position_id;

    SELECT * INTO v_old_position
    FROM client_positions
    WHERE id = v_mapping.old_position_id;

    DELETE FROM boq_items
    WHERE client_position_id = v_mapping.new_position_id;

    FOR v_old_boq IN
        SELECT * FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id
        ORDER BY sort_order, item_number
    LOOP
        INSERT INTO boq_items (
            tender_id, client_position_id, item_number, sub_number,
            sort_order, item_type, description, unit, quantity, unit_rate,
            material_id, work_id, consumption_coefficient, conversion_coefficient,
            delivery_price_type, delivery_amount, base_quantity,
            detail_cost_category_id, total_amount,
            currency_type, currency_rate,
            created_at, updated_at
        )
        VALUES (
            v_mapping.new_tender_id, v_mapping.new_position_id,
            v_new_position.position_number || '.' || v_old_boq.sub_number,
            v_old_boq.sub_number,
            v_old_boq.sort_order, v_old_boq.item_type, v_old_boq.description,
            v_old_boq.unit, v_old_boq.quantity, v_old_boq.unit_rate,
            v_old_boq.material_id, v_old_boq.work_id,
            v_old_boq.consumption_coefficient, v_old_boq.conversion_coefficient,
            v_old_boq.delivery_price_type, v_old_boq.delivery_amount, v_old_boq.base_quantity,
            v_old_boq.detail_cost_category_id, v_old_boq.total_amount,
            v_old_boq.currency_type, v_old_boq.currency_rate,
            now(), now()
        );

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    IF v_old_position.manual_volume IS NOT NULL OR v_old_position.manual_note IS NOT NULL THEN
        UPDATE client_positions
        SET
            manual_volume = v_old_position.manual_volume,
            manual_note = v_old_position.manual_note
        WHERE id = v_mapping.new_position_id;
    END IF;

    BEGIN
        v_links_result := json_build_object('links_transferred', transfer_work_material_links(
            v_mapping.old_position_id,
            v_mapping.new_position_id
        ));
    EXCEPTION
        WHEN OTHERS THEN
            v_links_result := json_build_object('links_transferred', 0);
    END;

    IF v_inserted_count > 0 OR (v_links_result->>'links_transferred')::int > 0 THEN
        UPDATE tender_version_mappings
        SET
            mapping_status = 'applied',
            updated_at = now()
        WHERE id = p_mapping_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'boq_items_mapped', v_inserted_count,
        'links_transferred', COALESCE((v_links_result->>'links_transferred')::int, 0),
        'manual_fields_transferred', (v_old_position.manual_volume IS NOT NULL OR v_old_position.manual_note IS NOT NULL),
        'mapping_id', p_mapping_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'mapping_id', p_mapping_id
        );
END;
$$;

-- Transfer DOP positions
CREATE OR REPLACE FUNCTION public.transfer_dop_positions(p_new_tender_id uuid, p_old_tender_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_dop_count INTEGER := 0;
    v_boq_count INTEGER := 0;
    v_total_boq INTEGER := 0;
    v_new_dop_position RECORD;
BEGIN
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
    LOOP
        v_new_parent_id := NULL;

        IF v_dop_position.parent_position_id IS NOT NULL THEN
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        INSERT INTO client_positions (
            tender_id, position_number, item_no, work_name, parent_position_id, is_additional,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, created_at, updated_at
        )
        SELECT
            p_new_tender_id, position_number, item_no, work_name, v_new_parent_id, true,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, now(), now()
        FROM client_positions
        WHERE id = v_dop_position.id
        ON CONFLICT (tender_id, position_number) DO NOTHING
        RETURNING id INTO v_new_dop_id;

        IF v_new_dop_id IS NOT NULL THEN
            v_dop_count := v_dop_count + 1;

            SELECT * INTO v_new_dop_position
            FROM client_positions
            WHERE id = v_new_dop_id;

            INSERT INTO boq_items (
                tender_id, client_position_id, item_number, sub_number,
                sort_order, item_type, description, unit, quantity, unit_rate,
                material_id, work_id, consumption_coefficient, conversion_coefficient,
                delivery_price_type, delivery_amount, base_quantity,
                detail_cost_category_id, total_amount,
                currency_type, currency_rate,
                created_at, updated_at
            )
            SELECT
                p_new_tender_id,
                v_new_dop_id,
                v_new_dop_position.position_number || '.' || sub_number,
                sub_number,
                sort_order, item_type, description, unit, quantity, unit_rate,
                material_id, work_id, consumption_coefficient, conversion_coefficient,
                delivery_price_type, delivery_amount, base_quantity,
                detail_cost_category_id, total_amount,
                currency_type, currency_rate,
                now(), now()
            FROM boq_items
            WHERE client_position_id = v_dop_position.id;

            GET DIAGNOSTICS v_boq_count = ROW_COUNT;
            v_total_boq := v_total_boq + v_boq_count;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'dopCount', v_dop_count,
        'boqCount', v_total_boq
    );
END;
$$;

-- Complete version transfer with links
CREATE OR REPLACE FUNCTION public.complete_version_transfer_with_links(p_old_tender_id uuid, p_new_tender_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_mapping RECORD;
    v_result JSON;
    v_total_boq INTEGER := 0;
    v_total_positions INTEGER := 0;
    v_total_links INTEGER := 0;
    v_dop_result JSON;
    v_old_boq RECORD;
    v_new_boq_id UUID;
    v_dop_count INTEGER := 0;
    v_new_dop_id UUID;
    v_new_parent_id UUID;
    v_new_position RECORD;
    v_manual_updated INTEGER := 0;
    v_link_count INTEGER;
BEGIN
    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
        AND old_position_id IS NOT NULL
        AND new_position_id IS NOT NULL
        AND mapping_status != 'rejected'
    LOOP
        SELECT * INTO v_new_position
        FROM client_positions
        WHERE id = v_mapping.new_position_id;

        BEGIN
            v_result := transfer_boq_with_mapping(v_mapping.id);

            IF (v_result->>'success')::boolean THEN
                v_total_boq := v_total_boq + COALESCE((v_result->>'boq_items_mapped')::integer, 0);
                v_total_positions := v_total_positions + 1;
            END IF;
        EXCEPTION
            WHEN undefined_function THEN
                DELETE FROM boq_items WHERE client_position_id = v_mapping.new_position_id;

                FOR v_old_boq IN
                    SELECT * FROM boq_items
                    WHERE client_position_id = v_mapping.old_position_id
                LOOP
                    INSERT INTO boq_items (
                        tender_id, client_position_id, item_number, sub_number,
                        sort_order, item_type, description, unit, quantity, unit_rate,
                        material_id, work_id, consumption_coefficient, conversion_coefficient,
                        delivery_price_type, delivery_amount, base_quantity,
                        detail_cost_category_id, total_amount,
                        currency_type, currency_rate,
                        created_at, updated_at
                    )
                    VALUES (
                        p_new_tender_id,
                        v_mapping.new_position_id,
                        v_new_position.position_number || '.' || v_old_boq.sub_number,
                        v_old_boq.sub_number,
                        v_old_boq.sort_order,
                        v_old_boq.item_type,
                        v_old_boq.description,
                        v_old_boq.unit,
                        v_old_boq.quantity,
                        v_old_boq.unit_rate,
                        v_old_boq.material_id,
                        v_old_boq.work_id,
                        v_old_boq.consumption_coefficient,
                        v_old_boq.conversion_coefficient,
                        v_old_boq.delivery_price_type,
                        v_old_boq.delivery_amount,
                        v_old_boq.base_quantity,
                        v_old_boq.detail_cost_category_id,
                        v_old_boq.total_amount,
                        v_old_boq.currency_type,
                        v_old_boq.currency_rate,
                        now(),
                        now()
                    );

                    v_total_boq := v_total_boq + 1;
                END LOOP;

                v_total_positions := v_total_positions + 1;
        END;
    END LOOP;

    UPDATE client_positions new_pos
    SET
        manual_volume = old_pos.manual_volume,
        manual_note = old_pos.manual_note
    FROM client_positions old_pos
    JOIN tender_version_mappings tvm ON tvm.old_position_id = old_pos.id
    WHERE tvm.new_position_id = new_pos.id
      AND tvm.new_tender_id = p_new_tender_id
      AND (old_pos.manual_volume IS NOT NULL OR old_pos.manual_note IS NOT NULL);

    GET DIAGNOSTICS v_manual_updated = ROW_COUNT;

    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
        AND old_position_id IS NOT NULL
        AND new_position_id IS NOT NULL
    LOOP
        v_link_count := transfer_work_material_links(v_mapping.old_position_id, v_mapping.new_position_id);
        v_total_links := v_total_links + v_link_count;
    END LOOP;

    v_dop_result := transfer_dop_positions(p_new_tender_id, p_old_tender_id);

    RETURN json_build_object(
        'success', true,
        'positions_transferred', v_total_positions,
        'boq_items_transferred', v_total_boq,
        'manual_fields_updated', v_manual_updated,
        'dop_result', v_dop_result,
        'links_transferred', v_total_links
    );
END;
$$;

-- Cleanup draft versions
CREATE OR REPLACE FUNCTION public.cleanup_draft_versions(p_parent_tender_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM tenders
        WHERE parent_version_id = p_parent_tender_id
          AND version_status = 'draft'
          AND NOT EXISTS (
              SELECT 1 FROM client_positions cp
              WHERE cp.tender_id = tenders.id
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    RETURN v_deleted_count;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_tenders_updated_at ON public.tenders;
DROP TRIGGER IF EXISTS update_client_positions_updated_at ON public.client_positions;
DROP TRIGGER IF EXISTS update_boq_items_updated_at ON public.boq_items;
DROP TRIGGER IF EXISTS update_materials_library_updated_at ON public.materials_library;
DROP TRIGGER IF EXISTS update_works_library_updated_at ON public.works_library;
DROP TRIGGER IF EXISTS update_work_material_templates_updated_at ON public.work_material_templates;
DROP TRIGGER IF EXISTS recalculate_position_totals_trigger ON public.boq_items;
DROP TRIGGER IF EXISTS update_linked_material_total_trigger ON public.work_material_links;
DROP TRIGGER IF EXISTS recalc_position_on_wml_change_trigger ON public.work_material_links;

-- Update updated_at timestamps
CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON public.tenders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_positions_updated_at BEFORE UPDATE ON public.client_positions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boq_items_updated_at BEFORE UPDATE ON public.boq_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_library_updated_at BEFORE UPDATE ON public.materials_library
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_works_library_updated_at BEFORE UPDATE ON public.works_library
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_material_templates_updated_at BEFORE UPDATE ON public.work_material_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_work_material_templates_updated_at();

-- Recalculate position totals on BOQ changes
CREATE TRIGGER recalculate_position_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.boq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_client_position_totals();

-- Update linked material total amount when work_material_links change
CREATE TRIGGER update_linked_material_total_trigger
    AFTER INSERT OR UPDATE ON public.work_material_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_linked_material_total_amount();

-- Recalculate position totals when work_material_links change
CREATE TRIGGER recalc_position_on_wml_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.work_material_links
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalc_position_on_wml_change();

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Insert default cost categories
INSERT INTO public.cost_categories (name) VALUES
('Материалы'),
('Работы'),
('Оборудование')
ON CONFLICT DO NOTHING;

-- Insert default markup template
INSERT INTO public.markup_templates (template_name, equipment_rental_percent, overhead_percent, profit_percent, risk_percent) VALUES
('По умолчанию', 15.0, 20.0, 15.0, 5.0)
ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- COMPLETE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'TenderHub FULL test schema created successfully!';
    RAISE NOTICE 'All tables, functions, triggers, and indexes have been created.';
END $$;
