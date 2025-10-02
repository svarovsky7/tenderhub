-- ============================================
-- TenderHub Test Database Schema
-- Generated from prod.sql
-- Date: 2025-10-01T12:39:06.943Z
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


-- ============================================
-- ENUMS
-- ============================================

DROP TYPE IF EXISTS public.boq_item_type CASCADE;
CREATE TYPE public.boq_item_type AS ENUM ('work', 'material', 'sub_work', 'sub_material');
DROP TYPE IF EXISTS public.client_position_status CASCADE;
CREATE TYPE public.client_position_status AS ENUM ('active', 'inactive', 'completed');
DROP TYPE IF EXISTS public.delivery_price_type CASCADE;
CREATE TYPE public.delivery_price_type AS ENUM ('included', 'not_included', 'amount');
DROP TYPE IF EXISTS public.material_type CASCADE;
CREATE TYPE public.material_type AS ENUM ('main', 'auxiliary');
DROP TYPE IF EXISTS public.tender_status CASCADE;
CREATE TYPE public.tender_status AS ENUM ('draft', 'active', 'submitted', 'awarded', 'closed');

-- ============================================
-- TABLES
-- ============================================

-- Table: public.boq_item_version_mappings
CREATE TABLE IF NOT EXISTS public.boq_item_version_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    old_boq_item_id uuid NOT NULL,
    new_boq_item_id uuid NOT NULL,
    old_tender_id uuid NOT NULL,
    new_tender_id uuid NOT NULL,
    position_mapping_id uuid,
    mapping_type text DEFAULT 'auto'::text,
    item_number text,
    description text,
    item_type text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT boq_item_version_mappings_new_boq_item_id_fkey FOREIGN KEY (new_boq_item_id) REFERENCES public.boq_items(id),
    CONSTRAINT boq_item_version_mappings_new_tender_id_fkey FOREIGN KEY (new_tender_id) REFERENCES public.tenders(id),
    CONSTRAINT boq_item_version_mappings_old_boq_item_id_fkey FOREIGN KEY (old_boq_item_id) REFERENCES public.boq_items(id),
    CONSTRAINT boq_item_version_mappings_old_tender_id_fkey FOREIGN KEY (old_tender_id) REFERENCES public.tenders(id),
    CONSTRAINT boq_item_version_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT boq_item_version_mappings_position_mapping_id_fkey FOREIGN KEY (position_mapping_id) REFERENCES public.tender_version_mappings(id),
    CONSTRAINT uq_boq_mapping UNIQUE (new_tender_id),
    CONSTRAINT uq_boq_mapping UNIQUE (old_boq_item_id)
);
COMMENT ON TABLE public.boq_item_version_mappings IS 'Маппинг BOQ items между версиями тендеров для корректного переноса work_material_links';


-- Table: public.boq_items
CREATE TABLE IF NOT EXISTS public.boq_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    client_position_id uuid,
    item_number text NOT NULL,
    sub_number integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    item_type public.boq_item_type NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    quantity numeric(15,6) NOT NULL,
    unit_rate numeric(15,4) NOT NULL,
    material_id uuid,
    work_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    imported_at timestamp with time zone,
    consumption_coefficient numeric(15,8),
    conversion_coefficient numeric(15,8),
    delivery_price_type public.delivery_price_type DEFAULT 'included'::delivery_price_type,
    delivery_amount numeric(12,2) DEFAULT 0,
    base_quantity numeric(12,4),
    detail_cost_category_id uuid,
    total_amount numeric(15,2),
    commercial_cost numeric(15,2) NOT NULL DEFAULT 0,
    commercial_markup_coefficient numeric(15,8) NOT NULL DEFAULT 1.0,
    material_type public.material_type DEFAULT 'main'::material_type,
    currency_type character varying(3) DEFAULT 'RUB'::character varying,
    currency_rate numeric,
    quote_link text,
    note text,
    CONSTRAINT boq_items_client_position_id_fkey FOREIGN KEY (client_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT boq_items_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id),
    CONSTRAINT boq_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials_library(id),
    CONSTRAINT boq_items_pkey PRIMARY KEY (id),
    CONSTRAINT boq_items_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT boq_items_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works_library(id),
    CONSTRAINT uq_boq_position_sub_number UNIQUE (client_position_id),
    CONSTRAINT uq_boq_position_sub_number UNIQUE (sub_number),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (item_number),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (tender_id)
);
COMMENT ON TABLE public.boq_items IS 'Bill of Quantities line items for each tender';
COMMENT ON COLUMN public.boq_items.item_number IS 'Полный номер позиции в формате "X.Y" где X - номер позиции заказчика, Y - подномер';
COMMENT ON COLUMN public.boq_items.sub_number IS 'Sequential sub-number within client position (auto-assigned via get_next_sub_number)';
COMMENT ON COLUMN public.boq_items.sort_order IS 'Порядок сортировки внутри позиции заказчика';
COMMENT ON COLUMN public.boq_items.item_type IS 'Type of BOQ item: work, material, sub_work (subcontract work), sub_material (subcontract material)';
COMMENT ON COLUMN public.boq_items.consumption_coefficient IS 'Коэффициент расхода материала';
COMMENT ON COLUMN public.boq_items.conversion_coefficient IS 'Коэффициент перевода единицы измерения материала';
COMMENT ON COLUMN public.boq_items.delivery_price_type IS 'Тип цены доставки материала: included (в цене), not_included (не в цене), amount (сумма)';
COMMENT ON COLUMN public.boq_items.delivery_amount IS 'Сумма доставки материала (используется только при delivery_price_type = amount)';
COMMENT ON COLUMN public.boq_items.base_quantity IS 'Базовое количество, введенное пользователем (без учета коэффициентов)';
COMMENT ON COLUMN public.boq_items.total_amount IS 'Общая стоимость: (unit_rate + delivery_amount) × quantity для материалов, unit_rate × quantity для работ';
COMMENT ON COLUMN public.boq_items.commercial_cost IS 'Коммерческая стоимость работы/материала (рассчитывается автоматически на       

-- Table: public.client_positions
CREATE TABLE IF NOT EXISTS public.client_positions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    position_number integer NOT NULL,
    total_materials_cost numeric(15,2) DEFAULT 0,
    total_works_cost numeric(15,2) DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    unit text,
    volume numeric(12,4),
    client_note text,
    item_no character varying(10) NOT NULL,
    work_name text NOT NULL,
    manual_volume numeric,
    manual_note text,
    position_type character varying(50) DEFAULT 'executable'::character varying,
    hierarchy_level integer DEFAULT 6,
    total_commercial_materials_cost numeric(15,2) DEFAULT 0,
    total_commercial_works_cost numeric(15,2) DEFAULT 0,
    is_additional boolean DEFAULT false,
    parent_position_id uuid,
    CONSTRAINT client_positions_parent_position_id_fkey FOREIGN KEY (parent_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT client_positions_pkey PRIMARY KEY (id),
    CONSTRAINT client_positions_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT uq_client_positions_position_tender UNIQUE (position_number),
    CONSTRAINT uq_client_positions_position_tender UNIQUE (tender_id)
);
COMMENT ON TABLE public.client_positions IS 'Позиции заказчика из Excel файла - верхний уровень группировки в BOQ';
COMMENT ON COLUMN public.client_positions.position_number IS 'Sequential position number within tender (auto-assigned if not provided)';
COMMENT ON COLUMN public.client_positions.unit IS 'Единица измерения из Excel';
COMMENT ON COLUMN public.client_positions.volume IS 'Объем работ из Excel';
COMMENT ON COLUMN public.client_positions.client_note IS 'Примечание заказчика из Excel';
COMMENT ON COLUMN public.client_positions.item_no IS 'Номер пункта из Excel (столбец № п/п)';
COMMENT ON COLUMN public.client_positions.work_name IS 'Наименование работ из Excel';
COMMENT ON COLUMN public.client_positions.manual_volume IS 'Объём работ, заданный вручную';
COMMENT ON COLUMN public.client_positions.manual_note IS 'Примечание генподрядчика (заполняется вручную)';
COMMENT ON COLUMN public.client_positions.position_type IS 'Тип позиции: article (статья), section (раздел), subsection (подраздел), header (заголовок), subheader (подзаголовок), executable (исполняемая)';
COMMENT ON COLUMN public.client_positions.hierarchy_level IS 'Уровень иерархии для визуальных отступов (1-6)';
COMMENT ON COLUMN public.client_positions.total_commercial_materials_cost IS 'Общая коммерческая стоимость материалов в позиции';
COMMENT ON COLUMN public.client_positions.total_commercial_works_cost IS 'Общая коммерческая стоимость работ в позиции';
COMMENT ON COLUMN public.client_positions.is_additional IS 'Flag indicating if this position is an additional work (ДОП работа)';
COMMENT ON COLUMN public.client_positions.parent_position_id IS 'Reference to the parent position for visual grouping of additional works. Set to NULL when parent is deleted.';


-- Table: public.commercial_costs_by_category
CREATE TABLE IF NOT EXISTS public.commercial_costs_by_category (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL,
    detail_cost_category_id uuid NOT NULL,
    direct_materials numeric(15,2) DEFAULT 0,
    direct_works numeric(15,2) DEFAULT 0,
    direct_submaterials numeric(15,2) DEFAULT 0,
    direct_subworks numeric(15,2) DEFAULT 0,
    direct_total numeric(15,2),
    commercial_materials numeric(15,2) DEFAULT 0,
    commercial_works numeric(15,2) DEFAULT 0,
    commercial_submaterials numeric(15,2) DEFAULT 0,
    commercial_subworks numeric(15,2) DEFAULT 0,
    commercial_total numeric(15,2),
    markup_coefficient_materials numeric(10,3),
    markup_coefficient_works numeric(10,3),
    markup_coefficient_submaterials numeric(10,3),
    markup_coefficient_subworks numeric(10,3),
    last_calculation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT commercial_costs_by_category_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id),
    CONSTRAINT commercial_costs_by_category_pkey PRIMARY KEY (id),
    CONSTRAINT commercial_costs_by_category_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT unique_tender_category UNIQUE (detail_cost_category_id),
    CONSTRAINT unique_tender_category UNIQUE (tender_id)
);
COMMENT ON TABLE public.commercial_costs_by_category IS 'Агрегированные коммерческие стоимости по категориям затрат      

-- Table: public.cost_categories
CREATE TABLE IF NOT EXISTS public.cost_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    code text,
    unit text,
    CONSTRAINT cost_categories_pkey PRIMARY KEY (id)
);


-- Table: public.cost_nodes
CREATE TABLE IF NOT EXISTS public.cost_nodes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    parent_id uuid,
    kind text NOT NULL,
    name text NOT NULL,
    code text,
    unit_id uuid,
    location_id uuid,
    sort_order integer NOT NULL DEFAULT 100,
    path public.ltree NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT cost_nodes_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id),
    CONSTRAINT cost_nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.cost_nodes(id),
    CONSTRAINT cost_nodes_pkey PRIMARY KEY (id),
    CONSTRAINT cost_nodes_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (name),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (parent_id)
);


-- Table: public.detail_cost_categories
CREATE TABLE IF NOT EXISTS public.detail_cost_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    cost_category_id uuid NOT NULL,
    location_id uuid NOT NULL,
    name text NOT NULL,
    unit_cost numeric(12,2),
    created_at timestamp with time zone DEFAULT now(),
    unit text,
    CONSTRAINT detail_cost_categories_cost_category_id_fkey FOREIGN KEY (cost_category_id) REFERENCES public.cost_categories(id),
    CONSTRAINT detail_cost_categories_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id),
    CONSTRAINT detail_cost_categories_pkey PRIMARY KEY (id)
);


-- Table: public.location
CREATE TABLE IF NOT EXISTS public.location (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    country text,
    region text,
    city text,
    created_at timestamp with time zone DEFAULT now(),
    code text,
    title text,
    CONSTRAINT location_pkey PRIMARY KEY (id)
);


-- Table: public.material_names
CREATE TABLE IF NOT EXISTS public.material_names (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    unit character varying(50) NOT NULL DEFAULT 'шт'::character varying,
    CONSTRAINT material_names_name_key UNIQUE (name),
    CONSTRAINT material_names_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.material_names IS 'Справочник наименований материалов';
COMMENT ON COLUMN public.material_names.unit IS 'Единица измерения материала';


-- Table: public.materials_library
CREATE TABLE IF NOT EXISTS public.materials_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    default_type public.material_type DEFAULT 'main'::material_type,
    item_type character varying(50),
    material_type character varying(50),
    consumption_coefficient numeric(10,4) DEFAULT 1,
    unit_rate numeric(10,2),
    currency_type character varying(10) DEFAULT 'RUB'::character varying,
    delivery_price_type character varying(20) DEFAULT 'included'::character varying,
    delivery_amount numeric(10,2),
    quote_link text,
    name_id uuid NOT NULL,
    conversion_coefficient numeric(10,4) DEFAULT 1.0,
    CONSTRAINT fk_materials_library_name FOREIGN KEY (name_id) REFERENCES public.material_names(id),
    CONSTRAINT materials_library_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.materials_library IS 'Master catalog of materials with pricing';
COMMENT ON COLUMN public.materials_library.default_type IS 'Тип материала по умолчанию при добавлении в      

-- Table: public.tender_cost_volumes
CREATE TABLE IF NOT EXISTS public.tender_cost_volumes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    detail_cost_category_id uuid NOT NULL,
    volume numeric(12,4) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    unit_total numeric(12,2) DEFAULT 0,
    CONSTRAINT tender_cost_volumes_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id),
    CONSTRAINT tender_cost_volumes_pkey PRIMARY KEY (id),
    CONSTRAINT tender_cost_volumes_tender_id_detail_cost_category_id_key UNIQUE (detail_cost_category_id),
    CONSTRAINT tender_cost_volumes_tender_id_detail_cost_category_id_key UNIQUE (tender_id),
    CONSTRAINT tender_cost_volumes_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id)
);
COMMENT ON TABLE public.tender_cost_volumes IS 'Объемы затрат по категориям для каждого тендера';
COMMENT ON COLUMN public.tender_cost_volumes.tender_id IS 'ID тендера';
COMMENT ON COLUMN public.tender_cost_volumes.detail_cost_category_id IS 'ID детальной категории затрат';
COMMENT ON COLUMN public.tender_cost_volumes.volume IS 'Объем затрат для расчета стоимости';
COMMENT ON COLUMN public.tender_cost_volumes.unit_total IS 'Автоматически

-- Table: public.tender_items
CREATE TABLE IF NOT EXISTS public.tender_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL,
    node_id uuid,
    name_snapshot text NOT NULL,
    unit_id uuid,
    location_id uuid,
    qty numeric(18,3) NOT NULL DEFAULT 0,
    unit_price numeric(18,2) NOT NULL DEFAULT 0,
    amount numeric(18,2),
    note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tender_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id),
    CONSTRAINT tender_items_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.cost_nodes(id),
    CONSTRAINT tender_items_pkey PRIMARY KEY (id),
    CONSTRAINT tender_items_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT tender_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);


-- Table: public.tender_markup_percentages
CREATE TABLE IF NOT EXISTS public.tender_markup_percentages (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    works_16_markup numeric(5,2) DEFAULT 1.6,
    works_cost_growth numeric(5,2) DEFAULT 5.00,
    materials_cost_growth numeric(5,2) DEFAULT 3.00,
    subcontract_works_cost_growth numeric(5,2) DEFAULT 7.00,
    subcontract_materials_cost_growth numeric(5,2) DEFAULT 4.00,
    contingency_costs numeric(5,2) DEFAULT 2.00,
    overhead_own_forces numeric(5,2) DEFAULT 8.00,
    overhead_subcontract numeric(5,2) DEFAULT 6.00,
    general_costs_without_subcontract numeric(5,2) DEFAULT 5.00,
    profit_own_forces numeric(5,2) DEFAULT 12.00,
    profit_subcontract numeric(5,2) DEFAULT 8.00,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    mechanization_service numeric(5,2) DEFAULT 0.00,
    mbp_gsm numeric(5,2) DEFAULT 0.00,
    warranty_period numeric(5,2) DEFAULT 0.00,
    CONSTRAINT tender_markup_percentages_new_pkey PRIMARY KEY (id),
    CONSTRAINT tender_markup_percentages_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id)
);
COMMENT ON TABLE public.tender_markup_percentages IS 'New markup percentages structure for tender financial calculations with 11 specific markup types';
COMMENT ON COLUMN public.tender_markup_percentages.works_16_markup IS 'Works coefficient 1.6';
COMMENT ON COLUMN public.tender_markup_percentages.works_cost_growth IS 'Works cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.materials_cost_growth IS 'Materials cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.subcontract_works_cost_growth IS 'Subcontract works cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.subcontract_materials_cost_growth IS 'Subcontract materials cost growth percentage';
COMMENT ON COLUMN public.tender_markup_percentages.contingency_costs IS 'Contingency costs percentage';
COMMENT ON COLUMN public.tender_markup_percentages.overhead_own_forces IS 'Overhead costs for own forces percentage';
COMMENT ON COLUMN public.tender_markup_percentages.overhead_subcontract IS 'Overhead costs for subcontract percentage';
COMMENT ON COLUMN public.tender_markup_percentages.general_costs_without_subcontract IS 'General costs without subcontract percentage';
COMMENT ON COLUMN public.tender_markup_percentages.profit_own_forces IS 'Profit for own forces percentage';
COMMENT ON COLUMN public.tender_markup_percentages.profit_subcontract IS 'Profit for subcontract percentage';
COMMENT ON COLUMN public.tender_markup_percentages.mechanization_service IS 'Служба механизации раб (бурильщики, автотехника, электрики)';
COMMENT ON COLUMN public.tender_markup_percentages.mbp_gsm IS 'МБП+ГСМ (топливо+масло)';
COMMENT ON COLUMN public.tender_markup_percentages.warranty_period IS 'Гарантийный период 5 лет';


-- Table: public.tender_version_history
CREATE TABLE IF NOT EXISTS public.tender_version_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL,
    version_number integer NOT NULL,
    action text NOT NULL,
    details jsonb,
    positions_added integer,
    positions_removed integer,
    positions_modified integer,
    dop_transferred integer,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    CONSTRAINT tender_version_history_pkey PRIMARY KEY (id),
    CONSTRAINT tender_version_history_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT tender_version_history_tender_id_version_number_key UNIQUE (tender_id),
    CONSTRAINT tender_version_history_tender_id_version_number_key UNIQUE (version_number)
);
COMMENT ON TABLE public.tender_version_history IS 'История операций версионирования тендеров';


-- Table: public.tender_version_mappings
CREATE TABLE IF NOT EXISTS public.tender_version_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    old_tender_id uuid NOT NULL,
    new_tender_id uuid NOT NULL,
    old_position_id uuid,
    new_position_id uuid,
    old_position_number text,
    old_work_name text,
    new_position_number text,
    new_work_name text,
    mapping_type text,
    confidence_score numeric(3,2),
    fuzzy_score numeric(3,2),
    context_score numeric(3,2),
    hierarchy_score numeric(3,2),
    mapping_status text DEFAULT 'suggested'::text,
    action_type text,
    is_dop boolean DEFAULT false,
    parent_mapping_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    old_volume numeric,
    old_unit text,
    old_client_note text,
    old_item_no text,
    new_volume numeric,
    new_unit text,
    new_client_note text,
    new_item_no text,
    CONSTRAINT tender_version_mappings_new_position_id_fkey FOREIGN KEY (new_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT tender_version_mappings_new_tender_id_fkey FOREIGN KEY (new_tender_id) REFERENCES public.tenders(id),
    CONSTRAINT tender_version_mappings_new_tender_id_new_position_id_key UNIQUE (new_position_id),
    CONSTRAINT tender_version_mappings_new_tender_id_new_position_id_key UNIQUE (new_tender_id),
    CONSTRAINT tender_version_mappings_old_position_id_fkey FOREIGN KEY (old_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT tender_version_mappings_old_tender_id_fkey FOREIGN KEY (old_tender_id) REFERENCES public.tenders(id),
    CONSTRAINT tender_version_mappings_old_tender_id_old_position_id_new_t_key UNIQUE (new_tender_id),
    CONSTRAINT tender_version_mappings_old_tender_id_old_position_id_new_t_key UNIQUE (old_position_id),
    CONSTRAINT tender_version_mappings_old_tender_id_old_position_id_new_t_key UNIQUE (old_tender_id),
    CONSTRAINT tender_version_mappings_parent_mapping_id_fkey FOREIGN KEY (parent_mapping_id) REFERENCES public.tender_version_mappings(id),
    CONSTRAINT tender_version_mappings_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.tender_version_mappings IS 'Таблица для хранения сопоставлений позиций между версиями тендеров';
COMMENT ON COLUMN public.tender_version_mappings.mapping_type IS 'Тип сопоставления: exact - точное совпадение, fuzzy - нечеткое, manual - ручное, dop - ДОП позиция, new - новая позиция, deleted - удаленная';
COMMENT ON COLUMN public.tender_version_mappings.confidence_score IS 'Уровень уверенности в сопоставлении от 0 до 1';
COMMENT ON COLUMN public.tender_version_mappings.action_type IS 'Действие при переносе: copy_boq - копировать BOQ, create_new - создать новое, delete - удалить, preserve_dop - сохранить ДОП';
COMMENT ON COLUMN public.tender_version_mappings.old_volume IS 'Объем работ в старой версии';
COMMENT ON COLUMN public.tender_version_mappings.old_unit IS 'Единица измерения в старой версии';
COMMENT ON COLUMN public.tender_version_mappings.old_client_note IS 'Примечание заказчика в старой версии';
COMMENT ON COLUMN public.tender_version_mappings.old_item_no IS 'Номер позиции в старой версии';
COMMENT ON COLUMN public.tender_version_mappings.new_volume IS 'Объем работ в новой версии';
COMMENT ON COLUMN public.tender_version_mappings.new_unit IS 'Единица измерения в новой версии';
COMMENT ON COLUMN public.tender_version_mappings.new_client_note IS 'Примечание заказчика в новой версии';
COMMENT ON COLUMN public.tender_version_mappings.new_item_no IS 'Номер позиции в новой версии';


-- Table: public.tenders
CREATE TABLE IF NOT EXISTS public.tenders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    client_name text NOT NULL,
    tender_number text NOT NULL,
    submission_deadline timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1,
    area_sp numeric(10,2),
    area_client numeric(10,2),
    usd_rate numeric,
    eur_rate numeric,
    cny_rate numeric,
    upload_folder text,
    bsm_link text,
    tz_clarification_link text,
    qa_form_link text,
    parent_version_id uuid,
    version_status text DEFAULT 'draft'::text,
    version_created_at timestamp with time zone DEFAULT now(),
    version_created_by uuid,
    CONSTRAINT tenders_parent_version_id_fkey FOREIGN KEY (parent_version_id) REFERENCES public.tenders(id),
    CONSTRAINT tenders_pkey PRIMARY KEY (id),
    CONSTRAINT tenders_tender_number_key UNIQUE (tender_number)
);
COMMENT ON TABLE public.tenders IS 'Main tender projects with client details';
COMMENT ON COLUMN public.tenders.version IS 'Номер версии тендера';
COMMENT ON COLUMN public.tenders.area_sp IS 'Площадь по СП (м²)';
COMMENT ON COLUMN public.tenders.area_client IS 'Площадь от Заказчика (м²)';
COMMENT ON COLUMN public.tenders.usd_rate IS 'USD exchange rate for this tender version';
COMMENT ON COLUMN public.tenders.eur_rate IS 'EUR exchange rate for this tender version';
COMMENT ON COLUMN public.tenders.cny_rate IS 'CNY exchange rate for this tender version';
COMMENT ON COLUMN public.tenders.upload_folder IS 'Папка для загрузки КП';
COMMENT ON COLUMN public.tenders.bsm_link IS 'Ссылка на БСМ';
COMMENT ON COLUMN public.tenders.tz_clarification_link IS 'Ссылка на уточнение по ТЗ';
COMMENT ON COLUMN public.tenders.qa_form_link IS 'Ссылка на форму вопрос-ответ';
COMMENT ON COLUMN public.tenders.parent_version_id IS 'Ссылка на родительскую версию тендера';
COMMENT ON COLUMN public.tenders.version_status IS 'Статус версии: current - текущая, draft - черновик, archived - архивная';


-- Table: public.units
CREATE TABLE IF NOT EXISTS public.units (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    title text NOT NULL,
    CONSTRAINT units_code_key UNIQUE (code),
    CONSTRAINT units_pkey PRIMARY KEY (id)
);


-- Table: public.work_material_links
CREATE TABLE IF NOT EXISTS public.work_material_links (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    client_position_id uuid NOT NULL,
    work_boq_item_id uuid,
    material_boq_item_id uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    delivery_price_type public.delivery_price_type DEFAULT 'included'::delivery_price_type,
    delivery_amount numeric(12,2) DEFAULT 0,
    material_quantity_per_work numeric(12,4) DEFAULT 1.0000,
    usage_coefficient numeric(12,4) DEFAULT 1.0000,
    sub_work_boq_item_id uuid,
    sub_material_boq_item_id uuid,
    CONSTRAINT fk_work_material_links_material FOREIGN KEY (material_boq_item_id) REFERENCES public.boq_items(id),
    CONSTRAINT fk_work_material_links_position FOREIGN KEY (client_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT fk_work_material_links_sub_material FOREIGN KEY (sub_material_boq_item_id) REFERENCES public.boq_items(id),
    CONSTRAINT fk_work_material_links_sub_work FOREIGN KEY (sub_work_boq_item_id) REFERENCES public.boq_items(id),
    CONSTRAINT fk_work_material_links_work FOREIGN KEY (work_boq_item_id) REFERENCES public.boq_items(id),
    CONSTRAINT uq_sub_work_material_pair UNIQUE (sub_material_boq_item_id),
    CONSTRAINT uq_sub_work_material_pair UNIQUE (sub_work_boq_item_id),
    CONSTRAINT uq_work_material_pair UNIQUE (material_boq_item_id),
    CONSTRAINT uq_work_material_pair UNIQUE (work_boq_item_id),
    CONSTRAINT work_material_links_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.work_material_links IS 'Связи между работами и материалами. Одна работа может быть связана с множеством материалов, один материал может быть связан с множеством работ. Уникальна пара (work_boq_item_id, material_boq_item_id).';
COMMENT ON COLUMN public.work_material_links.client_position_id IS 'ID позиции заказчика, в которой находятся связываемые работы и материалы';
COMMENT ON COLUMN public.work_material_links.work_boq_item_id IS 'ID элемента BOQ типа work (работа)';
COMMENT ON COLUMN public.work_material_links.material_boq_item_id IS 'ID элемента BOQ типа material (материал)';
COMMENT ON COLUMN public.work_material_links.notes IS 'Примечания к связи работы и материала';
COMMENT ON COLUMN public.work_material_links.delivery_price_type IS 'Тип цены доставки: included (в цене), not_included (не в цене), amount (сумма)';
COMMENT ON COLUMN public.work_material_links.delivery_amount IS 'Сумма доставки (используется только при delivery_price_type = amount)';
COMMENT ON COLUMN public.work_material_links.sub_work_boq_item_id IS 'Reference to sub-work type BOQ item';
COMMENT ON COLUMN public.work_material_links.sub_material_boq_item_id IS 'Reference to sub-material type BOQ item';


-- Table: public.work_material_templates
CREATE TABLE IF NOT EXISTS public.work_material_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    template_name character varying(255) NOT NULL,
    template_description text,
    work_library_id uuid,
    sub_work_library_id uuid,
    material_library_id uuid,
    sub_material_library_id uuid,
    is_linked_to_work boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT work_material_templates_material_library_id_fkey FOREIGN KEY (material_library_id) REFERENCES public.materials_library(id),
    CONSTRAINT work_material_templates_pkey PRIMARY KEY (id),
    CONSTRAINT work_material_templates_sub_material_library_id_fkey FOREIGN KEY (sub_material_library_id) REFERENCES public.materials_library(id),
    CONSTRAINT work_material_templates_sub_work_library_id_fkey FOREIGN KEY (sub_work_library_id) REFERENCES public.works_library(id),
    CONSTRAINT work_material_templates_work_library_id_fkey FOREIGN KEY (work_library_id) REFERENCES public.works_library(id)
);
COMMENT ON TABLE public.work_material_templates IS 'Шаблоны работ и материалов. Может содержать работы без материалов, материалы без работ, или связки работа-материал';
COMMENT ON COLUMN public.work_material_templates.template_name IS 'Название шаблона (группирующее поле)';
COMMENT ON COLUMN public.work_material_templates.template_description IS 'Описание шаблона';
COMMENT ON COLUMN public.work_material_templates.work_library_id IS 'Ссылка на работу из библиотеки';
COMMENT ON COLUMN public.work_material_templates.sub_work_library_id IS 'Ссылка на суб-работу из библиотеки';
COMMENT ON COLUMN public.work_material_templates.material_library_id IS 'Ссылка на материал из библиотеки';
COMMENT ON COLUMN public.work_material_templates.sub_material_library_id IS 'Ссылка на суб-материал из библиотеки';
COMMENT ON COLUMN public.work_material_templates.is_linked_to_work IS 'Привязан ли материал к работе (создавать ли work_material_links при вставке)';
COMMENT ON COLUMN public.work_material_templates.notes IS 'Примечания к элементу шаблона';


-- Table: public.work_names
CREATE TABLE IF NOT EXISTS public.work_names (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    unit character varying(50) NOT NULL DEFAULT 'м2'::character varying,
    CONSTRAINT work_names_name_key UNIQUE (name),
    CONSTRAINT work_names_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.work_names IS 'Справочник наименований работ';
COMMENT ON COLUMN public.work_names.unit IS 'Единица измерения работы';


-- Table: public.works_library
CREATE TABLE IF NOT EXISTS public.works_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    item_type character varying(50),
    unit_rate numeric(10,2),
    currency_type character varying(10) DEFAULT 'RUB'::character varying,
    name_id uuid NOT NULL,
    CONSTRAINT fk_works_library_name FOREIGN KEY (name_id) REFERENCES public.work_names(id),
    CONSTRAINT works_library_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.works_library IS 'Master catalog of work items with labor components';
COMMENT ON COLUMN public.works_library.name_id IS 'Ссылка на наименование работы';



-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_boq_mapping_new ON public.boq_item_version_mappings USING btree (new_boq_item_id);
CREATE INDEX idx_boq_mapping_old ON public.boq_item_version_mappings USING btree (old_boq_item_id);
CREATE INDEX idx_boq_mapping_tenders ON public.boq_item_version_mappings USING btree (old_tender_id, new_tender_id);
CREATE UNIQUE INDEX uq_boq_mapping ON public.boq_item_version_mappings USING btree (old_boq_item_id, new_tender_id);
CREATE INDEX idx_boq_items_aggregation ON public.boq_items USING btree (client_position_id, total_amount, quantity, unit_rate);
CREATE INDEX idx_boq_items_client_position ON public.boq_items USING btree (client_position_id, item_type);
CREATE INDEX idx_boq_items_client_position_id ON public.boq_items USING btree (client_position_id);
CREATE INDEX idx_boq_items_commercial_cost ON public.boq_items USING btree (commercial_cost);
CREATE INDEX idx_boq_items_currency_type ON public.boq_items USING btree (currency_type);
CREATE INDEX idx_boq_items_delivery_price_type ON public.boq_items USING btree (delivery_price_type) WHERE (item_type = 'material'::boq_item_type);
CREATE INDEX idx_boq_items_delivery_type ON public.boq_items USING btree (delivery_price_type) WHERE (item_type = 'material'::boq_item_type);
CREATE INDEX idx_boq_items_description_gin ON public.boq_items USING gin (to_tsvector('russian'::regconfig, description));
CREATE INDEX idx_boq_items_detail_cost_category_id ON public.boq_items USING btree (detail_cost_category_id) WHERE (detail_cost_category_id IS NOT NULL);
CREATE INDEX idx_boq_items_item_type ON public.boq_items USING btree (item_type);
CREATE INDEX idx_boq_items_markup_coefficient ON public.boq_items USING btree (commercial_markup_coefficient);
CREATE INDEX idx_boq_items_material_delivery ON public.boq_items USING btree (item_type, delivery_price_type, delivery_amount) WHERE (item_type = 'material'::boq_item_type);
CREATE INDEX idx_boq_items_material_id ON public.boq_items USING btree (material_id) WHERE (material_id IS NOT NULL);
CREATE INDEX idx_boq_items_note ON public.boq_items USING gin (to_tsvector('russian'::regconfig, note)) WHERE (note IS NOT NULL);
CREATE INDEX idx_boq_items_position_id_sort ON public.boq_items USING btree (client_position_id, sort_order) WHERE (client_position_id IS NOT NULL);
CREATE INDEX idx_boq_items_position_sort ON public.boq_items USING btree (client_position_id, sub_number, sort_order);
CREATE INDEX idx_boq_items_position_sub ON public.boq_items USING btree (client_position_id, sub_number);
CREATE INDEX idx_boq_items_quote_link ON public.boq_items USING btree (quote_link) WHERE (quote_link IS NOT NULL);
CREATE INDEX idx_boq_items_tender_id ON public.boq_items USING btree (tender_id);
CREATE INDEX idx_boq_items_tender_id_item_type ON public.boq_items USING btree (tender_id, item_type);
CREATE INDEX idx_boq_items_tender_position ON public.boq_items USING btree (tender_id, client_position_id, sort_order) WHERE ((tender_id IS NOT NULL) AND (client_position_id IS NOT NULL));
CREATE INDEX idx_boq_items_tender_position_type ON public.boq_items USING btree (tender_id, client_position_id, item_type);
CREATE INDEX idx_boq_items_tender_type ON public.boq_items USING btree (tender_id, item_type, client_position_id);
CREATE INDEX idx_boq_items_total_amount ON public.boq_items USING btree (total_amount) WHERE (total_amount > (0)::numeric);
CREATE INDEX idx_boq_items_work_id ON public.boq_items USING btree (work_id) WHERE (work_id IS NOT NULL);
CREATE UNIQUE INDEX uq_boq_position_sub_number ON public.boq_items USING btree (client_position_id, sub_number);
CREATE UNIQUE INDEX uq_boq_tender_item_number ON public.boq_items USING btree (tender_id, item_number);
CREATE INDEX idx_client_positions_additional ON public.client_positions USING btree (tender_id, is_additional, parent_position_id);
CREATE INDEX idx_client_positions_hierarchy ON public.client_positions USING btree (tender_id, hierarchy_level, position_number);
CREATE INDEX idx_client_positions_is_additional ON public.client_positions USING btree (is_additional) WHERE (is_additional = true);
CREATE INDEX idx_client_positions_item_no ON public.client_positions USING btree (item_no);
CREATE INDEX idx_client_positions_number ON public.client_positions USING btree (tender_id, position_number);
CREATE INDEX idx_client_positions_parent_position_id ON public.client_positions USING btree (parent_position_id) WHERE (parent_position_id IS NOT NULL);
CREATE INDEX idx_client_positions_search_gin ON public.client_positions USING gin (to_tsvector('russian'::regconfig, ((((COALESCE(work_name, ''::text) || ' '::text) || (COALESCE(item_no, ''::character varying))::text) || ' '::text) || COALESCE(client_note, ''::text))));
CREATE INDEX idx_client_positions_tender_id ON public.client_positions USING btree (tender_id);
CREATE INDEX idx_client_positions_tender_id_position ON public.client_positions USING btree (tender_id, position_number) WHERE (tender_id IS NOT NULL);
CREATE INDEX idx_client_positions_tender_id_position_number ON public.client_positions USING btree (tender_id, position_number);
CREATE INDEX idx_client_positions_tender_position ON public.client_positions USING btree (tender_id, position_number);
CREATE INDEX idx_client_positions_work_name ON public.client_positions USING gin (to_tsvector('russian'::regconfig, work_name));
CREATE UNIQUE INDEX uq_client_positions_position_tender ON public.client_positions USING btree (tender_id, position_number);
CREATE INDEX idx_commercial_costs_category ON public.commercial_costs_by_category USING btree (detail_cost_category_id);
CREATE INDEX idx_commercial_costs_tender ON public.commercial_costs_by_category USING btree (tender_id);
CREATE INDEX idx_commercial_costs_tender_category ON public.commercial_costs_by_category USING btree (tender_id, detail_cost_category_id);
CREATE UNIQUE INDEX unique_tender_category ON public.commercial_costs_by_category USING btree (tender_id, detail_cost_category_id);
CREATE UNIQUE INDEX cost_categories_code_idx ON public.cost_categories USING btree (code);
CREATE INDEX idx_cost_categories_name ON public.cost_categories USING btree (name);
CREATE INDEX ix_cost_nodes_parent_sort ON public.cost_nodes USING btree (parent_id, sort_order);
CREATE INDEX ix_cost_nodes_path_gist ON public.cost_nodes USING gist (path);
CREATE INDEX ix_cost_nodes_search_gin ON public.cost_nodes USING gin (to_tsvector('russian'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(code, ''::text))));
CREATE UNIQUE INDEX uq_cost_nodes_sibling ON public.cost_nodes USING btree (parent_id, name);
CREATE INDEX detail_cost_categories_cost_category_id_idx ON public.detail_cost_categories USING btree (cost_category_id);
CREATE INDEX detail_cost_categories_location_id_idx ON public.detail_cost_categories USING btree (location_id);
CREATE INDEX idx_detail_cost_categories_category_id ON public.detail_cost_categories USING btree (cost_category_id);
CREATE INDEX idx_detail_cost_categories_location_id ON public.detail_cost_categories USING btree (location_id);
CREATE INDEX idx_detail_cost_categories_name ON public.detail_cost_categories USING btree (name);
CREATE INDEX idx_location_city ON public.location USING btree (city);
CREATE INDEX idx_location_country ON public.location USING btree (country);
CREATE UNIQUE INDEX ix_location_code_unique ON public.location USING btree (code);
CREATE UNIQUE INDEX location_city_idx ON public.location USING btree (city);
CREATE INDEX idx_material_names_name ON public.material_names USING btree (name);
CREATE UNIQUE INDEX material_names_name_key ON public.material_names USING btree (name);
CREATE INDEX idx_tender_cost_volumes_category_id ON public.tender_cost_volumes USING btree (detail_cost_category_id);
CREATE INDEX idx_tender_cost_volumes_tender_id ON public.tender_cost_volumes USING btree (tender_id);
CREATE INDEX idx_tender_cost_volumes_unit_total ON public.tender_cost_volumes USING btree (unit_total);
CREATE UNIQUE INDEX tender_cost_volumes_tender_id_detail_cost_category_id_key ON public.tender_cost_volumes USING btree (tender_id, detail_cost_category_id);
CREATE INDEX ix_tender_items_node ON public.tender_items USING btree (node_id);
CREATE INDEX ix_tender_items_tender ON public.tender_items USING btree (tender_id);
CREATE INDEX tender_markup_percentages_tender_id_idx ON public.tender_markup_percentages USING btree (tender_id);
CREATE INDEX idx_version_history_action ON public.tender_version_history USING btree (action);
CREATE INDEX idx_version_history_date ON public.tender_version_history USING btree (performed_at DESC);
CREATE INDEX idx_version_history_tender ON public.tender_version_history USING btree (tender_id);
CREATE UNIQUE INDEX tender_version_history_tender_id_version_number_key ON public.tender_version_history USING btree (tender_id, version_number);
CREATE INDEX idx_version_mappings_dop ON public.tender_version_mappings USING btree (is_dop) WHERE (is_dop = true);
CREATE INDEX idx_version_mappings_new_tender ON public.tender_version_mappings USING btree (new_tender_id);
CREATE INDEX idx_version_mappings_old_tender ON public.tender_version_mappings USING btree (old_tender_id);
CREATE INDEX idx_version_mappings_status ON public.tender_version_mappings USING btree (mapping_status);
CREATE INDEX idx_version_mappings_type ON public.tender_version_mappings USING btree (mapping_type);
CREATE UNIQUE INDEX tender_version_mappings_new_tender_id_new_position_id_key ON public.tender_version_mappings USING btree (new_tender_id, new_position_id);
CREATE UNIQUE INDEX tender_version_mappings_old_tender_id_old_position_id_new_t_key ON public.tender_version_mappings USING btree (old_tender_id, old_position_id, new_tender_id);
CREATE INDEX idx_tenders_created_at ON public.tenders USING btree (created_at DESC);
CREATE INDEX idx_tenders_parent_version ON public.tenders USING btree (parent_version_id);
CREATE INDEX idx_tenders_tender_number ON public.tenders USING btree (tender_number);
CREATE INDEX idx_tenders_updated_at ON public.tenders USING btree (updated_at DESC);
CREATE INDEX idx_tenders_version_status ON public.tenders USING btree (version_status);
CREATE UNIQUE INDEX tenders_tender_number_key ON public.tenders USING btree (tender_number);
CREATE UNIQUE INDEX units_code_key ON public.units USING btree (code);
CREATE INDEX idx_wml_material ON public.work_material_links USING btree (material_boq_item_id);
CREATE INDEX idx_wml_position ON public.work_material_links USING btree (client_position_id);
CREATE INDEX idx_wml_work ON public.work_material_links USING btree (work_boq_item_id);
CREATE INDEX idx_work_material_links_items ON public.work_material_links USING btree (work_boq_item_id, material_boq_item_id);
CREATE INDEX idx_work_material_links_material ON public.work_material_links USING btree (material_boq_item_id);
CREATE INDEX idx_work_material_links_position ON public.work_material_links USING btree (client_position_id);
CREATE INDEX idx_work_material_links_position_work ON public.work_material_links USING btree (client_position_id, work_boq_item_id);
CREATE INDEX idx_work_material_links_sub_material ON public.work_material_links USING btree (sub_material_boq_item_id);
CREATE INDEX idx_work_material_links_sub_work ON public.work_material_links USING btree (sub_work_boq_item_id);
CREATE INDEX idx_work_material_links_work ON public.work_material_links USING btree (work_boq_item_id);
CREATE UNIQUE INDEX uq_sub_work_material_pair ON public.work_material_links USING btree (sub_work_boq_item_id, sub_material_boq_item_id);
CREATE UNIQUE INDEX uq_work_material_pair ON public.work_material_links USING btree (work_boq_item_id, material_boq_item_id);
CREATE INDEX idx_work_material_templates_material_library_id ON public.work_material_templates USING btree (material_library_id);
CREATE INDEX idx_work_material_templates_sub_material_library_id ON public.work_material_templates USING btree (sub_material_library_id);
CREATE INDEX idx_work_material_templates_sub_work_library_id ON public.work_material_templates USING btree (sub_work_library_id);
CREATE INDEX idx_work_material_templates_template_name ON public.work_material_templates USING btree (template_name);
CREATE INDEX idx_work_material_templates_work_library_id ON public.work_material_templates USING btree (work_library_id);
CREATE INDEX idx_work_names_name ON public.work_names USING btree (name);
CREATE UNIQUE INDEX work_names_name_key ON public.work_names USING btree (name);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: public._calc_path
CREATE OR REPLACE FUNCTION public._calc_path(p_parent uuid, p_pos integer)
 RETURNS ltree
 LANGUAGE plpgsql
AS $function$
declare parent_path ltree;
begin
  if p_parent is null then
    return (_make_label(p_pos))::ltree;
  end if;
  select path into parent_path from public.cost_nodes where id = p_parent;
  if parent_path is null then
    raise exception 'Parent % not found', p_parent;
  end if;
  return parent_path || (_make_label(p_pos))::ltree;
end $function$

-- Function: public._lt_q_regex
CREATE OR REPLACE FUNCTION public._lt_q_regex(ltree[], lquery[])
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_lt_q_regex$function$

-- Function: public._lt_q_rregex
CREATE OR REPLACE FUNCTION public._lt_q_rregex(lquery[], ltree[])
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_lt_q_rregex$function$

-- Function: public._ltq_extract_regex
CREATE OR REPLACE FUNCTION public._ltq_extract_regex(ltree[], lquery)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltq_extract_regex$function$

-- Function: public._ltq_regex
CREATE OR REPLACE FUNCTION public._ltq_regex(ltree[], lquery)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltq_regex$function$

-- Function: public._ltq_rregex
CREATE OR REPLACE FUNCTION public._ltq_rregex(lquery, ltree[])
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltq_rregex$function$

-- Function: public._ltree_compress
CREATE OR REPLACE FUNCTION public._ltree_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_compress$function$

-- Function: public._ltree_consistent
CREATE OR REPLACE FUNCTION public._ltree_consistent(internal, ltree[], smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_consistent$function$

-- Function: public._ltree_extract_isparent
CREATE OR REPLACE FUNCTION public._ltree_extract_isparent(ltree[], ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_extract_isparent$function$

-- Function: public._ltree_extract_risparent
CREATE OR REPLACE FUNCTION public._ltree_extract_risparent(ltree[], ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_extract_risparent$function$

-- Function: public._ltree_gist_options
CREATE OR REPLACE FUNCTION public._ltree_gist_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/ltree', $function$_ltree_gist_options$function$

-- Function: public._ltree_isparent
CREATE OR REPLACE FUNCTION public._ltree_isparent(ltree[], ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_isparent$function$

-- Function: public._ltree_penalty
CREATE OR REPLACE FUNCTION public._ltree_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_penalty$function$

-- Function: public._ltree_picksplit
CREATE OR REPLACE FUNCTION public._ltree_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_picksplit$function$

-- Function: public._ltree_r_isparent
CREATE OR REPLACE FUNCTION public._ltree_r_isparent(ltree, ltree[])
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_r_isparent$function$

-- Function: public._ltree_r_risparent
CREATE OR REPLACE FUNCTION public._ltree_r_risparent(ltree, ltree[])
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_r_risparent$function$

-- Function: public._ltree_risparent
CREATE OR REPLACE FUNCTION public._ltree_risparent(ltree[], ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_risparent$function$

-- Function: public._ltree_same
CREATE OR REPLACE FUNCTION public._ltree_same(ltree_gist, ltree_gist, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_same$function$

-- Function: public._ltree_union
CREATE OR REPLACE FUNCTION public._ltree_union(internal, internal)
 RETURNS ltree_gist
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltree_union$function$

-- Function: public._ltxtq_exec
CREATE OR REPLACE FUNCTION public._ltxtq_exec(ltree[], ltxtquery)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltxtq_exec$function$

-- Function: public._ltxtq_extract_exec
CREATE OR REPLACE FUNCTION public._ltxtq_extract_exec(ltree[], ltxtquery)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltxtq_extract_exec$function$

-- Function: public._ltxtq_rexec
CREATE OR REPLACE FUNCTION public._ltxtq_rexec(ltxtquery, ltree[])
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_ltxtq_rexec$function$

-- Function: public._make_label
CREATE OR REPLACE FUNCTION public._make_label(pos integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select 'n' || lpad(coalesce(pos,0)::text, 4, '0')
$function$

-- Function: public.apply_temp_mappings
CREATE OR REPLACE FUNCTION public.apply_temp_mappings()
 RETURNS TABLE(detail_code character varying, location_code character varying, status text, mapping_id uuid)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_row RECORD;
    v_detail_id UUID;
    v_location_id UUID;
    v_mapping_id UUID;
    v_status TEXT;
BEGIN
    FOR v_row IN 
        SELECT * FROM public.temp_mapping_fix 
        WHERE NOT processed
    LOOP
        -- Находим detail_id
        SELECT id INTO v_detail_id
        FROM public.detail_cost_categories
        WHERE code = v_row.detail_code
        LIMIT 1;
        
        -- Находим location_id
        SELECT id INTO v_location_id
        FROM public.location
        WHERE code = v_row.location_code
        OR name = v_row.location_name
        LIMIT 1;
        
        IF v_detail_id IS NOT NULL AND v_location_id IS NOT NULL THEN
            -- Создаем связь
            v_mapping_id := create_category_location_mapping(
                v_detail_id, 
                v_location_id, 
                v_row.quantity, 
                v_row.unit_price
            );
            v_status := 'SUCCESS';
            
            -- Помечаем как обработанную
            UPDATE public.temp_mapping_fix 
            SET processed = true 
            WHERE detail_code = v_row.detail_code 
            AND location_code = v_row.location_code;
        ELSE
            v_status := CASE 
                WHEN v_detail_id IS NULL AND v_location_id IS NULL THEN 'BOTH_NOT_FOUND'
                WHEN v_detail_id IS NULL THEN 'DETAIL_NOT_FOUND'
                ELSE 'LOCATION_NOT_FOUND'
            END;
            v_mapping_id := NULL;
        END IF;
        
        RETURN QUERY SELECT 
            v_row.detail_code::VARCHAR,
            v_row.location_code::VARCHAR,
            v_status,
            v_mapping_id;
    END LOOP;
END;
$function$

-- Function: public.auto_assign_position_number
CREATE OR REPLACE FUNCTION public.auto_assign_position_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If position_number is NULL or 0, auto-assign it
  IF NEW.position_number IS NULL OR NEW.position_number = 0 THEN
    NEW.position_number := get_next_position_number(NEW.tender_id);
  END IF;
  
  RETURN NEW;
END;
$function$

-- Function: public.auto_match_positions
CREATE OR REPLACE FUNCTION public.auto_match_positions(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS TABLE(old_position_id uuid, new_position_id uuid, confidence_score numeric, mapping_type text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_old_position RECORD;
    v_new_position RECORD;
    v_best_match RECORD;
    v_fuzzy_score NUMERIC;
    v_context_score NUMERIC;
    v_hierarchy_score NUMERIC;
    v_total_score NUMERIC;
    v_threshold NUMERIC := 0.7; -- Порог для автоматического сопоставления
BEGIN
    -- Создаем временную таблицу для результатов
    CREATE TEMP TABLE temp_matches (
        old_position_id UUID,
        new_position_id UUID,
        confidence_score NUMERIC,
        mapping_type TEXT,
        fuzzy_score NUMERIC,
        context_score NUMERIC,
        hierarchy_score NUMERIC
    ) ON COMMIT DROP;

    -- Проходим по всем старым позициям
    FOR v_old_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        ORDER BY position_number
    LOOP
        v_best_match := NULL;

        -- Ищем лучшее соответствие среди новых позиций
        FOR v_new_position IN
            SELECT * FROM client_positions
            WHERE tender_id = p_new_tender_id
            ORDER BY position_number
        LOOP
            -- Вычисляем fuzzy score для названия
            v_fuzzy_score := calculate_fuzzy_score(v_old_position.work_name, v_new_position.work_name);

            -- Вычисляем context score (на основе position_number и type)
            v_context_score := 0;
            IF v_old_position.position_number = v_new_position.position_number THEN
                v_context_score := v_context_score + 0.5;
            END IF;
            IF v_old_position.position_type = v_new_position.position_type THEN
                v_context_score := v_context_score + 0.5;
            END IF;

            -- Вычисляем hierarchy score (уровень в иерархии)
            v_hierarchy_score := 0;
            IF LENGTH(v_old_position.position_number) = LENGTH(v_new_position.position_number) THEN
                v_hierarchy_score := 1.0;
            ELSIF ABS(LENGTH(v_old_position.position_number) - LENGTH(v_new_position.position_number)) <= 2 THEN
                v_hierarchy_score := 0.5;
            END IF;

            -- Общий score (взвешенная сумма)
            v_total_score := (v_fuzzy_score * 0.7) + (v_context_score * 0.2) + (v_hierarchy_score * 0.1);

            -- Сохраняем лучшее соответствие
            IF v_best_match IS NULL OR v_total_score > v_best_match.total_score THEN
                v_best_match := ROW(
                    v_new_position.id,
                    v_total_score,
                    v_fuzzy_score,
                    v_context_score,
                    v_hierarchy_score
                );
            END IF;
        END LOOP;

        -- Если нашли хорошее соответствие, добавляем в результат
        IF v_best_match IS NOT NULL AND v_best_match.total_score >= v_threshold THEN
            INSERT INTO temp_matches VALUES (
                v_old_position.id,
                v_best_match.id,
                v_best_match.total_score,
                CASE
                    WHEN v_best_match.total_score >= 0.95 THEN 'exact'
                    ELSE 'fuzzy'
                END,
                v_best_match.fuzzy_score,
                v_best_match.context_score,
                v_best_match.hierarchy_score
            );
        END IF;
    END LOOP;

    -- Возвращаем результаты
    RETURN QUERY SELECT
        tm.old_position_id,
        tm.new_position_id,
        tm.confidence_score,
        tm.mapping_type
    FROM temp_matches tm;
END;
$function$

-- Function: public.bulk_upsert_category_location_mappings
CREATE OR REPLACE FUNCTION public.bulk_upsert_category_location_mappings(p_mappings jsonb)
 RETURNS TABLE(success_count integer, error_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_success_count integer := 0;
    v_error_count integer := 0;
    v_mapping jsonb;
BEGIN
    -- Перебираем все маппинги из JSON массива
    FOR v_mapping IN SELECT * FROM jsonb_array_elements(p_mappings)
    LOOP
        BEGIN
            INSERT INTO public.category_location_mapping (
                detail_category_id,
                location_id,
                quantity,
                unit_price,
                is_active
            ) VALUES (
                (v_mapping->>'detail_category_id')::uuid,
                (v_mapping->>'location_id')::uuid,
                COALESCE((v_mapping->>'quantity')::numeric, 0),
                COALESCE((v_mapping->>'unit_price')::numeric, 0),
                COALESCE((v_mapping->>'is_active')::boolean, true)
            )
            ON CONFLICT (detail_category_id, location_id) 
            DO UPDATE SET
                quantity = EXCLUDED.quantity,
                unit_price = EXCLUDED.unit_price,
                is_active = EXCLUDED.is_active,
                updated_at = now();
            
            v_success_count := v_success_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_success_count, v_error_count;
END;
$function$

-- Function: public.calculate_boq_amounts
CREATE OR REPLACE FUNCTION public.calculate_boq_amounts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_base_amount NUMERIC;
    v_delivery_amount NUMERIC := 0;
    v_total_amount NUMERIC;
BEGIN
    -- Расчет базовой стоимости с учетом валюты
    IF NEW.currency_type IS NOT NULL AND NEW.currency_type != 'RUB' THEN
        -- Для иностранной валюты умножаем на курс
        IF NEW.currency_rate IS NOT NULL AND NEW.currency_rate > 0 THEN
            v_base_amount := COALESCE(NEW.unit_rate, 0) * NEW.currency_rate * COALESCE(NEW.quantity, 0);
            RAISE NOTICE 'Расчет с валютой % для %: unit_rate=%, currency_rate=%, quantity=%, base_amount=%', 
                NEW.currency_type, NEW.id, NEW.unit_rate, NEW.currency_rate, NEW.quantity, v_base_amount;
        ELSE
            -- Если курс не указан, используем только unit_rate
            v_base_amount := COALESCE(NEW.unit_rate, 0) * COALESCE(NEW.quantity, 0);
            RAISE WARNING 'Курс валюты не указан для %: используем unit_rate без конвертации', NEW.id;
        END IF;
    ELSE
        -- Для рублей без курса
        v_base_amount := COALESCE(NEW.unit_rate, 0) * COALESCE(NEW.quantity, 0);
        RAISE NOTICE 'Расчет в рублях для %: unit_rate=%, quantity=%, base_amount=%', 
            NEW.id, NEW.unit_rate, NEW.quantity, v_base_amount;
    END IF;
    
    -- Расчет стоимости доставки
    IF NEW.delivery_price_type = 'not_included' THEN
        -- 3% от базовой стоимости единицы (с учетом валюты)
        IF NEW.currency_type IS NOT NULL AND NEW.currency_type != 'RUB' AND NEW.currency_rate IS NOT NULL AND NEW.currency_rate > 0 THEN
            v_delivery_amount := COALESCE(NEW.unit_rate, 0) * NEW.currency_rate * 0.03 * COALESCE(NEW.quantity, 0);
        ELSE
            v_delivery_amount := COALESCE(NEW.unit_rate, 0) * 0.03 * COALESCE(NEW.quantity, 0);
        END IF;
    ELSIF NEW.delivery_price_type = 'amount' THEN
        -- Фиксированная сумма за единицу
        v_delivery_amount := COALESCE(NEW.delivery_amount, 0) * COALESCE(NEW.quantity, 0);
    ELSE
        -- included или NULL - доставка включена в цену
        v_delivery_amount := 0;
    END IF;
    
    -- Итоговая сумма
    v_total_amount := v_base_amount + v_delivery_amount;
    
    -- Устанавливаем рассчитанные значения
    NEW.delivery_amount := CASE 
        WHEN NEW.delivery_price_type = 'amount' THEN NEW.delivery_amount
        WHEN NEW.delivery_price_type = 'not_included' THEN 
            CASE 
                WHEN NEW.currency_type IS NOT NULL AND NEW.currency_type != 'RUB' AND NEW.currency_rate IS NOT NULL AND NEW.currency_rate > 0 
                THEN COALESCE(NEW.unit_rate, 0) * NEW.currency_rate * 0.03
                ELSE COALESCE(NEW.unit_rate, 0) * 0.03
            END
        ELSE 0
    END;
    
    NEW.total_amount := v_total_amount;
    
    -- Устанавливаем commercial_cost равным total_amount (временно, пока нет таблицы tender_markup)
    NEW.commercial_cost := v_total_amount;
    
    RAISE NOTICE 'Финальный расчет для %: total_amount=%, delivery_amount=%, commercial_cost=%', 
        NEW.id, NEW.total_amount, NEW.delivery_amount, NEW.commercial_cost;
    
    RETURN NEW;
END;
$function$

-- Function: public.calculate_boq_amounts_trigger
CREATE OR REPLACE FUNCTION public.calculate_boq_amounts_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Для материалов рассчитываем delivery_amount
    IF NEW.item_type IN ('material', 'sub_material') THEN
        CASE NEW.delivery_price_type
            WHEN 'not_included' THEN
                -- 3% от цены за единицу материала
                NEW.delivery_amount = COALESCE(NEW.unit_rate, 0) * 0.03;
            WHEN 'amount' THEN
                -- Фиксированная сумма (пользователь задает, не изменяем если уже есть значение)
                NEW.delivery_amount = COALESCE(NEW.delivery_amount, 0);
            ELSE -- 'included'
                -- Доставка включена в цену
                NEW.delivery_amount = 0;
        END CASE;
    ELSE
        -- Для работ доставки нет
        NEW.delivery_amount = 0;
    END IF;
    
    -- Рассчитываем total_amount по единой формуле
    NEW.total_amount = calculate_boq_item_total(
        NEW.item_type::text,
        NEW.quantity,
        NEW.unit_rate,
        NEW.delivery_price_type,
        NEW.delivery_amount
    );
    
    RETURN NEW;
END;
$function$

-- Function: public.calculate_boq_amounts_with_currency
CREATE OR REPLACE FUNCTION public.calculate_boq_amounts_with_currency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Логирование для отладки
    RAISE NOTICE 'Trigger fired: currency_type=%, unit_rate=%, currency_rate=%, quantity=%', 
        NEW.currency_type, NEW.unit_rate, NEW.currency_rate, NEW.quantity;
    
    -- Рассчитываем total_amount с учетом валюты
    IF NEW.currency_type IS NOT NULL AND NEW.currency_type != 'RUB' AND NEW.currency_rate IS NOT NULL AND NEW.currency_rate > 0 THEN
        -- Для иностранной валюты: умножаем на курс
        NEW.total_amount := NEW.unit_rate * NEW.currency_rate * COALESCE(NEW.quantity, 0);
        RAISE NOTICE 'Foreign currency calculation: % * % * % = %', 
            NEW.unit_rate, NEW.currency_rate, NEW.quantity, NEW.total_amount;
    ELSE
        -- Для рублей: без курса
        NEW.total_amount := NEW.unit_rate * COALESCE(NEW.quantity, 0);
        RAISE NOTICE 'RUB calculation: % * % = %', 
            NEW.unit_rate, NEW.quantity, NEW.total_amount;
    END IF;
    
    RETURN NEW;
END;
$function$

-- Function: public.calculate_boq_commercial_cost
CREATE OR REPLACE FUNCTION public.calculate_boq_commercial_cost()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      -- Рассчитываем ПОЛНУЮ коммерческую стоимость (с учётом количества)
      NEW.commercial_cost := public.calculate_commercial_cost(
          NEW.unit_rate,
          NEW.delivery_amount,
          NEW.delivery_price_type,
          NEW.commercial_markup_coefficient,
          NEW.item_type
      ) * COALESCE(NEW.quantity, 1);  -- УМНОЖАЕМ НА КОЛИЧЕСТВО!

      RETURN NEW;
  END;
  $function$

-- Function: public.calculate_boq_item_total
CREATE OR REPLACE FUNCTION public.calculate_boq_item_total(p_item_type text, p_quantity numeric, p_unit_rate numeric, p_delivery_price_type delivery_price_type, p_delivery_amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    IF p_item_type IN ('material', 'sub_material') THEN
        -- Для материалов: (цена за единицу + доставка за единицу) × количество
        RETURN COALESCE(p_quantity, 1) * (COALESCE(p_unit_rate, 0) + COALESCE(p_delivery_amount, 0));
    ELSE
        -- Для работ: цена за единицу × количество (доставки нет)
        RETURN COALESCE(p_quantity, 1) * COALESCE(p_unit_rate, 0);
    END IF;
END;
$function$

-- Function: public.calculate_boq_total_with_currency
CREATE OR REPLACE FUNCTION public.calculate_boq_total_with_currency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total NUMERIC;
BEGIN
    -- Расчет total_amount
    IF NEW.currency_type IS NOT NULL AND NEW.currency_type != 'RUB' AND NEW.currency_rate IS NOT NULL AND NEW.currency_rate > 0 THEN
        v_total := COALESCE(NEW.unit_rate, 0) * NEW.currency_rate * COALESCE(NEW.quantity, 0);
        RAISE NOTICE 'Currency calc for %: % * % * % = %', NEW.id, NEW.unit_rate, NEW.currency_rate, NEW.quantity, v_total;
    ELSE
        v_total := COALESCE(NEW.unit_rate, 0) * COALESCE(NEW.quantity, 0);
        RAISE NOTICE 'RUB calc for %: % * % = %', NEW.id, NEW.unit_rate, NEW.quantity, v_total;
    END IF;
    
    NEW.total_amount := v_total;
    
    RETURN NEW;
END;
$function$

-- Function: public.calculate_commercial_cost
CREATE OR REPLACE FUNCTION public.calculate_commercial_cost()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_tender_markup RECORD;
    v_commercial_cost NUMERIC;
BEGIN
    -- Получаем наценки тендера
    SELECT * INTO v_tender_markup
    FROM tender_markup
    WHERE tender_id = NEW.tender_id;
    
    IF v_tender_markup IS NULL THEN
        NEW.commercial_cost := NEW.total_amount;
        RETURN NEW;
    END IF;
    
    -- Расчет commercial_cost по формуле из utils/calculateCommercialCost.ts
    v_commercial_cost := NEW.total_amount;
    
    -- Применяем наценки (упрощенная версия)
    IF v_tender_markup.works_16_markup > 0 THEN
        v_commercial_cost := v_commercial_cost * (1 + v_tender_markup.works_16_markup / 100);
    END IF;
    
    IF v_tender_markup.growth_percentage > 0 THEN
        v_commercial_cost := v_commercial_cost * (1 + v_tender_markup.growth_percentage / 100);
    END IF;
    
    IF v_tender_markup.contingency_percentage > 0 THEN
        v_commercial_cost := v_commercial_cost * (1 + v_tender_markup.contingency_percentage / 100);
    END IF;
    
    IF v_tender_markup.ooz_percentage > 0 THEN
        v_commercial_cost := v_commercial_cost * (1 + v_tender_markup.ooz_percentage / 100);
    END IF;
    
    IF v_tender_markup.ofz_percentage > 0 THEN
        v_commercial_cost := v_commercial_cost * (1 + v_tender_markup.ofz_percentage / 100);
    END IF;
    
    IF v_tender_markup.profit_percentage > 0 THEN
        v_commercial_cost := v_commercial_cost * (1 + v_tender_markup.profit_percentage / 100);
    END IF;
    
    NEW.commercial_cost := v_commercial_cost;
    
    RETURN NEW;
END;
$function$

-- Function: public.calculate_commercial_cost
CREATE OR REPLACE FUNCTION public.calculate_commercial_cost(p_unit_rate numeric, p_delivery_amount numeric, p_delivery_price_type delivery_price_type, p_markup_coefficient numeric, p_item_type boq_item_type)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
  DECLARE
      base_cost numeric;
      commercial_cost numeric;
  BEGIN
      -- Базовая стоимость = unit_rate + доставка (для материалов)
      base_cost := COALESCE(p_unit_rate, 0);

      -- Добавляем стоимость доставки для материалов
      IF p_item_type IN ('material', 'sub_material') THEN
          CASE p_delivery_price_type
              WHEN 'amount' THEN
                  base_cost := base_cost + COALESCE(p_delivery_amount, 0);
              WHEN 'not_included' THEN
                  -- Автоматические 3% от unit_rate
                  base_cost := base_cost + (COALESCE(p_unit_rate, 0) * 0.03);
              ELSE
                  -- 'included' - доставка уже включена в unit_rate
                  base_cost := base_cost;
          END CASE;
      END IF;

      -- Применяем коммерческий коэффициент
      commercial_cost := base_cost * COALESCE(p_markup_coefficient, 1.0);

      RETURN ROUND(commercial_cost, 2);
  END;
  $function$

-- Function: public.calculate_delivery_amount_trigger
CREATE OR REPLACE FUNCTION public.calculate_delivery_amount_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.item_type IN ('material', 'sub_material') THEN
        CASE NEW.delivery_price_type
            WHEN 'not_included' THEN
                -- 3% от цены за единицу
                NEW.delivery_amount = COALESCE(NEW.unit_rate, 0) * 0.03;
            WHEN 'amount' THEN
                -- Пользователь задает сумму
                NEW.delivery_amount = COALESCE(NEW.delivery_amount, 0);
            ELSE -- 'included'
                NEW.delivery_amount = 0;
        END CASE;
        
        -- total_amount пересчитается автоматически как generated column
    END IF;
    
    RETURN NEW;
END;
$function$

-- Function: public.calculate_fuzzy_score
CREATE OR REPLACE FUNCTION public.calculate_fuzzy_score(str1 text, str2 text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$

-- Function: public.calculate_tender_costs
CREATE OR REPLACE FUNCTION public.calculate_tender_costs(p_tender_id uuid)
 RETURNS TABLE(total_base numeric, total_with_markup numeric, total_by_category jsonb, total_by_location jsonb, items_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH tender_costs AS (
        SELECT * FROM v_tender_costs
        WHERE tender_id = p_tender_id
        AND is_included = true
    )
    SELECT 
        COALESCE(SUM(tc.base_final_price), 0) as total_base,
        COALESCE(SUM(tc.final_price), 0) as total_with_markup,
        COALESCE(
            jsonb_object_agg(
                tc.category_name,
                tc.category_total
            ) FILTER (WHERE tc.category_name IS NOT NULL),
            '{}'::jsonb
        ) as total_by_category,
        COALESCE(
            jsonb_object_agg(
                tc.location_name,
                tc.location_total
            ) FILTER (WHERE tc.location_name IS NOT NULL),
            '{}'::jsonb
        ) as total_by_location,
        COUNT(*) as items_count
    FROM (
        SELECT 
            category_name,
            location_name,
            base_final_price,
            final_price,
            SUM(final_price) OVER (PARTITION BY category_name) as category_total,
            SUM(final_price) OVER (PARTITION BY location_name) as location_total
        FROM tender_costs
    ) tc
    GROUP BY tc.category_name, tc.location_name, tc.base_final_price, 
             tc.final_price, tc.category_total, tc.location_total;
END;
$function$

-- Function: public.check_boq_item_delivery_consistency
CREATE OR REPLACE FUNCTION public.check_boq_item_delivery_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Allow all item types including sub_work and sub_material
    RETURN NEW;
END;
$function$

-- Function: public.check_boq_mappings
CREATE OR REPLACE FUNCTION public.check_boq_mappings(p_new_tender_id uuid)
 RETURNS TABLE(mapping_type text, item_type text, count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        bm.mapping_type,
        bm.item_type,
        COUNT(*) as cnt
    FROM boq_item_version_mappings bm
    WHERE bm.new_tender_id = p_new_tender_id
    GROUP BY bm.mapping_type, bm.item_type
    ORDER BY bm.mapping_type, bm.item_type;
END;
$function$

-- Function: public.check_delivery_consistency_boq
CREATE OR REPLACE FUNCTION public.check_delivery_consistency_boq()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Allow all item types including sub_work and sub_material
    RETURN NEW;
END;
$function$

-- Function: public.check_delivery_price_consistency
CREATE OR REPLACE FUNCTION public.check_delivery_price_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Если тип доставки не "amount", то обнуляем сумму доставки
    IF NEW.delivery_price_type != 'amount' THEN
        NEW.delivery_amount := 0;
    END IF;
    
    -- Если тип доставки "amount" и сумма не указана, устанавливаем 0
    IF NEW.delivery_price_type = 'amount' AND NEW.delivery_amount IS NULL THEN
        NEW.delivery_amount := 0;
    END IF;
    
    RETURN NEW;
END;
$function$

-- Function: public.check_transfer_functions
CREATE OR REPLACE FUNCTION public.check_transfer_functions()
 RETURNS TABLE(function_name text, parameters text, return_type text, is_available boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.proname::TEXT as function_name,
        pg_get_function_arguments(p.oid)::TEXT as parameters,
        pg_get_function_result(p.oid)::TEXT as return_type,
        true as is_available
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname LIKE '%transfer%'
    ORDER BY p.proname;
END;
$function$

-- Function: public.check_work_material_types
CREATE OR REPLACE FUNCTION public.check_work_material_types()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check work_boq_item_id if it's not null
    IF NEW.work_boq_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.boq_items 
            WHERE id = NEW.work_boq_item_id 
            AND item_type = 'work'
        ) THEN
            RAISE EXCEPTION 'work_boq_item_id must reference a BOQ item with type "work"';
        END IF;
    END IF;
    
    -- Check sub_work_boq_item_id if it's not null
    IF NEW.sub_work_boq_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.boq_items 
            WHERE id = NEW.sub_work_boq_item_id 
            AND item_type = 'sub_work'
        ) THEN
            RAISE EXCEPTION 'sub_work_boq_item_id must reference a BOQ item with type "sub_work"';
        END IF;
    END IF;
    
    -- Check material_boq_item_id if it's not null
    IF NEW.material_boq_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.boq_items 
            WHERE id = NEW.material_boq_item_id 
            AND item_type = 'material'
        ) THEN
            RAISE EXCEPTION 'material_boq_item_id must reference a BOQ item with type "material"';
        END IF;
    END IF;
    
    -- Check sub_material_boq_item_id if it's not null
    IF NEW.sub_material_boq_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.boq_items 
            WHERE id = NEW.sub_material_boq_item_id 
            AND item_type = 'sub_material'
        ) THEN
            RAISE EXCEPTION 'sub_material_boq_item_id must reference a BOQ item with type "sub_material"';
        END IF;
    END IF;
    
    -- Ensure at least one valid pair is set
    IF NOT (
        (NEW.work_boq_item_id IS NOT NULL AND NEW.material_boq_item_id IS NOT NULL) OR
        (NEW.work_boq_item_id IS NOT NULL AND NEW.sub_material_boq_item_id IS NOT NULL) OR
        (NEW.sub_work_boq_item_id IS NOT NULL AND NEW.material_boq_item_id IS NOT NULL) OR
        (NEW.sub_work_boq_item_id IS NOT NULL AND NEW.sub_material_boq_item_id IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Must have at least one valid work-material pair';
    END IF;
    
    -- Check that all items belong to the same position
    -- This check is more complex now with multiple possible combinations
    DECLARE
        work_position_id uuid;
        material_position_id uuid;
    BEGIN
        -- Get work position ID (from either work or sub_work)
        IF NEW.work_boq_item_id IS NOT NULL THEN
            SELECT client_position_id INTO work_position_id 
            FROM public.boq_items 
            WHERE id = NEW.work_boq_item_id;
        ELSIF NEW.sub_work_boq_item_id IS NOT NULL THEN
            SELECT client_position_id INTO work_position_id 
            FROM public.boq_items 
            WHERE id = NEW.sub_work_boq_item_id;
        END IF;
        
        -- Get material position ID (from either material or sub_material)
        IF NEW.material_boq_item_id IS NOT NULL THEN
            SELECT client_position_id INTO material_position_id 
            FROM public.boq_items 
            WHERE id = NEW.material_boq_item_id;
        ELSIF NEW.sub_material_boq_item_id IS NOT NULL THEN
            SELECT client_position_id INTO material_position_id 
            FROM public.boq_items 
            WHERE id = NEW.sub_material_boq_item_id;
        END IF;
        
        -- Check that both belong to the same position as specified
        IF work_position_id != NEW.client_position_id OR 
           material_position_id != NEW.client_position_id OR
           work_position_id != material_position_id THEN
            RAISE EXCEPTION 'All linked items must belong to the same client position';
        END IF;
    END;
    
    RETURN NEW;
END;
$function$

-- Function: public.cleanup_draft_versions
CREATE OR REPLACE FUNCTION public.cleanup_draft_versions(p_parent_tender_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Удаляем все черновые версии, у которых нет позиций
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
$function$

-- Function: public.clear_all_category_location_mappings
CREATE OR REPLACE FUNCTION public.clear_all_category_location_mappings()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Удаляем все существующие маппинги
    DELETE FROM public.category_location_mapping;
    
    -- Сбрасываем счетчики если нужно
    -- PERFORM setval('category_location_mapping_id_seq', 1, false);
END;
$function$

-- Function: public.complete_version_transfer
CREATE OR REPLACE FUNCTION public.complete_version_transfer(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
    RAISE NOTICE 'Starting transfer from % to %', p_old_tender_id, p_new_tender_id;

    -- Переносим BOQ items для всех замапленных позиций
    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
        AND old_position_id IS NOT NULL
        AND new_position_id IS NOT NULL
        AND mapping_status != 'rejected'
    LOOP
        -- Получаем информацию о новой позиции
        SELECT * INTO v_new_position
        FROM client_positions
        WHERE id = v_mapping.new_position_id;

        -- Проверяем, что функция transfer_boq_with_mapping существует
        BEGIN
            v_result := transfer_boq_with_mapping(v_mapping.id);

            IF (v_result->>'success')::boolean THEN
                v_total_boq := v_total_boq + COALESCE((v_result->>'boq_items_mapped')::integer, 0);
                v_total_positions := v_total_positions + 1;
            END IF;
        EXCEPTION
            WHEN undefined_function THEN
                -- Если функция не существует, делаем прямое копирование
                RAISE NOTICE 'Function transfer_boq_with_mapping not found, using direct copy';

                -- Удаляем существующие BOQ items в новой позиции
                DELETE FROM boq_items WHERE client_position_id = v_mapping.new_position_id;

                -- Копируем BOQ items напрямую с правильными item_numbers
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

    -- НОВОЕ: Переносим manual_volume и manual_note для обычных позиций
    -- После переноса BOQ items обновляем manual поля в позициях
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

    IF v_manual_updated > 0 THEN
        RAISE NOTICE '✅ Updated manual fields for % positions', v_manual_updated;
    END IF;

    -- Переносим ДОП позиции
    v_dop_result := transfer_dop_positions(p_new_tender_id, p_old_tender_id);

    RETURN json_build_object(
        'success', true,
        'positions_transferred', v_total_positions,
        'boq_items_transferred', v_total_boq,
        'manual_fields_updated', v_manual_updated,
        'dop_result', v_dop_result
    );
END;
$function$

-- Function: public.complete_version_transfer_with_links
CREATE OR REPLACE FUNCTION public.complete_version_transfer_with_links(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_main_result JSON;
    v_total_links INTEGER := 0;
    v_mapping RECORD;
    v_link_count INTEGER;
BEGIN
    -- Сначала вызываем основную функцию переноса (теперь с manual полями)
    v_main_result := complete_version_transfer(p_old_tender_id, p_new_tender_id);

    -- Теперь переносим work_material_links для каждого маппинга
    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
        AND old_position_id IS NOT NULL
        AND new_position_id IS NOT NULL
    LOOP
        v_link_count := transfer_work_material_links(v_mapping.old_position_id, v_mapping.new_position_id);
        v_total_links := v_total_links + v_link_count;
    END LOOP;

    -- Добавляем информацию о links в результат
    RETURN json_build_object(
        'success', (v_main_result->>'success')::boolean,
        'positions_transferred', v_main_result->>'positions_transferred',
        'boq_items_transferred', v_main_result->>'boq_items_transferred',
        'manual_fields_updated', v_main_result->>'manual_fields_updated',
        'dop_result', v_main_result->'dop_result',
        'links_transferred', v_total_links
    );
END;
$function$

-- Function: public.cost_nodes_autosort
CREATE OR REPLACE FUNCTION public.cost_nodes_autosort()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.sort_order is null then
    select coalesce(max(sort_order),0)+10
      into new.sort_order
      from public.cost_nodes
     where parent_id is not distinct from new.parent_id;
  end if;
  return new;
end $function$

-- Function: public.cost_nodes_before_ins_upd
CREATE OR REPLACE FUNCTION public.cost_nodes_before_ins_upd()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.path := public._calc_path(new.parent_id, new.sort_order);
  return new;
end $function$

-- Function: public.cost_nodes_repath_descendants
CREATE OR REPLACE FUNCTION public.cost_nodes_repath_descendants()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare old_root ltree; new_root ltree;
begin
  old_root := old.path;
  new_root := new.path;
  if old_root <> new_root then
    update public.cost_nodes c
       set path = new_root || subpath(c.path, nlevel(old_root))
     where c.path <@ old_root
       and c.id <> new.id;
  end if;
  return null;
end $function$

-- Function: public.cost_nodes_set_timestamps
CREATE OR REPLACE FUNCTION public.cost_nodes_set_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  return new;
end $function$

-- Function: public.create_tender_version
CREATE OR REPLACE FUNCTION public.create_tender_version(p_parent_tender_id uuid, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_new_tender_id UUID;
    v_parent_tender RECORD;
    v_new_version INTEGER;
    v_new_tender_number TEXT;
    v_counter INTEGER := 2;
BEGIN
    -- Получаем информацию о родительском тендере
    SELECT * INTO v_parent_tender
    FROM tenders
    WHERE id = p_parent_tender_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent tender not found: %', p_parent_tender_id;
    END IF;

    -- Находим максимальный номер версии для этого тендера
    SELECT COALESCE(MAX(version), 1) + 1 INTO v_new_version
    FROM tenders
    WHERE id = p_parent_tender_id
       OR parent_version_id = p_parent_tender_id;

    -- Генерируем уникальный номер тендера
    v_new_tender_number := v_parent_tender.tender_number || '_v' || v_new_version;

    -- Проверяем уникальность и при необходимости добавляем суффикс
    WHILE EXISTS (SELECT 1 FROM tenders WHERE tender_number = v_new_tender_number) LOOP
        v_new_tender_number := v_parent_tender.tender_number || '_v' || v_new_version || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    -- Создаем новый тендер как версию
    -- ВАЖНО: НЕ добавляем версию к названию тендера
    INSERT INTO tenders (
        title,
        description,
        client_name,
        tender_number,
        submission_deadline,
        area_sp,
        area_client,
        usd_rate,
        eur_rate,
        cny_rate,
        upload_folder,
        bsm_link,
        tz_clarification_link,
        qa_form_link,
        version,
        parent_version_id,
        version_status,
        version_created_by
    )
    SELECT
        title,  -- Используем оригинальное название без добавления версии
        description,
        client_name,
        v_new_tender_number,
        submission_deadline,
        area_sp,
        area_client,
        usd_rate,
        eur_rate,
        cny_rate,
        upload_folder,
        bsm_link,
        tz_clarification_link,
        qa_form_link,
        v_new_version,
        p_parent_tender_id,
        'draft',
        p_created_by
    FROM tenders
    WHERE id = p_parent_tender_id
    RETURNING id INTO v_new_tender_id;

    -- Записываем в историю
    INSERT INTO tender_version_history (
        tender_id,
        version_number,
        action,
        details,
        performed_by
    ) VALUES (
        v_new_tender_id,
        v_new_version,
        'created',
        jsonb_build_object(
            'parent_tender_id', p_parent_tender_id,
            'parent_version', v_parent_tender.version
        ),
        p_created_by
    );

    RETURN v_new_tender_id;
END;
$function$

-- Function: public.debug_cost_nodes
CREATE OR REPLACE FUNCTION public.debug_cost_nodes(p_category_name text DEFAULT NULL::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(node_id uuid, parent_id uuid, kind text, name text, location_id uuid, category_name text, location_country text, location_title text, location_code text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        cn.id,
        cn.parent_id,
        cn.kind,
        cn.name,
        cn.location_id,
        cp.name as category_name,
        l.country as location_country,  -- Use country field
        l.title as location_title,
        l.code as location_code
    FROM public.cost_nodes cn
    LEFT JOIN public.cost_nodes cp ON cp.id = cn.parent_id
    LEFT JOIN public.location l ON l.id = cn.location_id
    WHERE (p_category_name IS NULL OR cp.name ILIKE '%' || p_category_name || '%')
    ORDER BY cn.path
    LIMIT p_limit;
END;
$function$

-- Function: public.debug_transfer_mapping
CREATE OR REPLACE FUNCTION public.debug_transfer_mapping(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_old_boq_count INTEGER;
    v_new_boq_count INTEGER;
    v_old_links_count INTEGER;
    v_old_tender_id UUID;
    v_new_tender_id UUID;
BEGIN
    -- Получаем маппинг
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'error', 'Mapping not found',
            'mapping_id', p_mapping_id
        );
    END IF;

    -- Получаем tender_id для старой позиции
    SELECT tender_id INTO v_old_tender_id
    FROM client_positions
    WHERE id = v_mapping.old_position_id;

    -- Получаем tender_id для новой позиции
    SELECT tender_id INTO v_new_tender_id
    FROM client_positions
    WHERE id = v_mapping.new_position_id;

    -- Считаем BOQ items в старой позиции
    SELECT COUNT(*) INTO v_old_boq_count
    FROM boq_items
    WHERE client_position_id = v_mapping.old_position_id;

    -- Считаем BOQ items в новой позиции
    SELECT COUNT(*) INTO v_new_boq_count
    FROM boq_items
    WHERE client_position_id = v_mapping.new_position_id;

    -- Считаем links в старой позиции
    SELECT COUNT(*) INTO v_old_links_count
    FROM work_material_links
    WHERE client_position_id = v_mapping.old_position_id;

    RETURN json_build_object(
        'mapping_id', p_mapping_id,
        'old_position_id', v_mapping.old_position_id,
        'new_position_id', v_mapping.new_position_id,
        'old_tender_id', v_old_tender_id,
        'new_tender_id', v_new_tender_id,
        'old_boq_count', v_old_boq_count,
        'new_boq_count', v_new_boq_count,
        'old_links_count', v_old_links_count
    );
END;
$function$

-- Function: public.diagnose_tender_transfer
CREATE OR REPLACE FUNCTION public.diagnose_tender_transfer(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSON;
    v_old_positions INTEGER;
    v_new_positions INTEGER;
    v_old_boq INTEGER;
    v_new_boq INTEGER;
    v_old_links INTEGER;
    v_new_links INTEGER;
    v_old_dop INTEGER;
    v_new_dop INTEGER;
    v_mappings INTEGER;
BEGIN
    -- Считаем позиции в старом тендере
    SELECT COUNT(*) INTO v_old_positions
    FROM client_positions
    WHERE tender_id = p_old_tender_id
    AND is_additional = false;

    -- Считаем позиции в новом тендере
    SELECT COUNT(*) INTO v_new_positions
    FROM client_positions
    WHERE tender_id = p_new_tender_id
    AND is_additional = false;

    -- Считаем BOQ items в старом тендере
    SELECT COUNT(*) INTO v_old_boq
    FROM boq_items
    WHERE tender_id = p_old_tender_id;

    -- Считаем BOQ items в новом тендере
    SELECT COUNT(*) INTO v_new_boq
    FROM boq_items
    WHERE tender_id = p_new_tender_id;

    -- Считаем links в старом тендере
    SELECT COUNT(*) INTO v_old_links
    FROM work_material_links wml
    JOIN client_positions cp ON cp.id = wml.client_position_id
    WHERE cp.tender_id = p_old_tender_id;

    -- Считаем links в новом тендере
    SELECT COUNT(*) INTO v_new_links
    FROM work_material_links wml
    JOIN client_positions cp ON cp.id = wml.client_position_id
    WHERE cp.tender_id = p_new_tender_id;

    -- Считаем ДОП позиции в старом тендере
    SELECT COUNT(*) INTO v_old_dop
    FROM client_positions
    WHERE tender_id = p_old_tender_id
    AND is_additional = true;

    -- Считаем ДОП позиции в новом тендере
    SELECT COUNT(*) INTO v_new_dop
    FROM client_positions
    WHERE tender_id = p_new_tender_id
    AND is_additional = true;

    -- Считаем маппинги
    SELECT COUNT(*) INTO v_mappings
    FROM tender_version_mappings
    WHERE new_tender_id = p_new_tender_id;

    RETURN json_build_object(
        'old_tender', json_build_object(
            'id', p_old_tender_id,
            'positions', v_old_positions,
            'boq_items', v_old_boq,
            'links', v_old_links,
            'dop_positions', v_old_dop
        ),
        'new_tender', json_build_object(
            'id', p_new_tender_id,
            'positions', v_new_positions,
            'boq_items', v_new_boq,
            'links', v_new_links,
            'dop_positions', v_new_dop
        ),
        'mappings', v_mappings
    );
END;
$function$

-- Function: public.drop_client_positions_indexes
CREATE OR REPLACE FUNCTION public.drop_client_positions_indexes()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DROP INDEX CONCURRENTLY IF EXISTS idx_client_positions_tender_position;
    DROP INDEX CONCURRENTLY IF EXISTS idx_client_positions_search_gin;
    DROP INDEX CONCURRENTLY IF EXISTS idx_client_positions_hierarchy;
    DROP INDEX CONCURRENTLY IF EXISTS idx_client_positions_additional;
    DROP INDEX CONCURRENTLY IF EXISTS idx_boq_items_client_position;
    DROP INDEX CONCURRENTLY IF EXISTS idx_boq_items_aggregation;
    DROP INDEX CONCURRENTLY IF EXISTS idx_boq_items_tender_type;
    DROP INDEX CONCURRENTLY IF EXISTS idx_work_material_links_position;
    DROP INDEX CONCURRENTLY IF EXISTS idx_work_material_links_items;
    DROP INDEX CONCURRENTLY IF EXISTS idx_client_positions_with_boq_tender;

    RAISE NOTICE 'All client positions optimization indexes dropped';
END;
$function$

-- Function: public.find_cost_node_by_combination
CREATE OR REPLACE FUNCTION public.find_cost_node_by_combination(p_category_id uuid, p_detail_id uuid, p_location_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_cost_node_id UUID;
    v_debug TEXT;
BEGIN
    -- Debug logging
    RAISE NOTICE 'Searching for cost_node with: category=%, detail=%, location=%', 
        p_category_id, p_detail_id, p_location_id;
    
    -- Since we inserted detail_cost_categories records with their own IDs into cost_nodes,
    -- we should search by the detail_id directly
    SELECT cn.id INTO v_cost_node_id
    FROM public.cost_nodes cn
    WHERE cn.id = p_detail_id  -- The detail_id IS the cost_node id
      AND cn.parent_id = p_category_id
      AND cn.location_id = p_location_id
      AND cn.kind = 'item';
    
    IF v_cost_node_id IS NOT NULL THEN
        RAISE NOTICE 'Found cost_node by exact match: %', v_cost_node_id;
        RETURN v_cost_node_id;
    END IF;
    
    -- If not found by exact match, try to find just by ID
    -- (since detail_id should be unique)
    SELECT cn.id INTO v_cost_node_id
    FROM public.cost_nodes cn
    WHERE cn.id = p_detail_id
      AND cn.kind = 'item';
    
    IF v_cost_node_id IS NOT NULL THEN
        RAISE NOTICE 'Found cost_node by detail_id only: %', v_cost_node_id;
        RETURN v_cost_node_id;
    END IF;
    
    -- If still not found, check if this detail exists in detail_cost_categories
    SELECT dcc.id INTO v_cost_node_id
    FROM public.detail_cost_categories dcc
    WHERE dcc.id = p_detail_id
      AND dcc.cost_category_id = p_category_id
      AND dcc.location_id = p_location_id;
    
    IF v_cost_node_id IS NOT NULL THEN
        RAISE NOTICE 'Found in detail_cost_categories, returning: %', v_cost_node_id;
        -- The detail exists, return its ID
        -- (it should have been inserted into cost_nodes, but return it anyway)
        RETURN v_cost_node_id;
    END IF;
    
    -- Last resort - just return the detail_id if it exists at all
    SELECT dcc.id INTO v_cost_node_id
    FROM public.detail_cost_categories dcc
    WHERE dcc.id = p_detail_id;
    
    IF v_cost_node_id IS NOT NULL THEN
        RAISE NOTICE 'Found detail_cost_category, returning its ID: %', v_cost_node_id;
        RETURN v_cost_node_id;
    END IF;
    
    RAISE NOTICE 'No matching cost_node found, returning NULL';
    RETURN NULL;
END;
$function$

-- Function: public.find_location_id
CREATE OR REPLACE FUNCTION public.find_location_id(p_identifier text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_location_id UUID;
BEGIN
    -- Сначала ищем по unique_code
    SELECT id INTO v_location_id
    FROM public.location
    WHERE unique_code = UPPER(p_identifier)
    AND is_active = true
    LIMIT 1;
    
    -- Если не нашли, ищем по code
    IF v_location_id IS NULL THEN
        SELECT id INTO v_location_id
        FROM public.location
        WHERE code = UPPER(p_identifier)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Если не нашли, ищем по имени
    IF v_location_id IS NULL THEN
        SELECT id INTO v_location_id
        FROM public.location
        WHERE LOWER(name) = LOWER(p_identifier)
        AND is_active = true
        ORDER BY sort_order
        LIMIT 1;
    END IF;
    
    RETURN v_location_id;
END;
$function$

-- Function: public.find_or_create_cost_node
CREATE OR REPLACE FUNCTION public.find_or_create_cost_node(p_category_id uuid, p_detail_name text, p_location_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_cost_node_id UUID;
    v_detail_id UUID;
BEGIN
    -- First try to find in cost_nodes
    SELECT cn.id INTO v_cost_node_id
    FROM public.cost_nodes cn
    WHERE cn.parent_id = p_category_id
      AND cn.location_id = p_location_id
      AND cn.name ILIKE '%' || p_detail_name || '%'
      AND cn.kind = 'item'
    LIMIT 1;
    
    IF v_cost_node_id IS NOT NULL THEN
        RETURN v_cost_node_id;
    END IF;
    
    -- Try to find in detail_cost_categories
    SELECT dcc.id INTO v_detail_id
    FROM public.detail_cost_categories dcc
    WHERE dcc.cost_category_id = p_category_id
      AND dcc.location_id = p_location_id
      AND dcc.name ILIKE '%' || p_detail_name || '%'
    LIMIT 1;
    
    IF v_detail_id IS NOT NULL THEN
        -- Try to create in cost_nodes
        BEGIN
            INSERT INTO public.cost_nodes (
                id,
                parent_id,
                kind,
                name,
                location_id,
                sort_order,
                path,
                is_active
            )
            SELECT 
                dcc.id,
                dcc.cost_category_id,
                'item'::text,
                dcc.name || ' (' || COALESCE(l.city, l.name, 'ID:' || SUBSTRING(dcc.location_id::text FROM 1 FOR 8)) || ')',
                dcc.location_id,
                1000,
                REPLACE(dcc.id::text, '-', '_')::ltree,
                true
            FROM public.detail_cost_categories dcc
            LEFT JOIN public.location l ON l.id = dcc.location_id
            WHERE dcc.id = v_detail_id
            ON CONFLICT (id) DO NOTHING;
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignore errors
        END;
        RETURN v_detail_id;
    END IF;
    
    -- If nothing found, return NULL
    RETURN NULL;
END;
$function$

-- Function: public.generate_unique_location_code
CREATE OR REPLACE FUNCTION public.generate_unique_location_code(p_name text, p_type text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_base_code TEXT;
    v_unique_code TEXT;
    v_counter INTEGER := 1;
BEGIN
    -- Генерируем базовый код из имени
    v_base_code := UPPER(REGEXP_REPLACE(p_name, '[^А-Яа-яA-Za-z0-9]', '_', 'g'));
    
    -- Если указан тип, добавляем префикс
    IF p_type IS NOT NULL THEN
        v_base_code := UPPER(LEFT(p_type, 3)) || '_' || v_base_code;
    END IF;
    
    -- Проверяем уникальность и добавляем номер при необходимости
    v_unique_code := v_base_code;
    
    WHILE EXISTS (SELECT 1 FROM public.location WHERE code = v_unique_code) LOOP
        v_unique_code := v_base_code || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;
    
    RETURN v_unique_code;
END;
$function$

-- Function: public.get_client_positions_count
CREATE OR REPLACE FUNCTION public.get_client_positions_count(p_tender_id uuid, p_search_query text DEFAULT NULL::text, p_category_filter text[] DEFAULT NULL::text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    position_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO position_count
    FROM client_positions cp
    WHERE cp.tender_id = p_tender_id
    AND (
        p_search_query IS NULL
        OR to_tsvector('russian',
            COALESCE(cp.work_name, '') || ' ' ||
            COALESCE(cp.item_no, '') || ' ' ||
            COALESCE(cp.client_note, '')
        ) @@ plainto_tsquery('russian', p_search_query)
    )
    AND (
        p_category_filter IS NULL
        OR cp.category = ANY(p_category_filter)
    );

    RETURN position_count;
END;
$function$

-- Function: public.get_client_positions_optimized
CREATE OR REPLACE FUNCTION public.get_client_positions_optimized(p_tender_id uuid, p_search_query text DEFAULT NULL::text, p_category_filter text[] DEFAULT NULL::text[], p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, tender_id uuid, position_number integer, item_no character varying, work_name text, unit character varying, volume numeric, manual_volume numeric, client_note text, manual_note text, position_type character varying, hierarchy_level integer, is_additional boolean, parent_position_id uuid, total_materials_cost numeric, total_works_cost numeric, total_commercial_materials_cost numeric, total_commercial_works_cost numeric, created_at timestamp with time zone, updated_at timestamp with time zone, boq_items_count bigint, total_boq_cost numeric, materials_count bigint, works_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        cpbs.*
    FROM client_positions_with_boq_summary cpbs
    WHERE cpbs.tender_id = p_tender_id
    AND (
        p_search_query IS NULL
        OR to_tsvector('russian',
            COALESCE(cpbs.work_name, '') || ' ' ||
            COALESCE(cpbs.item_no, '') || ' ' ||
            COALESCE(cpbs.client_note, '')
        ) @@ plainto_tsquery('russian', p_search_query)
    )
    AND (
        p_category_filter IS NULL
        OR cpbs.category = ANY(p_category_filter)
    )
    ORDER BY cpbs.position_number
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$

-- Function: public.get_cost_categories
CREATE OR REPLACE FUNCTION public.get_cost_categories()
 RETURNS TABLE(id uuid, name text, code text, description text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.name,
        cc.code,
        cc.description
    FROM public.cost_categories cc
    ORDER BY cc.name;
END;
$function$

-- Function: public.get_cost_node_display
CREATE OR REPLACE FUNCTION public.get_cost_node_display(p_cost_node_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_display TEXT;
    v_category_name TEXT;
    v_detail_name TEXT;
    v_location_name TEXT;
BEGIN
    -- Try to get from cost_nodes first
    SELECT 
        cp.name,
        cn.name,
        COALESCE(
            NULLIF(l.country, ''),  -- Use country field first
            NULLIF(l.city, ''),
            NULLIF(l.title, ''),
            NULLIF(l.code, ''),
            ''
        )
    INTO v_category_name, v_detail_name, v_location_name
    FROM public.cost_nodes cn
    LEFT JOIN public.cost_nodes cp ON cp.id = cn.parent_id
    LEFT JOIN public.location l ON l.id = cn.location_id
    WHERE cn.id = p_cost_node_id;
    
    IF v_category_name IS NOT NULL THEN
        -- Clean up the detail name if it has location info appended
        v_detail_name := REGEXP_REPLACE(v_detail_name, ' \(.*\)$', '');
        
        IF v_location_name != '' THEN
            v_display := v_category_name || ' → ' || v_detail_name || ' → ' || v_location_name;
        ELSE
            v_display := v_category_name || ' → ' || v_detail_name;
        END IF;
        RETURN v_display;
    END IF;
    
    -- If not found in cost_nodes, try detail_cost_categories
    SELECT 
        cc.name,
        dcc.name,
        COALESCE(
            NULLIF(l.country, ''),  -- Use country field first
            NULLIF(l.city, ''),
            NULLIF(l.title, ''),
            NULLIF(l.code, ''),
            ''
        )
    INTO v_category_name, v_detail_name, v_location_name
    FROM public.detail_cost_categories dcc
    LEFT JOIN public.cost_categories cc ON cc.id = dcc.cost_category_id
    LEFT JOIN public.location l ON l.id = dcc.location_id
    WHERE dcc.id = p_cost_node_id;
    
    IF v_category_name IS NOT NULL THEN
        IF v_location_name != '' THEN
            v_display := v_category_name || ' → ' || v_detail_name || ' → ' || v_location_name;
        ELSE
            v_display := v_category_name || ' → ' || v_detail_name;
        END IF;
        RETURN v_display;
    END IF;
    
    RETURN NULL;
END;
$function$

-- Function: public.get_cost_structure_mappings
CREATE OR REPLACE FUNCTION public.get_cost_structure_mappings(p_category_id uuid DEFAULT NULL::uuid, p_detail_id uuid DEFAULT NULL::uuid, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(mapping_id uuid, category_id uuid, category_name text, detail_id uuid, detail_name text, detail_unit text, location_id uuid, location_name text, quantity numeric, unit_price numeric, total_price numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        clm.id as mapping_id,
        cc.id as category_id,
        cc.name as category_name,
        dcc.id as detail_id,
        dcc.name as detail_name,
        dcc.unit as detail_unit,
        l.id as location_id,
        l.name as location_name,
        clm.quantity,
        clm.unit_price,
        clm.quantity * clm.unit_price as total_price
    FROM public.category_location_mapping clm
    JOIN public.detail_cost_categories dcc ON dcc.id = clm.detail_category_id
    JOIN public.cost_categories cc ON cc.id = dcc.category_id
    JOIN public.location l ON l.id = clm.location_id
    WHERE clm.is_active = true
    AND (p_category_id IS NULL OR cc.id = p_category_id)
    AND (p_detail_id IS NULL OR dcc.id = p_detail_id)
    AND (p_location_id IS NULL OR l.id = p_location_id)
    ORDER BY cc.sort_order, cc.name, dcc.sort_order, dcc.name, l.sort_order, l.name;
END;
$function$

-- Function: public.get_details_by_category
CREATE OR REPLACE FUNCTION public.get_details_by_category(p_category_id uuid)
 RETURNS TABLE(id uuid, name text, unit text, unit_cost numeric, location_id uuid, location_name text, has_single_location boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH detail_locations AS (
        SELECT 
            dcc.id,
            dcc.name,
            NULL::TEXT as unit,
            dcc.unit_cost,
            dcc.location_id,
            COALESCE(
                NULLIF(l.country, ''),  -- Use country field first
                NULLIF(l.city, ''),
                NULLIF(l.title, ''),
                NULLIF(l.code, ''),
                'Локация ' || SUBSTRING(l.id::text FROM 1 FOR 8)
            ) as location_name,
            COUNT(*) OVER (PARTITION BY dcc.name) = 1 as has_single_location
        FROM public.detail_cost_categories dcc
        LEFT JOIN public.location l ON l.id = dcc.location_id
        WHERE dcc.cost_category_id = p_category_id
    )
    SELECT * FROM detail_locations
    ORDER BY name, location_name;
END;
$function$

-- Function: public.get_location_hierarchy
CREATE OR REPLACE FUNCTION public.get_location_hierarchy(p_location_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, code text, name text, parent_id uuid, level integer, path text[], children_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH RECURSIVE location_tree AS (
        -- Базовый случай: корневые локации или конкретная локация
        SELECT 
            l.id,
            l.code,
            l.name,
            l.parent_id,
            l.level,
            l.path,
            (SELECT COUNT(*) FROM public.location WHERE parent_id = l.id) as children_count
        FROM public.location l
        WHERE 
            CASE 
                WHEN p_location_id IS NULL THEN l.parent_id IS NULL
                ELSE l.id = p_location_id
            END
        
        UNION ALL
        
        -- Рекурсивный случай: дочерние локации
        SELECT 
            l.id,
            l.code,
            l.name,
            l.parent_id,
            l.level,
            l.path,
            (SELECT COUNT(*) FROM public.location WHERE parent_id = l.id) as children_count
        FROM public.location l
        JOIN location_tree lt ON l.parent_id = lt.id
    )
    SELECT * FROM location_tree
    ORDER BY level, sort_order, name;
END;
$function$

-- Function: public.get_locations_by_detail
CREATE OR REPLACE FUNCTION public.get_locations_by_detail(p_category_id uuid, p_detail_name text)
 RETURNS TABLE(detail_id uuid, location_id uuid, location_name text, unit_cost numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        dcc.id as detail_id,
        dcc.location_id,
        COALESCE(
            NULLIF(l.country, ''),  -- Use country field first
            NULLIF(l.city, ''),
            NULLIF(l.title, ''),
            NULLIF(l.code, ''),
            'Локация ' || SUBSTRING(l.id::text FROM 1 FOR 8)
        ) as location_name,
        dcc.unit_cost
    FROM public.detail_cost_categories dcc
    LEFT JOIN public.location l ON l.id = dcc.location_id
    WHERE dcc.cost_category_id = p_category_id
      AND dcc.name = p_detail_name
    ORDER BY location_name;
END;
$function$

-- Function: public.get_locations_for_detail_category
CREATE OR REPLACE FUNCTION public.get_locations_for_detail_category(p_detail_category_id uuid)
 RETURNS TABLE(location_id uuid, location_name text, location_code text, location_description text, sort_order integer)
 LANGUAGE plpgsql
AS $function$
  BEGIN
      RETURN QUERY
      SELECT
          l.id as location_id,
          l.name as location_name,
          l.code as location_code,
          l.description as location_description,
          l.sort_order
      FROM public.category_location_mapping clm
      JOIN public.location l ON l.id = clm.location_id
      WHERE clm.detail_category_id = p_detail_category_id
      AND clm.is_active = true
      AND l.is_active = true
      ORDER BY l.sort_order, l.name;
  END;
  $function$

-- Function: public.get_mapping_statistics
CREATE OR REPLACE FUNCTION public.get_mapping_statistics()
 RETURNS TABLE(total_categories bigint, total_detail_categories bigint, total_locations bigint, total_mappings bigint, categories_with_details bigint, details_with_locations bigint, avg_locations_per_detail numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.cost_categories WHERE is_active = true) as total_categories,
        (SELECT COUNT(*) FROM public.detail_cost_categories WHERE is_active = true) as total_detail_categories,
        (SELECT COUNT(*) FROM public.location WHERE is_active = true) as total_locations,
        (SELECT COUNT(*) FROM public.category_location_mapping WHERE is_active = true) as total_mappings,
        (SELECT COUNT(DISTINCT category_id) 
         FROM public.detail_cost_categories 
         WHERE is_active = true) as categories_with_details,
        (SELECT COUNT(DISTINCT detail_category_id) 
         FROM public.category_location_mapping 
         WHERE is_active = true) as details_with_locations,
        (SELECT AVG(location_count)::numeric(10,2)
         FROM (
             SELECT detail_category_id, COUNT(*) as location_count
             FROM public.category_location_mapping
             WHERE is_active = true
             GROUP BY detail_category_id
         ) t) as avg_locations_per_detail;
END;
$function$

-- Function: public.get_materials_for_work
CREATE OR REPLACE FUNCTION public.get_materials_for_work(p_work_boq_item_id uuid)
 RETURNS TABLE(link_id uuid, material_id uuid, material_description text, material_unit text, material_quantity numeric, material_unit_rate numeric, total_needed numeric, total_cost numeric)
 LANGUAGE plpgsql
AS $function$
  BEGIN
      RETURN QUERY
      SELECT
          wml.id AS link_id,
          m.id AS material_id,
          m.description AS material_description,
          m.unit AS material_unit,
          m.quantity AS material_quantity,
          m.unit_rate AS material_unit_rate,
          (w.quantity * COALESCE(m.consumption_coefficient, 1) *
  COALESCE(m.conversion_coefficient, 1)) AS total_needed,
          (w.quantity * COALESCE(m.consumption_coefficient, 1) *
  COALESCE(m.conversion_coefficient, 1) * COALESCE(m.unit_rate, 0)) AS total_cost
      FROM work_material_links wml
      JOIN boq_items w ON wml.work_boq_item_id = w.id
      JOIN boq_items m ON wml.material_boq_item_id = m.id
      WHERE wml.work_boq_item_id = p_work_boq_item_id;
  END;
  $function$

-- Function: public.get_next_client_position_number
CREATE OR REPLACE FUNCTION public.get_next_client_position_number(p_tender_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_next_position_number INTEGER;
BEGIN
  -- This is an alias for get_next_position_number for backward compatibility
  SELECT get_next_position_number(p_tender_id) INTO v_next_position_number;
  RETURN v_next_position_number;
END;
$function$

-- Function: public.get_next_position_number
CREATE OR REPLACE FUNCTION public.get_next_position_number(p_tender_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_next_position_number INTEGER;
BEGIN
  -- Lock the tender row to prevent concurrent modifications
  PERFORM 1 FROM public.tenders WHERE id = p_tender_id FOR UPDATE;
  
  -- Get the maximum position_number for this tender
  SELECT COALESCE(MAX(position_number), 0) + 1
  INTO v_next_position_number
  FROM public.client_positions
  WHERE tender_id = p_tender_id;
  
  RETURN v_next_position_number;
END;
$function$

-- Function: public.get_next_sub_number
CREATE OR REPLACE FUNCTION public.get_next_sub_number(p_client_position_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_next_sub_number INTEGER;
BEGIN
  -- Use advisory lock for thread safety
  PERFORM pg_advisory_lock(hashtext('get_next_sub_number_' || p_client_position_id::text));
  
  BEGIN
    -- Get the maximum sub_number for this position with FOR UPDATE
    SELECT COALESCE(MAX(sub_number), 0) + 1
    INTO v_next_sub_number
    FROM public.boq_items
    WHERE client_position_id = p_client_position_id
    FOR UPDATE;
    
    -- Release the advisory lock
    PERFORM pg_advisory_unlock(hashtext('get_next_sub_number_' || p_client_position_id::text));
    
    RETURN v_next_sub_number;
    
  EXCEPTION WHEN OTHERS THEN
    -- Ensure lock is released even in case of error
    PERFORM pg_advisory_unlock(hashtext('get_next_sub_number_' || p_client_position_id::text));
    RAISE;
  END;
END;
$function$

-- Function: public.get_tender_costs_by_category
CREATE OR REPLACE FUNCTION public.get_tender_costs_by_category(p_tender_id uuid)
 RETURNS TABLE(detail_category_id uuid, category_name text, detail_name text, location_display text, full_path text, unit text, materials_sum numeric, works_sum numeric, total_sum numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        dcc.id as detail_category_id,
        cc.name as category_name,
        dcc.name as detail_name,
        COALESCE(
            NULLIF(CONCAT_WS(', ', l.city, l.region, l.country), ''),
            l.title,
            'Не указано'
        ) as location_display,
        CONCAT(
            cc.name, '-', dcc.name,
            CASE 
                WHEN l.city IS NOT NULL OR l.region IS NOT NULL OR l.country IS NOT NULL OR l.title IS NOT NULL 
                THEN CONCAT('-', COALESCE(NULLIF(CONCAT_WS(', ', l.city, l.region, l.country), ''), l.title))
                ELSE ''
            END
        ) as full_path,
        dcc.unit,
        COALESCE(SUM(CASE WHEN bi.item_type = 'material' THEN bi.quantity * bi.unit_rate ELSE 0 END), 0) as materials_sum,
        COALESCE(SUM(CASE WHEN bi.item_type = 'work' THEN bi.quantity * bi.unit_rate ELSE 0 END), 0) as works_sum,
        COALESCE(SUM(bi.quantity * bi.unit_rate), 0) as total_sum
    FROM detail_cost_categories dcc
    INNER JOIN cost_categories cc ON cc.id = dcc.cost_category_id
    LEFT JOIN location l ON l.id = dcc.location_id
    LEFT JOIN boq_items bi ON bi.detail_cost_category_id = dcc.id AND bi.tender_id = p_tender_id
    GROUP BY 
        dcc.id,
        cc.name,
        dcc.name,
        l.city,
        l.region,
        l.country,
        l.title,
        dcc.unit
    ORDER BY 
        cc.name,
        dcc.name,
        location_display;
END;
$function$

-- Function: public.get_tender_costs_by_type
CREATE OR REPLACE FUNCTION public.get_tender_costs_by_type(tender_id uuid)
 RETURNS TABLE(item_type boq_item_type, total_amount numeric, item_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    bi.item_type,
    COALESCE(SUM(bi.total_amount), 0) as total_amount,
    COUNT(*) as item_count
  FROM boq_items bi
  WHERE bi.tender_id = $1
  GROUP BY bi.item_type
  ORDER BY bi.item_type;
END;
$function$

-- Function: public.get_works_using_material
CREATE OR REPLACE FUNCTION public.get_works_using_material(p_material_boq_item_id uuid)
 RETURNS TABLE(link_id uuid, work_id uuid, work_description text, work_unit text, work_quantity numeric, work_unit_rate numeric, total_material_usage numeric)
 LANGUAGE plpgsql
AS $function$
  BEGIN
      RETURN QUERY
      SELECT
          wml.id AS link_id,
          w.id AS work_id,
          w.description AS work_description,
          w.unit AS work_unit,
          w.quantity AS work_quantity,
          w.unit_rate AS work_unit_rate,
          (w.quantity * COALESCE(m.consumption_coefficient, 1) *
  COALESCE(m.conversion_coefficient, 1)) AS total_material_usage
      FROM work_material_links wml
      JOIN boq_items w ON wml.work_boq_item_id = w.id
      JOIN boq_items m ON wml.material_boq_item_id = m.id
      WHERE wml.material_boq_item_id = p_material_boq_item_id;
  END;
  $function$

-- Function: public.gin_extract_query_trgm
CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$

-- Function: public.gin_extract_value_trgm
CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$

-- Function: public.gin_trgm_consistent
CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$

-- Function: public.gin_trgm_triconsistent
CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$

-- Function: public.gtrgm_compress
CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$

-- Function: public.gtrgm_consistent
CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$

-- Function: public.gtrgm_decompress
CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$

-- Function: public.gtrgm_distance
CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$

-- Function: public.gtrgm_in
CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$

-- Function: public.gtrgm_options
CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$

-- Function: public.gtrgm_out
CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$

-- Function: public.gtrgm_penalty
CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$

-- Function: public.gtrgm_picksplit
CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$

-- Function: public.gtrgm_same
CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$

-- Function: public.gtrgm_union
CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$

-- Function: public.handle_updated_at_tender_markup_percentages
CREATE OR REPLACE FUNCTION public.handle_updated_at_tender_markup_percentages()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$

-- Function: public.hash_ltree
CREATE OR REPLACE FUNCTION public.hash_ltree(ltree)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$hash_ltree$function$

-- Function: public.hash_ltree_extended
CREATE OR REPLACE FUNCTION public.hash_ltree_extended(ltree, bigint)
 RETURNS bigint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$hash_ltree_extended$function$

-- Function: public.import_cost_category_row
CREATE OR REPLACE FUNCTION public.import_cost_category_row(p_category_name text, p_category_unit text, p_detail_name text, p_detail_unit text, p_location_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_category_id uuid;
    v_detail_id uuid;
    v_location_id uuid;
    v_mapping_id uuid;
    v_result jsonb;
BEGIN
    -- Создаем или получаем категорию
    v_category_id := public.upsert_cost_category(
        p_category_name, 
        CASE WHEN p_category_unit IS NOT NULL 
             THEN 'Единица измерения: ' || p_category_unit 
             ELSE NULL 
        END
    );
    
    -- Создаем или получаем детальную категорию
    v_detail_id := public.upsert_detail_cost_category(
        v_category_id,
        p_detail_name,
        p_detail_unit
    );
    
    -- Создаем или получаем локацию
    v_location_id := public.upsert_location(p_location_name);
    
    -- Создаем связь
    v_mapping_id := public.upsert_category_location_mapping(
        v_detail_id,
        v_location_id
    );
    
    -- Формируем результат
    v_result := jsonb_build_object(
        'success', true,
        'category_id', v_category_id,
        'detail_category_id', v_detail_id,
        'location_id', v_location_id,
        'mapping_id', v_mapping_id
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$

-- Function: public.import_costs_row
CREATE OR REPLACE FUNCTION public.import_costs_row(p_cat_order integer DEFAULT NULL::integer, p_cat_name text DEFAULT NULL::text, p_cat_unit text DEFAULT NULL::text, p_det_name text DEFAULT NULL::text, p_det_unit text DEFAULT NULL::text, p_loc_name text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_cat_id uuid;
    v_det_id uuid;
    v_unit_id uuid;
    v_det_unit_id uuid;
    v_loc_id uuid;
    v_result json;
BEGIN
    -- If both category and detail names are null, skip
    IF p_cat_name IS NULL AND p_det_name IS NULL THEN
        RETURN json_build_object('status', 'skipped', 'reason', 'empty row');
    END IF;
    
    -- If detail exists but category doesn't, error
    IF p_det_name IS NOT NULL AND p_cat_name IS NULL THEN
        RAISE EXCEPTION 'Detail without category: %', p_det_name;
    END IF;
    
    -- Process category
    IF p_cat_name IS NOT NULL THEN
        -- Find or create unit for category
        IF p_cat_unit IS NOT NULL THEN
            SELECT id INTO v_unit_id
            FROM units
            WHERE title = p_cat_unit
            LIMIT 1;
            
            IF v_unit_id IS NULL THEN
                INSERT INTO units (title, code)
                VALUES (p_cat_unit, SUBSTRING(p_cat_unit, 1, 10))
                RETURNING id INTO v_unit_id;
            END IF;
        END IF;
        
        -- Find existing category
        SELECT id INTO v_cat_id
        FROM cost_nodes
        WHERE name = p_cat_name
          AND parent_id IS NULL
          AND kind = 'group'
        LIMIT 1;
        
        -- Create category if doesn't exist
        IF v_cat_id IS NULL THEN
            INSERT INTO cost_nodes (
                parent_id,
                kind,
                name,
                unit_id,
                sort_order
            ) VALUES (
                NULL,
                'group',
                p_cat_name,
                v_unit_id,
                COALESCE(p_cat_order, 100)
            )
            RETURNING id INTO v_cat_id;
        END IF;
    END IF;
    
    -- Process detail
    IF p_det_name IS NOT NULL AND v_cat_id IS NOT NULL THEN
        -- Find or create unit for detail
        IF p_det_unit IS NOT NULL THEN
            SELECT id INTO v_det_unit_id
            FROM units
            WHERE title = p_det_unit
            LIMIT 1;
            
            IF v_det_unit_id IS NULL THEN
                INSERT INTO units (title, code)
                VALUES (p_det_unit, SUBSTRING(p_det_unit, 1, 10))
                RETURNING id INTO v_det_unit_id;
            END IF;
        END IF;
        
        -- Find location (don't create new ones) - ИСПРАВЛЕНО: location вместо locations
        IF p_loc_name IS NOT NULL THEN
            SELECT id INTO v_loc_id
            FROM location  -- Исправлено с locations на location
            WHERE title = p_loc_name
            LIMIT 1;
        END IF;
        
        -- Always create new detail (allowing duplicates)
        INSERT INTO cost_nodes (
            parent_id,
            kind,
            name,
            unit_id,
            location_id,
            sort_order
        ) VALUES (
            v_cat_id,
            'item',
            p_det_name,
            v_det_unit_id,
            v_loc_id,
            100
        )
        RETURNING id INTO v_det_id;
    END IF;
    
    -- Return result
    v_result := json_build_object(
        'status', 'success',
        'category_id', v_cat_id,
        'detail_id', v_det_id,
        'location_found', v_loc_id IS NOT NULL
    );
    
    RETURN v_result;
END;
$function$

-- Function: public.index
CREATE OR REPLACE FUNCTION public.index(ltree, ltree)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_index$function$

-- Function: public.index
CREATE OR REPLACE FUNCTION public.index(ltree, ltree, integer)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_index$function$

-- Function: public.initialize_commercial_costs_for_all_tenders
CREATE OR REPLACE FUNCTION public.initialize_commercial_costs_for_all_tenders()
 RETURNS TABLE(tender_id uuid, tender_title text, categories_count integer)
 LANGUAGE plpgsql
AS $function$
  BEGIN
      RETURN QUERY
      WITH tender_updates AS (
          SELECT DISTINCT t.id, t.title
          FROM tenders t
          JOIN boq_items bi ON bi.tender_id = t.id
          WHERE bi.detail_cost_category_id IS NOT NULL
      )
      SELECT
          tu.id,
          tu.title,
          (SELECT COUNT(DISTINCT detail_cost_category_id)
           FROM boq_items
           WHERE tender_id = tu.id)::INT as categories_count
      FROM tender_updates tu;

      -- Пересчитываем для каждого тендера
      PERFORM recalculate_commercial_costs_by_category(t.id)
      FROM (SELECT DISTINCT tender_id FROM boq_items WHERE detail_cost_category_id IS NOT NULL) t;

  END;
  $function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree, ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$

-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree[])
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_lca$function$

-- Function: public.lquery_in
CREATE OR REPLACE FUNCTION public.lquery_in(cstring)
 RETURNS lquery
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lquery_in$function$

-- Function: public.lquery_out
CREATE OR REPLACE FUNCTION public.lquery_out(lquery)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lquery_out$function$

-- Function: public.lquery_recv
CREATE OR REPLACE FUNCTION public.lquery_recv(internal)
 RETURNS lquery
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lquery_recv$function$

-- Function: public.lquery_send
CREATE OR REPLACE FUNCTION public.lquery_send(lquery)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lquery_send$function$

-- Function: public.lt_q_regex
CREATE OR REPLACE FUNCTION public.lt_q_regex(ltree, lquery[])
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lt_q_regex$function$

-- Function: public.lt_q_rregex
CREATE OR REPLACE FUNCTION public.lt_q_rregex(lquery[], ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lt_q_rregex$function$

-- Function: public.ltq_regex
CREATE OR REPLACE FUNCTION public.ltq_regex(ltree, lquery)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltq_regex$function$

-- Function: public.ltq_rregex
CREATE OR REPLACE FUNCTION public.ltq_rregex(lquery, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltq_rregex$function$

-- Function: public.ltree2text
CREATE OR REPLACE FUNCTION public.ltree2text(ltree)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree2text$function$

-- Function: public.ltree_addltree
CREATE OR REPLACE FUNCTION public.ltree_addltree(ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_addltree$function$

-- Function: public.ltree_addtext
CREATE OR REPLACE FUNCTION public.ltree_addtext(ltree, text)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_addtext$function$

-- Function: public.ltree_cmp
CREATE OR REPLACE FUNCTION public.ltree_cmp(ltree, ltree)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_cmp$function$

-- Function: public.ltree_compress
CREATE OR REPLACE FUNCTION public.ltree_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_compress$function$

-- Function: public.ltree_consistent
CREATE OR REPLACE FUNCTION public.ltree_consistent(internal, ltree, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_consistent$function$

-- Function: public.ltree_decompress
CREATE OR REPLACE FUNCTION public.ltree_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_decompress$function$

-- Function: public.ltree_eq
CREATE OR REPLACE FUNCTION public.ltree_eq(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_eq$function$

-- Function: public.ltree_ge
CREATE OR REPLACE FUNCTION public.ltree_ge(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_ge$function$

-- Function: public.ltree_gist_in
CREATE OR REPLACE FUNCTION public.ltree_gist_in(cstring)
 RETURNS ltree_gist
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_gist_in$function$

-- Function: public.ltree_gist_options
CREATE OR REPLACE FUNCTION public.ltree_gist_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/ltree', $function$ltree_gist_options$function$

-- Function: public.ltree_gist_out
CREATE OR REPLACE FUNCTION public.ltree_gist_out(ltree_gist)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_gist_out$function$

-- Function: public.ltree_gt
CREATE OR REPLACE FUNCTION public.ltree_gt(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_gt$function$

-- Function: public.ltree_in
CREATE OR REPLACE FUNCTION public.ltree_in(cstring)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_in$function$

-- Function: public.ltree_isparent
CREATE OR REPLACE FUNCTION public.ltree_isparent(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_isparent$function$

-- Function: public.ltree_le
CREATE OR REPLACE FUNCTION public.ltree_le(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_le$function$

-- Function: public.ltree_lt
CREATE OR REPLACE FUNCTION public.ltree_lt(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_lt$function$

-- Function: public.ltree_ne
CREATE OR REPLACE FUNCTION public.ltree_ne(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_ne$function$

-- Function: public.ltree_out
CREATE OR REPLACE FUNCTION public.ltree_out(ltree)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_out$function$

-- Function: public.ltree_penalty
CREATE OR REPLACE FUNCTION public.ltree_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_penalty$function$

-- Function: public.ltree_picksplit
CREATE OR REPLACE FUNCTION public.ltree_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_picksplit$function$

-- Function: public.ltree_recv
CREATE OR REPLACE FUNCTION public.ltree_recv(internal)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_recv$function$

-- Function: public.ltree_risparent
CREATE OR REPLACE FUNCTION public.ltree_risparent(ltree, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_risparent$function$

-- Function: public.ltree_same
CREATE OR REPLACE FUNCTION public.ltree_same(ltree_gist, ltree_gist, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_same$function$

-- Function: public.ltree_send
CREATE OR REPLACE FUNCTION public.ltree_send(ltree)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_send$function$

-- Function: public.ltree_textadd
CREATE OR REPLACE FUNCTION public.ltree_textadd(text, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_textadd$function$

-- Function: public.ltree_union
CREATE OR REPLACE FUNCTION public.ltree_union(internal, internal)
 RETURNS ltree_gist
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_union$function$

-- Function: public.ltreeparentsel
CREATE OR REPLACE FUNCTION public.ltreeparentsel(internal, oid, internal, integer)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltreeparentsel$function$

-- Function: public.ltxtq_exec
CREATE OR REPLACE FUNCTION public.ltxtq_exec(ltree, ltxtquery)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltxtq_exec$function$

-- Function: public.ltxtq_in
CREATE OR REPLACE FUNCTION public.ltxtq_in(cstring)
 RETURNS ltxtquery
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltxtq_in$function$

-- Function: public.ltxtq_out
CREATE OR REPLACE FUNCTION public.ltxtq_out(ltxtquery)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltxtq_out$function$

-- Function: public.ltxtq_recv
CREATE OR REPLACE FUNCTION public.ltxtq_recv(internal)
 RETURNS ltxtquery
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltxtq_recv$function$

-- Function: public.ltxtq_rexec
CREATE OR REPLACE FUNCTION public.ltxtq_rexec(ltxtquery, ltree)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltxtq_rexec$function$

-- Function: public.ltxtq_send
CREATE OR REPLACE FUNCTION public.ltxtq_send(ltxtquery)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltxtq_send$function$

-- Function: public.nlevel
CREATE OR REPLACE FUNCTION public.nlevel(ltree)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$nlevel$function$

-- Function: public.rebuild_boq_mappings
CREATE OR REPLACE FUNCTION public.rebuild_boq_mappings(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_old_boq RECORD;
    v_new_boq RECORD;
    v_mapped INTEGER := 0;
BEGIN
    -- Очищаем старые маппинги
    DELETE FROM boq_item_version_mappings
    WHERE new_tender_id = p_new_tender_id;

    -- Создаем маппинги на основе позиций и item_number
    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
    LOOP
        FOR v_old_boq IN
            SELECT * FROM boq_items
            WHERE client_position_id = v_mapping.old_position_id
        LOOP
            -- Ищем соответствующий новый BOQ по item_number
            SELECT * INTO v_new_boq
            FROM boq_items
            WHERE client_position_id = v_mapping.new_position_id
            AND item_number = v_old_boq.item_number
            AND COALESCE(sub_number, '') = COALESCE(v_old_boq.sub_number, '')
            LIMIT 1;

            IF FOUND THEN
                PERFORM save_boq_mapping(
                    v_old_boq.id,
                    v_new_boq.id,
                    p_old_tender_id,
                    p_new_tender_id,
                    v_mapping.id,
                    'rebuild'
                );
                v_mapped := v_mapped + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'mappings_created', v_mapped
    );
END;
$function$

-- Function: public.recalculate_client_position_totals
CREATE OR REPLACE FUNCTION public.recalculate_client_position_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
      position_id UUID;
      materials_total DECIMAL(15,2);
      works_total DECIMAL(15,2);
      commercial_materials_total DECIMAL(15,2);
      commercial_works_total DECIMAL(15,2);
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

      -- Recalculate material costs (including sub_material) - базовые
      SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('material', 'sub_material');

      -- Recalculate work costs (including sub_work) - базовые
      SELECT COALESCE(SUM(total_amount), 0) INTO works_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('work', 'sub_work');

      -- Recalculate commercial material costs (коммерческие)
      SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_materials_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('material', 'sub_material');

      -- Recalculate commercial work costs (коммерческие)
      SELECT COALESCE(SUM(quantity * commercial_cost), 0) INTO commercial_works_total
      FROM public.boq_items
      WHERE client_position_id = position_id
      AND item_type IN ('work', 'sub_work');

      -- Update client position totals (базовые и коммерческие)
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
  $function$

-- Function: public.recalculate_commercial_costs_by_category
CREATE OR REPLACE FUNCTION public.recalculate_commercial_costs_by_category(p_tender_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Удаляем старые записи для этого тендера
    DELETE FROM commercial_costs_by_category WHERE tender_id = p_tender_id;

    -- Вставляем новые данные БЕЗ markup_coefficient колонок (они GENERATED)
    INSERT INTO commercial_costs_by_category (
        tender_id,
        detail_cost_category_id,
        direct_materials,
        direct_works,
        direct_submaterials,
        direct_subworks,
        commercial_materials,
        commercial_works,
        commercial_submaterials,
        commercial_subworks
    )
    SELECT
        p_tender_id,
        detail_cost_category_id,
        -- Прямые затраты (total_amount из BOQ)
        SUM(CASE WHEN item_type = 'material' THEN total_amount ELSE 0 END) as direct_materials,
        SUM(CASE WHEN item_type = 'work' THEN total_amount ELSE 0 END) as direct_works,
        SUM(CASE WHEN item_type = 'sub_material' THEN total_amount ELSE 0 END) as direct_submaterials,
        SUM(CASE WHEN item_type = 'sub_work' THEN total_amount ELSE 0 END) as direct_subworks,

        -- Коммерческие затраты (commercial_cost из BOQ)
        SUM(CASE WHEN item_type = 'material' THEN COALESCE(commercial_cost, 0) ELSE 0 END) as commercial_materials,
        SUM(CASE WHEN item_type = 'work' THEN COALESCE(commercial_cost, 0) ELSE 0 END) as commercial_works,
        SUM(CASE WHEN item_type = 'sub_material' THEN COALESCE(commercial_cost, 0) ELSE 0 END) as commercial_submaterials,
        SUM(CASE WHEN item_type = 'sub_work' THEN COALESCE(commercial_cost, 0) ELSE 0 END) as commercial_subworks

    FROM boq_items
    WHERE tender_id = p_tender_id
        AND detail_cost_category_id IS NOT NULL
    GROUP BY detail_cost_category_id;

    -- Обновляем вычисляемые поля (если они не GENERATED)
    UPDATE commercial_costs_by_category
    SET
        direct_total = direct_materials + direct_works + direct_submaterials + direct_subworks,
        commercial_total = commercial_materials + commercial_works + commercial_submaterials + commercial_subworks,
        last_calculation_date = NOW()
    WHERE tender_id = p_tender_id;

END;
$function$

-- Function: public.renumber_client_positions
CREATE OR REPLACE FUNCTION public.renumber_client_positions(p_tender_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_position RECORD;
  v_new_number INTEGER := 1;
BEGIN
  -- Lock all positions for this tender
  PERFORM 1 FROM public.client_positions 
  WHERE tender_id = p_tender_id 
  FOR UPDATE;
  
  -- Renumber positions sequentially based on current order
  FOR v_position IN 
    SELECT id 
    FROM public.client_positions 
    WHERE tender_id = p_tender_id 
    ORDER BY position_number, created_at
  LOOP
    UPDATE public.client_positions 
    SET position_number = v_new_number 
    WHERE id = v_position.id;
    
    v_new_number := v_new_number + 1;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$function$

-- Function: public.rpc_move_material
CREATE OR REPLACE FUNCTION public.rpc_move_material(p_source_work uuid, p_target_work uuid, p_material uuid, p_new_index integer DEFAULT 0, p_mode text DEFAULT 'move'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_src_link_id UUID;
  v_tgt_link_id UUID;
  v_work_volume NUMERIC;
  v_src_record RECORD;
  v_conflict BOOLEAN := FALSE;
  v_result JSONB;
  v_client_position_id UUID;
BEGIN
  -- Start transaction
  BEGIN
    -- Get client_position_id from source work
    SELECT client_position_id INTO v_client_position_id
    FROM boq_items
    WHERE id = p_source_work;
    
    -- Lock source link for update
    SELECT wml.*, w.quantity as work_volume
    INTO v_src_record
    FROM work_material_links wml
    JOIN boq_items w ON w.id = p_target_work
    WHERE wml.work_boq_item_id = p_source_work 
      AND wml.material_boq_item_id = p_material
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Source link not found');
    END IF;
    
    v_src_link_id := v_src_record.id;
    v_work_volume := COALESCE(v_src_record.work_volume, 0);
    
    -- Check for conflict in target work
    SELECT id INTO v_tgt_link_id
    FROM work_material_links
    WHERE work_boq_item_id = p_target_work 
      AND material_boq_item_id = p_material
    FOR UPDATE;
    
    IF FOUND THEN
      v_conflict := TRUE;
    END IF;
    
    IF p_mode = 'move' THEN
      IF NOT v_conflict THEN
        -- Update work_id and recalculate
        UPDATE work_material_links
        SET 
          work_boq_item_id = p_target_work,
          updated_at = NOW()
        WHERE id = v_src_link_id;
        
        -- Note: Actual volume recalculation happens via the linked materials
        -- since we store coefficients on the material BOQ items
        
        RETURN jsonb_build_object(
          'ok', true, 
          'conflict', false,
          'link_id', v_src_link_id
        );
      ELSE
        -- Return conflict information
        RETURN jsonb_build_object(
          'ok', false,
          'conflict', true,
          'src_id', v_src_link_id,
          'tgt_id', v_tgt_link_id,
          'material_id', p_material
        );
      END IF;
      
    ELSIF p_mode = 'copy' THEN
      IF NOT v_conflict THEN
        -- Create new link
        INSERT INTO work_material_links (
          client_position_id,
          work_boq_item_id,
          material_boq_item_id,
          usage_coefficient,
          material_quantity_per_work,
          notes
        )
        VALUES (
          v_client_position_id,
          p_target_work,
          p_material,
          v_src_record.usage_coefficient,
          v_src_record.material_quantity_per_work,
          v_src_record.notes
        )
        RETURNING id INTO v_tgt_link_id;
        
        RETURN jsonb_build_object(
          'ok', true,
          'conflict', false,
          'link_id', v_tgt_link_id
        );
      ELSE
        -- Return conflict information
        RETURN jsonb_build_object(
          'ok', false,
          'conflict', true,
          'src_id', v_src_link_id,
          'tgt_id', v_tgt_link_id,
          'material_id', p_material
        );
      END IF;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Invalid mode');
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM
      );
  END;
END;
$function$

-- Function: public.rpc_resolve_conflict
CREATE OR REPLACE FUNCTION public.rpc_resolve_conflict(p_src_id uuid, p_tgt_id uuid, p_target_work uuid, p_strategy text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_work_volume NUMERIC;
  v_src_record RECORD;
  v_tgt_record RECORD;
  v_material_item RECORD;
  v_src_volume_b NUMERIC;
  v_new_volume NUMERIC;
  v_new_total NUMERIC;
BEGIN
  BEGIN
    -- Lock both links for update
    SELECT * INTO v_src_record
    FROM work_material_links
    WHERE id = p_src_id
    FOR UPDATE;
    
    SELECT * INTO v_tgt_record
    FROM work_material_links
    WHERE id = p_tgt_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Links not found');
    END IF;
    
    -- Get work volume for target work
    SELECT quantity INTO v_work_volume
    FROM boq_items
    WHERE id = p_target_work;
    
    v_work_volume := COALESCE(v_work_volume, 0);
    
    -- Get material coefficients
    SELECT 
      consumption_coefficient,
      conversion_coefficient,
      unit_rate
    INTO v_material_item
    FROM boq_items
    WHERE id = v_src_record.material_boq_item_id;
    
    -- Calculate source volume for target work
    v_src_volume_b := v_work_volume * 
                      COALESCE(v_material_item.consumption_coefficient, 1) * 
                      COALESCE(v_material_item.conversion_coefficient, 1) *
                      COALESCE(v_src_record.usage_coefficient, 1);
    
    IF p_strategy = 'sum' THEN
      -- Sum strategy: add volumes
      -- Get target material volume (already calculated for target work)
      SELECT 
        consumption_coefficient,
        conversion_coefficient,
        unit_rate
      INTO v_material_item
      FROM boq_items
      WHERE id = v_tgt_record.material_boq_item_id;
      
      v_new_volume := (v_work_volume * 
                       COALESCE(v_material_item.consumption_coefficient, 1) * 
                       COALESCE(v_material_item.conversion_coefficient, 1) *
                       COALESCE(v_tgt_record.usage_coefficient, 1)) + v_src_volume_b;
      
      -- Note: We don't directly update material volumes here since they're calculated
      -- from the work volume and coefficients. Instead we'd update usage_coefficient
      -- to achieve the desired total volume
      
      -- Update target link's usage coefficient to achieve the summed volume
      UPDATE work_material_links
      SET 
        usage_coefficient = CASE 
          WHEN v_work_volume > 0 AND 
               COALESCE(v_material_item.consumption_coefficient, 1) > 0 AND
               COALESCE(v_material_item.conversion_coefficient, 1) > 0
          THEN v_new_volume / (v_work_volume * 
                              COALESCE(v_material_item.consumption_coefficient, 1) * 
                              COALESCE(v_material_item.conversion_coefficient, 1))
          ELSE 1
        END,
        updated_at = NOW()
      WHERE id = p_tgt_id;
      
    ELSIF p_strategy = 'replace' THEN
      -- Replace strategy: use source coefficients
      UPDATE work_material_links
      SET 
        usage_coefficient = v_src_record.usage_coefficient,
        material_quantity_per_work = v_src_record.material_quantity_per_work,
        notes = v_src_record.notes,
        updated_at = NOW()
      WHERE id = p_tgt_id;
      
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Invalid strategy');
    END IF;
    
    -- Delete source link
    DELETE FROM work_material_links WHERE id = p_src_id;
    
    RETURN jsonb_build_object(
      'ok', true,
      'link_id', p_tgt_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM
      );
  END;
END;
$function$

-- Function: public.rpc_transfer_boq
CREATE OR REPLACE FUNCTION public.rpc_transfer_boq(mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN transfer_mapping_data(mapping_id);
END;
$function$

-- Function: public.rpc_transfer_dop
CREATE OR REPLACE FUNCTION public.rpc_transfer_dop(new_tender_id uuid, old_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN transfer_dop_positions_fixed(new_tender_id, old_tender_id);
END;
$function$

-- Function: public.safe_upsert_cost_category
CREATE OR REPLACE FUNCTION public.safe_upsert_cost_category(p_name text, p_description text DEFAULT NULL::text, p_sort_order integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
  DECLARE
      v_category_id uuid;
      v_code text;
  BEGIN
      SELECT id INTO v_category_id
      FROM public.cost_categories
      WHERE name = p_name
      LIMIT 1;

      IF v_category_id IS NOT NULL THEN
          UPDATE public.cost_categories
          SET description = p_description,
              sort_order = p_sort_order,
              updated_at = now()
          WHERE id = v_category_id;
          RETURN v_category_id;
      ELSE
          v_code := 'CAT-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 0, 9);
          INSERT INTO public.cost_categories (name, code, description, sort_order)
          VALUES (p_name, v_code, p_description, p_sort_order)
          RETURNING id INTO v_category_id;
          RETURN v_category_id;
      END IF;
  END;
  $function$

-- Function: public.safe_upsert_location
CREATE OR REPLACE FUNCTION public.safe_upsert_location(p_name text, p_sort_order integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
  DECLARE
      v_location_id uuid;
      v_code text;
  BEGIN
      SELECT id INTO v_location_id
      FROM public.location
      WHERE name = p_name
      LIMIT 1;

      IF v_location_id IS NOT NULL THEN
          UPDATE public.location
          SET sort_order = p_sort_order,
              updated_at = now()
          WHERE id = v_location_id;
          RETURN v_location_id;
      ELSE
          v_code := 'LOC-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 0, 9);
          INSERT INTO public.location (name, code, sort_order, level, is_active)
          VALUES (p_name, v_code, p_sort_order, 0, true)
          RETURNING id INTO v_location_id;
          RETURN v_location_id;
      END IF;
  END;
  $function$

-- Function: public.safe_upsert_mapping
CREATE OR REPLACE FUNCTION public.safe_upsert_mapping(p_detail_category_id uuid, p_location_id uuid, p_quantity numeric DEFAULT 1, p_unit_price numeric DEFAULT 0, p_discount_percent numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping_id UUID;
BEGIN
    -- Проверяем существование детальной категории
    IF NOT EXISTS (
        SELECT 1 FROM public.detail_cost_categories 
        WHERE id = p_detail_category_id
    ) THEN
        RAISE EXCEPTION 'Detail category with id % does not exist', p_detail_category_id;
    END IF;
    
    -- Проверяем существование локации
    IF NOT EXISTS (
        SELECT 1 FROM public.location 
        WHERE id = p_location_id
    ) THEN
        RAISE EXCEPTION 'Location with id % does not exist', p_location_id;
    END IF;
    
    -- Выполняем UPSERT
    INSERT INTO public.category_location_mapping (
        detail_category_id,
        location_id,
        quantity,
        unit_price,
        discount_percent,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_detail_category_id,
        p_location_id,
        p_quantity,
        p_unit_price,
        p_discount_percent,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (detail_category_id, location_id) 
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        discount_percent = EXCLUDED.discount_percent,
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO v_mapping_id;
    
    RETURN v_mapping_id;
END;
$function$

-- Function: public.save_boq_mapping
CREATE OR REPLACE FUNCTION public.save_boq_mapping(p_old_boq_id uuid, p_new_boq_id uuid, p_old_tender_id uuid, p_new_tender_id uuid, p_position_mapping_id uuid DEFAULT NULL::uuid, p_mapping_type text DEFAULT 'auto'::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping_id UUID;
    v_item_info RECORD;
BEGIN
    -- Получаем информацию о BOQ item
    SELECT item_number, description, item_type
    INTO v_item_info
    FROM boq_items
    WHERE id = p_old_boq_id;

    -- Вставляем или обновляем маппинг
    INSERT INTO boq_item_version_mappings (
        old_boq_item_id,
        new_boq_item_id,
        old_tender_id,
        new_tender_id,
        position_mapping_id,
        mapping_type,
        item_number,
        description,
        item_type
    )
    VALUES (
        p_old_boq_id,
        p_new_boq_id,
        p_old_tender_id,
        p_new_tender_id,
        p_position_mapping_id,
        p_mapping_type,
        v_item_info.item_number,
        v_item_info.description,
        v_item_info.item_type
    )
    ON CONFLICT (old_boq_item_id, new_tender_id)
    DO UPDATE SET
        new_boq_item_id = EXCLUDED.new_boq_item_id,
        mapping_type = EXCLUDED.mapping_type,
        position_mapping_id = EXCLUDED.position_mapping_id
    RETURNING id INTO v_mapping_id;

    RETURN v_mapping_id;
END;
$function$

-- Function: public.schema_cache_purge
CREATE OR REPLACE FUNCTION public.schema_cache_purge()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  notify pgrst, 'reload schema';
$function$

-- Function: public.search_cost_nodes
CREATE OR REPLACE FUNCTION public.search_cost_nodes(p_search_term text, p_limit integer DEFAULT 50)
 RETURNS TABLE(cost_node_id uuid, display_name text, category_name text, detail_name text, location_name text, category_id uuid, detail_id uuid, location_id uuid)
 LANGUAGE plpgsql
 STABLE
AS $function$
  BEGIN
      -- Нормализуем поисковый запрос
      p_search_term := LOWER(TRIM(p_search_term));

      -- Если поисковый запрос пустой, возвращаем пустой результат
      IF p_search_term = '' OR p_search_term IS NULL THEN
          RETURN;
      END IF;

      RETURN QUERY
      WITH search_results AS (
          SELECT DISTINCT
              -- Используем detail_id как fallback если cost_node не найден
              COALESCE(cn.id, dcc.id) as node_id,
              cc.name as cat_name,
              dcc.name as det_name,
              COALESCE(
                  NULLIF(l.country, ''),
                  NULLIF(l.city, ''),
                  NULLIF(l.title, ''),
                  NULLIF(l.code, ''),
                  'Локация ' || SUBSTRING(l.id::text FROM 1 FOR 8)
              ) as loc_name,
              cc.id as cat_id,
              dcc.id as det_id,
              l.id as loc_id,
              -- Рассчитываем релевантность для сортировки
              CASE
                  -- Точное совпадение в детализации
                  WHEN LOWER(dcc.name) = p_search_term THEN 1
                  -- Начинается с поискового запроса в детализации
                  WHEN LOWER(dcc.name) LIKE p_search_term || '%' THEN 2
                  -- Точное совпадение в категории
                  WHEN LOWER(cc.name) = p_search_term THEN 3
                  -- Начинается с поискового запроса в категории
                  WHEN LOWER(cc.name) LIKE p_search_term || '%' THEN 4
                  -- Содержит в детализации
                  WHEN LOWER(dcc.name) LIKE '%' || p_search_term || '%' THEN 5
                  -- Содержит в категории
                  WHEN LOWER(cc.name) LIKE '%' || p_search_term || '%' THEN 6
                  -- Содержит в локации
                  WHEN LOWER(COALESCE(l.country, l.city, l.title, l.code, '')) LIKE '%' || p_search_term || '%' THEN      
  7
                  ELSE 8
              END as relevance
          FROM
              public.detail_cost_categories dcc
          INNER JOIN
              public.cost_categories cc ON cc.id = dcc.cost_category_id
          LEFT JOIN
              public.location l ON l.id = dcc.location_id
          LEFT JOIN
              public.cost_nodes cn ON cn.parent_id = cc.id
                  AND cn.name = dcc.name || CASE
                      WHEN l.country IS NOT NULL THEN ' (' || l.country || ')'
                      WHEN l.city IS NOT NULL THEN ' (' || l.city || ')'
                      WHEN l.title IS NOT NULL THEN ' (' || l.title || ')'
                      ELSE ' (ID: ' || SUBSTRING(dcc.id::text FROM 1 FOR 8) || ')'
                  END
          WHERE
              -- Поиск по всем полям
              LOWER(cc.name) LIKE '%' || p_search_term || '%'
              OR LOWER(dcc.name) LIKE '%' || p_search_term || '%'
              OR LOWER(COALESCE(l.country, '')) LIKE '%' || p_search_term || '%'
              OR LOWER(COALESCE(l.city, '')) LIKE '%' || p_search_term || '%'
              OR LOWER(COALESCE(l.title, '')) LIKE '%' || p_search_term || '%'
              OR LOWER(COALESCE(l.code, '')) LIKE '%' || p_search_term || '%'
              -- Также ищем по коду категории если есть
              OR LOWER(COALESCE(cc.code, '')) LIKE '%' || p_search_term || '%'
      )
      SELECT
          node_id as cost_node_id,
          cat_name || ' → ' || det_name || ' → ' || loc_name as display_name,
          cat_name as category_name,
          det_name as detail_name,
          loc_name as location_name,
          cat_id as category_id,
          det_id as detail_id,
          loc_id as location_id
      FROM
          search_results
      ORDER BY
          relevance,
          cat_name,
          det_name,
          loc_name
      LIMIT p_limit;
  END;
  $function$

-- Function: public.set_limit
CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$

-- Function: public.show_limit
CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$

-- Function: public.show_trgm
CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$

-- Function: public.similarity
CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$

-- Function: public.similarity_dist
CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$

-- Function: public.similarity_op
CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$

-- Function: public.simple_transfer_all_data
CREATE OR REPLACE FUNCTION public.simple_transfer_all_data(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_total_boq INTEGER := 0;
    v_total_positions INTEGER := 0;
    v_dop_positions INTEGER := 0;
    v_result JSON;
    v_old_dop RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
BEGIN
    RAISE NOTICE 'Starting simple transfer from % to %', p_old_tender_id, p_new_tender_id;

    -- 1. Переносим BOQ items для всех замапленных позиций
    FOR v_mapping IN
        SELECT * FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
        AND old_position_id IS NOT NULL
        AND new_position_id IS NOT NULL
        AND mapping_status != 'rejected'
    LOOP
        v_result := transfer_single_mapping(v_mapping.id);

        IF (v_result->>'success')::boolean THEN
            v_total_boq := v_total_boq + COALESCE((v_result->>'boq_transferred')::integer, 0);
            v_total_positions := v_total_positions + 1;
        END IF;
    END LOOP;

    -- 2. Переносим ДОП позиции
    FOR v_old_dop IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
    LOOP
        -- Находим новый parent_id через маппинг
        IF v_old_dop.parent_position_id IS NOT NULL THEN
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_old_dop.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;

            -- Если нашли родителя, создаем ДОП позицию
            IF v_new_parent_id IS NOT NULL THEN
                INSERT INTO client_positions (
                    tender_id,
                    position_number,
                    work_name,
                    parent_position_id,
                    is_additional,
                    unit,
                    volume,
                    manual_volume,
                    client_note,
                    item_no,
                    manual_note,
                    position_type,
                    hierarchy_level,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_new_tender_id,
                    v_old_dop.position_number,
                    v_old_dop.work_name,
                    v_new_parent_id,
                    true,
                    v_old_dop.unit,
                    v_old_dop.volume,
                    v_old_dop.manual_volume,
                    v_old_dop.client_note,
                    v_old_dop.item_no,
                    v_old_dop.manual_note,
                    v_old_dop.position_type,
                    v_old_dop.hierarchy_level,
                    now(),
                    now()
                )
                RETURNING id INTO v_new_dop_id;

                IF v_new_dop_id IS NOT NULL THEN
                    v_dop_positions := v_dop_positions + 1;

                    -- Копируем BOQ items для ДОП позиции
                    INSERT INTO boq_items (
                        tender_id,
                        client_position_id,
                        item_number,
                        sub_number,
                        sort_order,
                        item_type,
                        description,
                        unit,
                        quantity,
                        unit_rate,
                        material_id,
                        work_id,
                        consumption_coefficient,
                        conversion_coefficient,
                        delivery_price_type,
                        delivery_amount,
                        base_quantity,
                        detail_cost_category_id,
                        total_amount,
                        created_at,
                        updated_at
                    )
                    SELECT
                        p_new_tender_id,
                        v_new_dop_id,
                        item_number,
                        sub_number,
                        sort_order,
                        item_type,
                        description,
                        unit,
                        quantity,
                        unit_rate,
                        material_id,
                        work_id,
                        consumption_coefficient,
                        conversion_coefficient,
                        delivery_price_type,
                        delivery_amount,
                        base_quantity,
                        detail_cost_category_id,
                        total_amount,
                        now(),
                        now()
                    FROM boq_items
                    WHERE client_position_id = v_old_dop.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'Transfer complete: % positions, % BOQ items, % DOP positions',
        v_total_positions, v_total_boq, v_dop_positions;

    RETURN json_build_object(
        'success', true,
        'positions_transferred', v_total_positions,
        'boq_items_transferred', v_total_boq,
        'dop_positions', v_dop_positions
    );
END;
$function$

-- Function: public.simple_transfer_boq
CREATE OR REPLACE FUNCTION public.simple_transfer_boq(p_old_position_id uuid, p_new_position_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INTEGER;
    v_transferred INTEGER;
BEGIN
    -- Считаем сколько есть
    SELECT COUNT(*) INTO v_count
    FROM boq_items
    WHERE client_position_id = p_old_position_id;

    -- Удаляем существующие в новой позиции
    DELETE FROM boq_items
    WHERE client_position_id = p_new_position_id;

    -- Переносим
    INSERT INTO boq_items (
        tender_id,
        client_position_id,
        item_number,
        sub_number,
        sort_order,
        item_type,
        description,
        unit,
        quantity,
        unit_rate,
        material_id,
        work_id,
        consumption_coefficient,
        conversion_coefficient,
        delivery_price_type,
        delivery_amount,
        base_quantity,
        detail_cost_category_id,
        total_amount,
        created_at,
        updated_at
    )
    SELECT
        p_new_tender_id,
        p_new_position_id,
        item_number,
        sub_number,
        sort_order,
        item_type,
        description,
        unit,
        quantity,
        unit_rate,
        material_id,
        work_id,
        consumption_coefficient,
        conversion_coefficient,
        delivery_price_type,
        delivery_amount,
        base_quantity,
        detail_cost_category_id,
        total_amount,
        now(),
        now()
    FROM boq_items
    WHERE client_position_id = p_old_position_id;

    GET DIAGNOSTICS v_transferred = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'found', v_count,
        'transferred', v_transferred
    );
END;
$function$

-- Function: public.strict_word_similarity
CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$

-- Function: public.strict_word_similarity_commutator_op
CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$

-- Function: public.strict_word_similarity_dist_commutator_op
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$

-- Function: public.strict_word_similarity_dist_op
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$

-- Function: public.strict_word_similarity_op
CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$

-- Function: public.subltree
CREATE OR REPLACE FUNCTION public.subltree(ltree, integer, integer)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$subltree$function$

-- Function: public.subpath
CREATE OR REPLACE FUNCTION public.subpath(ltree, integer, integer)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$subpath$function$

-- Function: public.subpath
CREATE OR REPLACE FUNCTION public.subpath(ltree, integer)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$subpath$function$

-- Function: public.tender_items_defaults
CREATE OR REPLACE FUNCTION public.tender_items_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.node_id is not null and (new.name_snapshot is null or length(new.name_snapshot)=0) then
    select n.name, n.unit_id, n.location_id
      into new.name_snapshot, new.unit_id, new.location_id
      from public.cost_nodes n
     where n.id = new.node_id;
  end if;
  return new;
end $function$

-- Function: public.tender_totals_tree
CREATE OR REPLACE FUNCTION public.tender_totals_tree(p_tender_id uuid)
 RETURNS TABLE(node_id uuid, node_name text, path ltree, kind text, total numeric)
 LANGUAGE sql
AS $function$
  select a.id, a.name, a.path, a.kind,
         coalesce(sum(ti.amount), 0) as total
    from public.cost_nodes a
    left join public.cost_nodes n
           on n.path <@ a.path
    left join public.tender_items ti
           on ti.node_id = n.id
          and ti.tender_id = p_tender_id
   group by a.id, a.name, a.path, a.kind
   order by a.path;
$function$

-- Function: public.test_cost_node_finder
CREATE OR REPLACE FUNCTION public.test_cost_node_finder()
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_cost_node_id UUID;
BEGIN
    -- Just return the first cost_node we can find
    SELECT id INTO v_cost_node_id
    FROM public.cost_nodes
    LIMIT 1;
    
    RETURN v_cost_node_id;
END;
$function$

-- Function: public.test_mapping_transfer
CREATE OR REPLACE FUNCTION public.test_mapping_transfer(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_old_boq INTEGER;
    v_old_links INTEGER;
    v_result JSON;
    v_new_boq INTEGER;
    v_new_links INTEGER;
BEGIN
    -- Получаем маппинг
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Mapping not found');
    END IF;

    -- Считаем данные ДО переноса
    SELECT COUNT(*) INTO v_old_boq
    FROM boq_items
    WHERE client_position_id = v_mapping.old_position_id;

    SELECT COUNT(*) INTO v_old_links
    FROM work_material_links
    WHERE client_position_id = v_mapping.old_position_id;

    -- Выполняем перенос
    v_result := transfer_mapping_data(p_mapping_id);

    -- Считаем данные ПОСЛЕ переноса
    SELECT COUNT(*) INTO v_new_boq
    FROM boq_items
    WHERE client_position_id = v_mapping.new_position_id;

    SELECT COUNT(*) INTO v_new_links
    FROM work_material_links
    WHERE client_position_id = v_mapping.new_position_id;

    RETURN json_build_object(
        'mapping_id', p_mapping_id,
        'before', json_build_object(
            'old_position_boq', v_old_boq,
            'old_position_links', v_old_links
        ),
        'transfer_result', v_result,
        'after', json_build_object(
            'new_position_boq', v_new_boq,
            'new_position_links', v_new_links
        )
    );
END;
$function$

-- Function: public.test_single_mapping_transfer
CREATE OR REPLACE FUNCTION public.test_single_mapping_transfer(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_before JSON;
    v_transfer_result JSON;
    v_after JSON;
BEGIN
    -- Снимок до переноса
    v_before := debug_transfer_mapping(p_mapping_id);

    -- Выполняем перенос
    v_transfer_result := transfer_boq_items_with_creation(p_mapping_id);

    -- Снимок после переноса
    v_after := debug_transfer_mapping(p_mapping_id);

    RETURN json_build_object(
        'before', v_before,
        'transfer_result', v_transfer_result,
        'after', v_after
    );
END;
$function$

-- Function: public.test_versioning_transfer
CREATE OR REPLACE FUNCTION public.test_versioning_transfer(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSON;
    v_stats JSON;
    v_position_count INTEGER := 0;
    v_dop_count INTEGER := 0;
    v_links_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🧪 Testing versioning transfer from % to %', p_old_tender_id, p_new_tender_id;

    -- Считаем позиции
    SELECT COUNT(*) INTO v_position_count
    FROM tender_version_mappings
    WHERE old_tender_id = p_old_tender_id
    AND new_tender_id = p_new_tender_id;

    -- Считаем ДОП позиции в старом тендере
    SELECT COUNT(*) INTO v_dop_count
    FROM client_positions
    WHERE tender_id = p_old_tender_id
    AND is_additional = true;

    -- Считаем work_material_links в старом тендере
    SELECT COUNT(*) INTO v_links_count
    FROM work_material_links wml
    INNER JOIN client_positions cp ON cp.id = wml.client_position_id
    WHERE cp.tender_id = p_old_tender_id;

    v_stats := json_build_object(
        'mappings_count', v_position_count,
        'old_dop_positions', v_dop_count,
        'old_work_material_links', v_links_count
    );

    RAISE NOTICE '📊 Stats: %', v_stats;

    -- Проверяем результаты в новом тендере
    SELECT COUNT(*) INTO v_dop_count
    FROM client_positions
    WHERE tender_id = p_new_tender_id
    AND is_additional = true;

    SELECT COUNT(*) INTO v_links_count
    FROM work_material_links wml
    INNER JOIN client_positions cp ON cp.id = wml.client_position_id
    WHERE cp.tender_id = p_new_tender_id;

    v_result := json_build_object(
        'before', v_stats,
        'after', json_build_object(
            'new_dop_positions', v_dop_count,
            'new_work_material_links', v_links_count
        )
    );

    RETURN v_result;
END;
$function$

-- Function: public.text2ltree
CREATE OR REPLACE FUNCTION public.text2ltree(text)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$text2ltree$function$

-- Function: public.transfer_all_tender_data
CREATE OR REPLACE FUNCTION public.transfer_all_tender_data(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_old_position RECORD;
    v_new_position RECORD;
    v_links_result JSON;
    v_dop_result JSON;
    v_positions_count INTEGER := 0;
    v_links_count INTEGER := 0;
    v_result JSON;
BEGIN
    RAISE NOTICE 'Starting comprehensive data transfer from tender % to %',
        p_old_tender_id, p_new_tender_id;

    -- Переносим work_material_links для всех обычных позиций
    FOR v_old_position IN
        SELECT old_pos.*
        FROM client_positions old_pos
        WHERE old_pos.tender_id = p_old_tender_id
        AND old_pos.is_additional = false
    LOOP
        SELECT * INTO v_new_position
        FROM client_positions
        WHERE tender_id = p_new_tender_id
        AND position_number = v_old_position.position_number
        AND is_additional = false
        LIMIT 1;

        IF v_new_position.id IS NOT NULL THEN
            v_links_result := transfer_work_material_links(
                v_old_position.id,
                v_new_position.id
            );

            IF (v_links_result->>'success')::boolean THEN
                v_links_count := v_links_count + (v_links_result->>'links_transferred')::integer;
                RAISE NOTICE 'Transferred % links for position %',
                    v_links_result->>'links_transferred', v_old_position.position_number;
            END IF;

            v_positions_count := v_positions_count + 1;
        END IF;
    END LOOP;

    -- Переносим ДОП позиции (с ПРАВИЛЬНЫМ порядком параметров!)
    v_dop_result := transfer_dop_positions(p_new_tender_id, p_old_tender_id);

    v_result := json_build_object(
        'success', true,
        'positions_processed', v_positions_count,
        'links_transferred', v_links_count,
        'dop_positions_transferred', (v_dop_result->>'dopCount')::integer,
        'message', format('Processed %s positions, transferred %s links and %s DOP positions',
            v_positions_count, v_links_count, v_dop_result->>'dopCount')
    );

    RAISE NOTICE 'Transfer complete: %', v_result;
    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in comprehensive transfer: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'positions_processed', v_positions_count,
            'links_transferred', v_links_count
        );
END;
$function$

-- Function: public.transfer_all_version_data
CREATE OR REPLACE FUNCTION public.transfer_all_version_data(p_old_tender_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_result JSON;
    v_boq_total INTEGER := 0;
    v_links_total INTEGER := 0;
    v_dop_result JSON;
    v_mappings_processed INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting complete transfer from % to %', p_old_tender_id, p_new_tender_id;

    -- Переносим данные для каждого маппинга
    FOR v_mapping IN
        SELECT id FROM tender_version_mappings
        WHERE new_tender_id = p_new_tender_id
    LOOP
        v_result := transfer_mapping_data(v_mapping.id);

        IF (v_result->>'success')::boolean THEN
            v_boq_total := v_boq_total + ((v_result->'boq')->>'boq_transferred')::integer;
            v_links_total := v_links_total + ((v_result->'links')->>'links_transferred')::integer;
            v_mappings_processed := v_mappings_processed + 1;
        END IF;
    END LOOP;

    -- Переносим ДОП позиции
    v_dop_result := transfer_dop_positions_fixed(p_new_tender_id, p_old_tender_id);

    RETURN json_build_object(
        'success', true,
        'mappings_processed', v_mappings_processed,
        'boq_items_transferred', v_boq_total,
        'links_transferred', v_links_total,
        'dop_positions', v_dop_result
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$

-- Function: public.transfer_boq_items
CREATE OR REPLACE FUNCTION public.transfer_boq_items(p_mapping_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Вызываем новую версию функции
    RETURN transfer_boq_items_v2(p_mapping_id);
END;
$function$

-- Function: public.transfer_boq_items_fixed
CREATE OR REPLACE FUNCTION public.transfer_boq_items_fixed(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_boq_count INTEGER := 0;
    v_transferred INTEGER := 0;
    v_new_tender_id UUID;
BEGIN
    -- Получаем маппинг с JOIN для получения tender_id
    SELECT
        tvm.*,
        cp_new.tender_id as new_tender_id
    INTO v_mapping
    FROM tender_version_mappings tvm
    JOIN client_positions cp_new ON cp_new.id = tvm.new_position_id
    WHERE tvm.id = p_mapping_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mapping not found'
        );
    END IF;

    v_new_tender_id := v_mapping.new_tender_id;

    -- Считаем BOQ items в старой позиции
    SELECT COUNT(*) INTO v_boq_count
    FROM boq_items
    WHERE client_position_id = v_mapping.old_position_id;

    RAISE NOTICE 'Found % BOQ items in position %', v_boq_count, v_mapping.old_position_id;

    IF v_boq_count > 0 THEN
        -- Удаляем существующие BOQ items в новой позиции
        DELETE FROM boq_items
        WHERE client_position_id = v_mapping.new_position_id;

        -- Переносим BOQ items
        INSERT INTO boq_items (
            tender_id,
            client_position_id,
            item_number,
            sub_number,
            sort_order,
            item_type,
            description,
            unit,
            quantity,
            unit_rate,
            material_id,
            work_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            base_quantity,
            detail_cost_category_id,
            total_amount,
            created_at,
            updated_at
        )
        SELECT
            v_new_tender_id,
            v_mapping.new_position_id,
            item_number,
            sub_number,
            sort_order,
            item_type,
            description,
            unit,
            quantity,
            unit_rate,
            material_id,
            work_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            base_quantity,
            detail_cost_category_id,
            total_amount,
            now(),
            now()
        FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id;

        GET DIAGNOSTICS v_transferred = ROW_COUNT;
        RAISE NOTICE 'Transferred % BOQ items', v_transferred;
    END IF;

    RETURN json_build_object(
        'success', true,
        'boq_found', v_boq_count,
        'boq_transferred', v_transferred,
        'mapping_id', p_mapping_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$

-- Function: public.transfer_boq_items_rpc
CREATE OR REPLACE FUNCTION public.transfer_boq_items_rpc(mapping_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN public.transfer_boq_items(mapping_id);
END;
$function$

-- Function: public.transfer_boq_items_v2
CREATE OR REPLACE FUNCTION public.transfer_boq_items_v2(p_mapping_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_inserted_count INTEGER := 0;
    v_new_tender_id UUID;
    v_links_result JSON;
BEGIN
    RAISE NOTICE '🔄 Starting transfer_boq_items_v2 for mapping %', p_mapping_id;

    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ Mapping not found: %', p_mapping_id;
        RETURN FALSE;
    END IF;

    IF v_mapping.old_position_id IS NULL OR v_mapping.new_position_id IS NULL THEN
        RAISE NOTICE '❌ Missing position IDs in mapping: old=%, new=%',
            v_mapping.old_position_id, v_mapping.new_position_id;
        RETURN FALSE;
    END IF;

    SELECT tender_id INTO v_new_tender_id
    FROM client_positions
    WHERE id = v_mapping.new_position_id;

    -- Переносим BOQ items
    INSERT INTO boq_items (
        tender_id,
        client_position_id,
        item_number,
        sub_number,
        sort_order,
        item_type,
        description,
        unit,
        quantity,
        unit_rate,
        material_id,
        work_id,
        consumption_coefficient,
        conversion_coefficient,
        delivery_price_type,
        delivery_amount,
        base_quantity,
        detail_cost_category_id,
        total_amount,
        commercial_cost,
        commercial_markup_coefficient,
        material_type,
        currency_type,
        currency_rate,
        quote_link,
        note,
        created_at,
        updated_at
    )
    SELECT
        v_new_tender_id,
        v_mapping.new_position_id,
        item_number,
        sub_number,
        sort_order,
        item_type,
        description,
        unit,
        quantity,
        unit_rate,
        material_id,
        work_id,
        consumption_coefficient,
        conversion_coefficient,
        delivery_price_type,
        delivery_amount,
        base_quantity,
        detail_cost_category_id,
        total_amount,
        commercial_cost,
        commercial_markup_coefficient,
        material_type,
        currency_type,
        currency_rate,
        quote_link,
        note,
        NOW(),
        NOW()
    FROM boq_items
    WHERE client_position_id = v_mapping.old_position_id;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RAISE NOTICE '  ✓ Transferred % BOQ items from position % to %',
        v_inserted_count, v_mapping.old_position_id, v_mapping.new_position_id;

    -- Используем новую функцию для переноса work_material_links
    v_links_result := transfer_work_material_links_v2(
        v_mapping.old_position_id,
        v_mapping.new_position_id
    );

    RAISE NOTICE '  📎 Work_material_links transfer: %', v_links_result;

    IF v_inserted_count > 0 OR (v_links_result->>'links_transferred')::int > 0 THEN
        UPDATE tender_version_mappings
        SET
            mapping_status = 'applied',
            updated_at = NOW()
        WHERE id = p_mapping_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error in transfer_boq_items_v2: %', SQLERRM;
        RETURN FALSE;
END;
$function$

-- Function: public.transfer_boq_items_with_creation
CREATE OR REPLACE FUNCTION public.transfer_boq_items_with_creation(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_boq_count INTEGER := 0;
    v_transferred_count INTEGER := 0;
    v_links_count INTEGER := 0;
    v_new_tender_id UUID;
    v_debug_info JSON;
BEGIN
    -- Получаем данные маппинга с JOIN на позиции
    SELECT
        tvm.*,
        cp_old.tender_id as old_tender_id,
        cp_new.tender_id as new_tender_id
    INTO v_mapping
    FROM tender_version_mappings tvm
    LEFT JOIN client_positions cp_old ON cp_old.id = tvm.old_position_id
    LEFT JOIN client_positions cp_new ON cp_new.id = tvm.new_position_id
    WHERE tvm.id = p_mapping_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Mapping not found: %s', p_mapping_id)
        );
    END IF;

    IF v_mapping.old_position_id IS NULL OR v_mapping.new_position_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Invalid mapping: old=%s, new=%s', v_mapping.old_position_id, v_mapping.new_position_id)
        );
    END IF;

    v_new_tender_id := v_mapping.new_tender_id;

    RAISE NOTICE 'Processing mapping % : old_pos=%, new_pos=%, new_tender=%',
        p_mapping_id, v_mapping.old_position_id, v_mapping.new_position_id, v_new_tender_id;

    -- Считаем BOQ items в старой позиции
    SELECT COUNT(*) INTO v_boq_count
    FROM boq_items
    WHERE client_position_id = v_mapping.old_position_id;

    RAISE NOTICE 'Found % BOQ items in old position', v_boq_count;

    -- Если есть BOQ items для переноса
    IF v_boq_count > 0 THEN
        -- Сначала удаляем существующие BOQ items в новой позиции
        DELETE FROM boq_items
        WHERE client_position_id = v_mapping.new_position_id;

        -- Переносим BOQ items
        INSERT INTO boq_items (
            tender_id,
            client_position_id,
            item_number,
            sub_number,
            sort_order,
            item_type,
            description,
            unit,
            quantity,
            unit_rate,
            material_id,
            work_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            base_quantity,
            detail_cost_category_id,
            total_amount,
            created_at,
            updated_at
        )
        SELECT
            v_new_tender_id,
            v_mapping.new_position_id,
            item_number,
            sub_number,
            sort_order,
            item_type,
            description,
            unit,
            quantity,
            unit_rate,
            material_id,
            work_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            base_quantity,
            detail_cost_category_id,
            total_amount,
            now(),
            now()
        FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id;

        GET DIAGNOSTICS v_transferred_count = ROW_COUNT;
        RAISE NOTICE 'Transferred % BOQ items', v_transferred_count;
    END IF;

    -- Переносим work_material_links
    SELECT COUNT(*) INTO v_links_count
    FROM work_material_links
    WHERE client_position_id = v_mapping.old_position_id;

    IF v_links_count > 0 THEN
        -- Удаляем существующие links
        DELETE FROM work_material_links
        WHERE client_position_id = v_mapping.new_position_id;

        -- Переносим links
        INSERT INTO work_material_links (
            client_position_id,
            work_id,
            material_id,
            sub_work_id,
            sub_material_id,
            work_quantity,
            material_quantity,
            consumption_coefficient,
            conversion_coefficient,
            detail_cost_category_id,
            created_at,
            updated_at
        )
        SELECT
            v_mapping.new_position_id,
            work_id,
            material_id,
            sub_work_id,
            sub_material_id,
            work_quantity,
            material_quantity,
            consumption_coefficient,
            conversion_coefficient,
            detail_cost_category_id,
            now(),
            now()
        FROM work_material_links
        WHERE client_position_id = v_mapping.old_position_id;

        GET DIAGNOSTICS v_links_count = ROW_COUNT;
        RAISE NOTICE 'Transferred % work_material_links', v_links_count;
    END IF;

    -- Возвращаем детальный результат
    RETURN json_build_object(
        'success', true,
        'mapping_id', p_mapping_id,
        'old_position_id', v_mapping.old_position_id,
        'new_position_id', v_mapping.new_position_id,
        'boq_items_found', v_boq_count,
        'boq_items_transferred', v_transferred_count,
        'links_transferred', v_links_count
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'mapping_id', p_mapping_id,
            'detail', SQLSTATE
        );
END;
$function$

-- Function: public.transfer_boq_with_mapping
CREATE OR REPLACE FUNCTION public.transfer_boq_with_mapping(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_old_boq RECORD;
    v_new_position RECORD;
    v_old_position RECORD;
    v_inserted_count INTEGER := 0;
    v_links_result JSON;
BEGIN
    -- Получаем информацию о маппинге
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF v_mapping IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mapping not found'
        );
    END IF;

    -- Получаем информацию о новой позиции
    SELECT * INTO v_new_position
    FROM client_positions
    WHERE id = v_mapping.new_position_id;

    -- Получаем информацию о старой позиции для manual полей
    SELECT * INTO v_old_position
    FROM client_positions
    WHERE id = v_mapping.old_position_id;

    -- Сначала удаляем существующие BOQ items в новой позиции
    DELETE FROM boq_items
    WHERE client_position_id = v_mapping.new_position_id;

    -- Переносим BOQ items с правильными item_numbers
    FOR v_old_boq IN
        SELECT * FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id
        ORDER BY sort_order, item_number
    LOOP
        INSERT INTO boq_items (
            tender_id,
            client_position_id,
            item_number,
            sub_number,
            sort_order,
            item_type,
            description,
            unit,
            quantity,
            unit_rate,
            material_id,
            work_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            base_quantity,
            detail_cost_category_id,
            total_amount,
            currency_type,
            currency_rate,
            created_at,
            updated_at
        )
        VALUES (
            v_mapping.new_tender_id,
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

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    -- НОВОЕ: Обновляем manual поля в новой позиции
    IF v_old_position.manual_volume IS NOT NULL OR v_old_position.manual_note IS NOT NULL THEN
        UPDATE client_positions
        SET
            manual_volume = v_old_position.manual_volume,
            manual_note = v_old_position.manual_note
        WHERE id = v_mapping.new_position_id;

        RAISE NOTICE '  ✓ Transferred manual fields for position %', v_mapping.new_position_id;
    END IF;

    RAISE NOTICE '  ✓ Transferred % BOQ items from position % to %',
        v_inserted_count, v_mapping.old_position_id, v_mapping.new_position_id;

    -- Используем функцию для переноса work_material_links если она существует
    BEGIN
        v_links_result := transfer_work_material_links_v2(
            v_mapping.old_position_id,
            v_mapping.new_position_id
        );
        RAISE NOTICE '  📎 Work_material_links transfer: %', v_links_result;
    EXCEPTION
        WHEN undefined_function THEN
            RAISE NOTICE '  ⚠️ Function transfer_work_material_links_v2 not found, skipping links transfer';
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
$function$

-- Function: public.transfer_dop_positions
CREATE OR REPLACE FUNCTION public.transfer_dop_positions(p_new_tender_id uuid, p_old_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_dop_count INTEGER := 0;
    v_boq_count INTEGER := 0;
    v_links_count INTEGER := 0;
    v_total_boq INTEGER := 0;
    v_total_links INTEGER := 0;
    v_mapping RECORD;
    v_new_dop_position RECORD;
    v_old_link RECORD;
    v_new_work_boq_id UUID;
    v_new_material_boq_id UUID;
    v_new_sub_work_boq_id UUID;
    v_new_sub_material_boq_id UUID;
BEGIN
    RAISE NOTICE '🚀 Starting DOP positions transfer from tender % to %', p_old_tender_id, p_new_tender_id;

    -- Переносим все ДОП позиции
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
    LOOP
        RAISE NOTICE '📦 Processing DOP position: % (parent: %)',
            v_dop_position.position_number, v_dop_position.parent_position_id;

        -- Ищем новый parent_id через маппинги
        v_new_parent_id := NULL;

        IF v_dop_position.parent_position_id IS NOT NULL THEN
            -- Используем tender_version_mappings для поиска нового родителя
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        -- Создаем новую ДОП позицию (включая manual_volume и manual_note)
        INSERT INTO client_positions (
            tender_id,
            position_number,
            item_no,
            work_name,
            parent_position_id,
            is_additional,
            position_type,
            hierarchy_level,
            unit,
            volume,
            manual_volume,  -- Добавлено
            manual_note,    -- Добавлено
            client_note,
            total_materials_cost,
            total_works_cost,
            total_commercial_materials_cost,
            total_commercial_works_cost,
            created_at,
            updated_at
        )
        SELECT
            p_new_tender_id,
            position_number,
            item_no,
            work_name,
            v_new_parent_id,
            true,
            position_type,
            hierarchy_level,
            unit,
            volume,
            manual_volume,  -- Добавлено
            manual_note,    -- Добавлено
            client_note,
            total_materials_cost,
            total_works_cost,
            total_commercial_materials_cost,
            total_commercial_works_cost,
            now(),
            now()
        FROM client_positions
        WHERE id = v_dop_position.id
        ON CONFLICT (tender_id, position_number) DO NOTHING
        RETURNING id INTO v_new_dop_id;

        IF v_new_dop_id IS NOT NULL THEN
            v_dop_count := v_dop_count + 1;

            -- Получаем информацию о новой ДОП позиции
            SELECT * INTO v_new_dop_position
            FROM client_positions
            WHERE id = v_new_dop_id;

            -- Переносим BOQ items для ДОП позиции с правильными item_numbers
            INSERT INTO boq_items (
                tender_id,
                client_position_id,
                item_number,
                sub_number,
                sort_order,
                item_type,
                description,
                unit,
                quantity,
                unit_rate,
                material_id,
                work_id,
                consumption_coefficient,
                conversion_coefficient,
                delivery_price_type,
                delivery_amount,
                base_quantity,
                detail_cost_category_id,
                total_amount,
                currency_type,
                currency_rate,
                created_at,
                updated_at
            )
            SELECT
                p_new_tender_id,
                v_new_dop_id,
                v_new_dop_position.position_number || '.' || sub_number,
                sub_number,
                sort_order,
                item_type,
                description,
                unit,
                quantity,
                unit_rate,
                material_id,
                work_id,
                consumption_coefficient,
                conversion_coefficient,
                delivery_price_type,
                delivery_amount,
                base_quantity,
                detail_cost_category_id,
                total_amount,
                currency_type,
                currency_rate,
                now(),
                now()
            FROM boq_items
            WHERE client_position_id = v_dop_position.id;

            GET DIAGNOSTICS v_boq_count = ROW_COUNT;
            v_total_boq := v_total_boq + v_boq_count;

            -- Переносим work_material_links для ДОП позиции с правильным маппингом BOQ items
            FOR v_old_link IN
                SELECT * FROM work_material_links
                WHERE client_position_id = v_dop_position.id
            LOOP
                -- Находим новые BOQ item IDs по старым
                v_new_work_boq_id := NULL;
                v_new_material_boq_id := NULL;
                v_new_sub_work_boq_id := NULL;
                v_new_sub_material_boq_id := NULL;

                -- Маппинг work_boq_item_id
                IF v_old_link.work_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_work_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                        AND COALESCE(new_boq.work_id, '00000000-0000-0000-0000-000000000000'::uuid) =
                            COALESCE(old_boq.work_id, '00000000-0000-0000-0000-000000000000'::uuid)
                    )
                    WHERE old_boq.id = v_old_link.work_boq_item_id
                    LIMIT 1;
                END IF;

                -- Маппинг material_boq_item_id
                IF v_old_link.material_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_material_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                        AND COALESCE(new_boq.material_id, '00000000-0000-0000-0000-000000000000'::uuid) =
                            COALESCE(old_boq.material_id, '00000000-0000-0000-0000-000000000000'::uuid)
                    )
                    WHERE old_boq.id = v_old_link.material_boq_item_id
                    LIMIT 1;
                END IF;

                -- Маппинг sub_work_boq_item_id
                IF v_old_link.sub_work_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_sub_work_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                    )
                    WHERE old_boq.id = v_old_link.sub_work_boq_item_id
                    LIMIT 1;
                END IF;

                -- Маппинг sub_material_boq_item_id
                IF v_old_link.sub_material_boq_item_id IS NOT NULL THEN
                    SELECT new_boq.id INTO v_new_sub_material_boq_id
                    FROM boq_items old_boq
                    JOIN boq_items new_boq ON (
                        new_boq.client_position_id = v_new_dop_id
                        AND new_boq.item_type = old_boq.item_type
                        AND new_boq.sub_number = old_boq.sub_number
                    )
                    WHERE old_boq.id = v_old_link.sub_material_boq_item_id
                    LIMIT 1;
                END IF;

                -- Вставляем новый link только если нашли соответствующие BOQ items
                IF (v_new_work_boq_id IS NOT NULL OR v_new_sub_work_boq_id IS NOT NULL) AND
                   (v_new_material_boq_id IS NOT NULL OR v_new_sub_material_boq_id IS NOT NULL) THEN

                    INSERT INTO work_material_links (
                        client_position_id,
                        work_boq_item_id,
                        material_boq_item_id,
                        sub_work_boq_item_id,
                        sub_material_boq_item_id,
                        material_quantity_per_work,
                        usage_coefficient,
                        delivery_price_type,
                        delivery_amount,
                        notes,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        v_new_dop_id,
                        v_new_work_boq_id,
                        v_new_material_boq_id,
                        v_new_sub_work_boq_id,
                        v_new_sub_material_boq_id,
                        v_old_link.material_quantity_per_work,
                        v_old_link.usage_coefficient,
                        v_old_link.delivery_price_type,
                        v_old_link.delivery_amount,
                        v_old_link.notes,
                        now(),
                        now()
                    )
                    ON CONFLICT DO NOTHING;

                    v_links_count := v_links_count + 1;
                END IF;
            END LOOP;

            v_total_links := v_total_links + v_links_count;

            RAISE NOTICE '✅ Created DOP position % with % BOQ items and % links',
                v_dop_position.position_number, v_boq_count, v_links_count;
        END IF;
    END LOOP;

    RAISE NOTICE '🎉 DOP transfer complete: % positions, % BOQ items, % links',
        v_dop_count, v_total_boq, v_total_links;

    RETURN json_build_object(
        'success', true,
        'dopCount', v_dop_count,
        'boqCount', v_total_boq,
        'linksCount', v_total_links
    );
END;
$function$

-- Function: public.transfer_dop_positions_fixed
CREATE OR REPLACE FUNCTION public.transfer_dop_positions_fixed(p_new_tender_id uuid, p_old_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_dop_count INTEGER := 0;
    v_boq_count INTEGER := 0;
    v_total_boq INTEGER := 0;
    v_new_dop_position RECORD;
BEGIN
    RAISE NOTICE 'Starting DOP transfer from % to %', p_old_tender_id, p_new_tender_id;

    -- Переносим все ДОП позиции
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
    LOOP
        RAISE NOTICE 'Processing DOP: %', v_dop_position.position_number;

        -- Ищем новый parent_id
        v_new_parent_id := NULL;

        IF v_dop_position.parent_position_id IS NOT NULL THEN
            -- Ищем через маппинги
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        -- Создаем новую ДОП позицию с правильными колонками (включая manual поля)
        INSERT INTO client_positions (
            tender_id, position_number, item_no, work_name, parent_position_id, is_additional,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, created_at, updated_at
        )
        SELECT
            p_new_tender_id, position_number, item_no, work_name, v_new_parent_id, true,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, now(), now()
        FROM client_positions
        WHERE id = v_dop_position.id
        ON CONFLICT (tender_id, position_number) DO NOTHING
        RETURNING id INTO v_new_dop_id;

        IF v_new_dop_id IS NOT NULL THEN
            v_dop_count := v_dop_count + 1;

            -- Получаем информацию о новой ДОП позиции
            SELECT * INTO v_new_dop_position
            FROM client_positions
            WHERE id = v_new_dop_id;

            -- Переносим BOQ items с правильными item_numbers
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
$function$

-- Function: public.transfer_dop_positions_rpc
CREATE OR REPLACE FUNCTION public.transfer_dop_positions_rpc(new_tender_id uuid, old_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Вызываем основную функцию с префиксом p_
    RETURN public.transfer_dop_positions(new_tender_id, old_tender_id);
END;
$function$

-- Function: public.transfer_dop_positions_v2
CREATE OR REPLACE FUNCTION public.transfer_dop_positions_v2(p_new_tender_id uuid, p_old_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_dop_count INTEGER := 0;
    v_old_boq RECORD;
    v_boq_total INTEGER := 0;
    v_new_dop_position RECORD;
BEGIN
    RAISE NOTICE '🚀 Starting transfer_dop_positions_v2 from tender % to %',
        p_old_tender_id, p_new_tender_id;

    -- Переносим все ДОП позиции
    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
        ORDER BY position_number
    LOOP
        RAISE NOTICE '📋 Processing DOP position: id=%, number=%, name=%',
            v_dop_position.id, v_dop_position.position_number, v_dop_position.work_name;

        v_new_parent_id := NULL;

        -- Сначала пытаемся найти родителя через tender_version_mappings
        IF v_dop_position.parent_position_id IS NOT NULL THEN
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        -- Создаем новую ДОП позицию с правильными колонками (включая manual поля)
        INSERT INTO client_positions (
            tender_id, position_number, item_no, work_name, parent_position_id, is_additional,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, created_at, updated_at
        )
        SELECT
            p_new_tender_id, position_number, item_no, work_name, v_new_parent_id, true,
            position_type, hierarchy_level, unit, volume,
            manual_volume, manual_note,  -- Добавлено
            client_note,
            total_materials_cost, total_works_cost, total_commercial_materials_cost,
            total_commercial_works_cost, now(), now()
        FROM client_positions
        WHERE id = v_dop_position.id
        ON CONFLICT (tender_id, position_number) DO UPDATE SET
            parent_position_id = EXCLUDED.parent_position_id
        RETURNING id INTO v_new_dop_id;

        IF v_new_dop_id IS NOT NULL THEN
            v_dop_count := v_dop_count + 1;
            RAISE NOTICE '✅ Created DOP position %', v_dop_position.position_number;

            -- Получаем информацию о новой ДОП позиции
            SELECT * INTO v_new_dop_position
            FROM client_positions
            WHERE id = v_new_dop_id;

            -- Переносим BOQ items с маппингом для ДОП позиции
            FOR v_old_boq IN
                SELECT * FROM boq_items
                WHERE client_position_id = v_dop_position.id
            LOOP
                INSERT INTO boq_items (
                    tender_id,
                    client_position_id,
                    item_number,
                    sub_number,
                    sort_order,
                    item_type,
                    description,
                    unit,
                    quantity,
                    unit_rate,
                    material_id,
                    work_id,
                    consumption_coefficient,
                    conversion_coefficient,
                    delivery_price_type,
                    delivery_amount,
                    base_quantity,
                    detail_cost_category_id,
                    total_amount,
                    currency_type,
                    currency_rate,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_new_tender_id,
                    v_new_dop_id,
                    v_new_dop_position.position_number || '.' || v_old_boq.sub_number,
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

                v_boq_total := v_boq_total + 1;
            END LOOP;
        ELSE
            RAISE NOTICE '  ✓ DOP position already exists: %', v_new_dop_id;
        END IF;
    END LOOP;

    RAISE NOTICE '🎉 DOP transfer complete: % positions, % BOQ items',
        v_dop_count, v_boq_total;

    RETURN json_build_object(
        'success', true,
        'dop_positions_created', v_dop_count,
        'boq_items_transferred', v_boq_total
    );
END;
$function$

-- Function: public.transfer_dop_with_mapping
CREATE OR REPLACE FUNCTION public.transfer_dop_with_mapping(p_new_tender_id uuid, p_old_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dop_position RECORD;
    v_new_parent_id UUID;
    v_new_dop_id UUID;
    v_old_boq RECORD;
    v_new_boq_id UUID;
    v_dop_count INTEGER := 0;
    v_boq_total INTEGER := 0;
    v_links_result JSON;
BEGIN
    RAISE NOTICE '🚀 Starting DOP transfer with mapping from % to %', p_old_tender_id, p_new_tender_id;

    FOR v_dop_position IN
        SELECT * FROM client_positions
        WHERE tender_id = p_old_tender_id
        AND is_additional = true
    LOOP
        -- Находим новый parent через маппинг
        v_new_parent_id := NULL;
        IF v_dop_position.parent_position_id IS NOT NULL THEN
            SELECT new_position_id INTO v_new_parent_id
            FROM tender_version_mappings
            WHERE old_position_id = v_dop_position.parent_position_id
            AND new_tender_id = p_new_tender_id
            LIMIT 1;
        END IF;

        IF v_new_parent_id IS NULL AND v_dop_position.parent_position_id IS NOT NULL THEN
            RAISE NOTICE '⚠️ Parent not found for DOP %', v_dop_position.position_number;
            CONTINUE; -- Пропускаем если не нашли родителя
        END IF;

        -- Создаем новую ДОП позицию (только с существующими полями)
        INSERT INTO client_positions (
            tender_id,
            position_number,
            work_name,
            parent_position_id,
            is_additional,
            unit,
            volume,
            manual_volume,
            client_note,
            item_no,
            manual_note,
            position_type,
            hierarchy_level,
            created_at,
            updated_at
        )
        VALUES (
            p_new_tender_id,
            v_dop_position.position_number,
            v_dop_position.work_name,
            v_new_parent_id,
            true,
            v_dop_position.unit,
            v_dop_position.volume,
            v_dop_position.manual_volume,
            v_dop_position.client_note,
            v_dop_position.item_no,
            v_dop_position.manual_note,
            v_dop_position.position_type,
            v_dop_position.hierarchy_level,
            now(),
            now()
        )
        RETURNING id INTO v_new_dop_id;

        v_dop_count := v_dop_count + 1;
        RAISE NOTICE '✅ Created DOP position %', v_dop_position.position_number;

        -- Переносим BOQ items с маппингом для ДОП позиции
        FOR v_old_boq IN
            SELECT * FROM boq_items
            WHERE client_position_id = v_dop_position.id
        LOOP
            INSERT INTO boq_items (
                tender_id,
                client_position_id,
                item_number,
                sub_number,
                sort_order,
                item_type,
                description,
                unit,
                quantity,
                unit_rate,
                material_id,
                work_id,
                consumption_coefficient,
                conversion_coefficient,
                delivery_price_type,
                delivery_amount,
                base_quantity,
                detail_cost_category_id,
                total_amount,
                created_at,
                updated_at
            )
            VALUES (
                p_new_tender_id,
                v_new_dop_id,
                v_old_boq.item_number,
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
                now(),
                now()
            )
            RETURNING id INTO v_new_boq_id;

            -- Сохраняем маппинг BOQ items
            PERFORM save_boq_mapping(
                v_old_boq.id,
                v_new_boq_id,
                p_old_tender_id,
                p_new_tender_id,
                NULL,
                'dop'
            );

            v_boq_total := v_boq_total + 1;
        END LOOP;

        -- Переносим work_material_links для ДОП позиции
        v_links_result := transfer_links_using_mapping(
            v_dop_position.id,
            v_new_dop_id,
            p_new_tender_id
        );

        IF (v_links_result->>'success')::boolean THEN
            RAISE NOTICE '  Links transferred: %', v_links_result->>'links_transferred';
        END IF;
    END LOOP;

    RAISE NOTICE '🎉 DOP transfer complete: % positions, % BOQ items',
        v_dop_count, v_boq_total;

    RETURN json_build_object(
        'success', true,
        'dop_positions', v_dop_count,
        'boq_items', v_boq_total
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$function$

-- Function: public.transfer_links_final
CREATE OR REPLACE FUNCTION public.transfer_links_final(p_old_position_id uuid, p_new_position_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_link RECORD;
    v_new_work_id UUID;
    v_new_mat_id UUID;
    v_transferred INTEGER := 0;
    v_skipped INTEGER := 0;
    v_errors INTEGER := 0;
BEGIN
    -- Очищаем существующие links
    DELETE FROM work_material_links WHERE client_position_id = p_new_position_id;

    FOR v_link IN
        SELECT
            wml.*,
            work_boq.item_number as work_num,
            mat_boq.item_number as mat_num
        FROM work_material_links wml
        LEFT JOIN boq_items work_boq ON work_boq.id = wml.work_boq_item_id
        LEFT JOIN boq_items mat_boq ON mat_boq.id = wml.material_boq_item_id
        WHERE wml.client_position_id = p_old_position_id
    LOOP
        -- Маппинг work BOQ item
        v_new_work_id := NULL;
        IF v_link.work_boq_item_id IS NOT NULL AND v_link.work_num IS NOT NULL THEN
            SELECT id INTO v_new_work_id
            FROM boq_items
            WHERE client_position_id = p_new_position_id
            AND item_number = v_link.work_num
            LIMIT 1;
        END IF;

        -- Маппинг material BOQ item
        v_new_mat_id := NULL;
        IF v_link.material_boq_item_id IS NOT NULL AND v_link.mat_num IS NOT NULL THEN
            SELECT id INTO v_new_mat_id
            FROM boq_items
            WHERE client_position_id = p_new_position_id
            AND item_number = v_link.mat_num
            LIMIT 1;
        END IF;

        -- Проверяем что есть хотя бы один валидный ID (требование триггера)
        IF v_new_work_id IS NOT NULL OR v_new_mat_id IS NOT NULL THEN
            BEGIN
                INSERT INTO work_material_links (
                    client_position_id,
                    work_boq_item_id,
                    material_boq_item_id,
                    sub_work_boq_item_id,
                    sub_material_boq_item_id,
                    notes,
                    delivery_price_type,
                    delivery_amount,
                    material_quantity_per_work,
                    usage_coefficient,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_new_position_id,
                    v_new_work_id,
                    v_new_mat_id,
                    NULL, -- sub items пока пропускаем
                    NULL,
                    v_link.notes,
                    v_link.delivery_price_type,
                    v_link.delivery_amount,
                    v_link.material_quantity_per_work,
                    v_link.usage_coefficient,
                    now(),
                    now()
                );
                v_transferred := v_transferred + 1;
            EXCEPTION
                WHEN OTHERS THEN
                    v_errors := v_errors + 1;
                    RAISE NOTICE 'Error transferring link: %', SQLERRM;
            END;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'transferred', v_transferred,
        'skipped', v_skipped,
        'errors', v_errors
    );
END;
$function$

-- Function: public.transfer_links_fixed
CREATE OR REPLACE FUNCTION public.transfer_links_fixed(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_links_count INTEGER := 0;
    v_transferred INTEGER := 0;
BEGIN
    -- Получаем маппинг
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mapping not found'
        );
    END IF;

    -- Считаем links в старой позиции (используем правильные имена колонок!)
    SELECT COUNT(*) INTO v_links_count
    FROM work_material_links
    WHERE client_position_id = v_mapping.old_position_id;

    RAISE NOTICE 'Found % links in position %', v_links_count, v_mapping.old_position_id;

    IF v_links_count > 0 THEN
        -- Удаляем существующие links в новой позиции
        DELETE FROM work_material_links
        WHERE client_position_id = v_mapping.new_position_id;

        -- Переносим links (используем правильные имена колонок!)
        INSERT INTO work_material_links (
            client_position_id,
            work_boq_item_id,
            material_boq_item_id,
            sub_work_boq_item_id,
            sub_material_boq_item_id,
            notes,
            delivery_price_type,
            delivery_amount,
            material_quantity_per_work,
            usage_coefficient,
            created_at,
            updated_at
        )
        SELECT
            v_mapping.new_position_id,
            work_boq_item_id,
            material_boq_item_id,
            sub_work_boq_item_id,
            sub_material_boq_item_id,
            notes,
            delivery_price_type,
            delivery_amount,
            material_quantity_per_work,
            usage_coefficient,
            now(),
            now()
        FROM work_material_links
        WHERE client_position_id = v_mapping.old_position_id;

        GET DIAGNOSTICS v_transferred = ROW_COUNT;
        RAISE NOTICE 'Transferred % links', v_transferred;
    END IF;

    RETURN json_build_object(
        'success', true,
        'links_found', v_links_count,
        'links_transferred', v_transferred,
        'mapping_id', p_mapping_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$

-- Function: public.transfer_links_using_mapping
CREATE OR REPLACE FUNCTION public.transfer_links_using_mapping(p_old_position_id uuid, p_new_position_id uuid, p_new_tender_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_link RECORD;
    v_new_work_id UUID;
    v_new_mat_id UUID;
    v_new_sub_work_id UUID;
    v_new_sub_mat_id UUID;
    v_links_count INTEGER := 0;
    v_transferred INTEGER := 0;
    v_skipped INTEGER := 0;
BEGIN
    -- Удаляем существующие links в новой позиции
    DELETE FROM work_material_links
    WHERE client_position_id = p_new_position_id;

    -- Переносим каждый link используя маппинг BOQ items
    FOR v_link IN
        SELECT * FROM work_material_links
        WHERE client_position_id = p_old_position_id
    LOOP
        v_links_count := v_links_count + 1;

        -- Находим новые ID через маппинг
        v_new_work_id := NULL;
        IF v_link.work_boq_item_id IS NOT NULL THEN
            SELECT new_boq_item_id INTO v_new_work_id
            FROM boq_item_version_mappings
            WHERE old_boq_item_id = v_link.work_boq_item_id
            AND new_tender_id = p_new_tender_id;
        END IF;

        v_new_mat_id := NULL;
        IF v_link.material_boq_item_id IS NOT NULL THEN
            SELECT new_boq_item_id INTO v_new_mat_id
            FROM boq_item_version_mappings
            WHERE old_boq_item_id = v_link.material_boq_item_id
            AND new_tender_id = p_new_tender_id;
        END IF;

        v_new_sub_work_id := NULL;
        IF v_link.sub_work_boq_item_id IS NOT NULL THEN
            SELECT new_boq_item_id INTO v_new_sub_work_id
            FROM boq_item_version_mappings
            WHERE old_boq_item_id = v_link.sub_work_boq_item_id
            AND new_tender_id = p_new_tender_id;
        END IF;

        v_new_sub_mat_id := NULL;
        IF v_link.sub_material_boq_item_id IS NOT NULL THEN
            SELECT new_boq_item_id INTO v_new_sub_mat_id
            FROM boq_item_version_mappings
            WHERE old_boq_item_id = v_link.sub_material_boq_item_id
            AND new_tender_id = p_new_tender_id;
        END IF;

        -- Проверяем, что есть хотя бы одна валидная пара
        IF (v_new_work_id IS NOT NULL AND v_new_mat_id IS NOT NULL) OR
           (v_new_work_id IS NOT NULL AND v_new_sub_mat_id IS NOT NULL) OR
           (v_new_sub_work_id IS NOT NULL AND v_new_mat_id IS NOT NULL) OR
           (v_new_sub_work_id IS NOT NULL AND v_new_sub_mat_id IS NOT NULL) THEN

            BEGIN
                INSERT INTO work_material_links (
                    client_position_id,
                    work_boq_item_id,
                    material_boq_item_id,
                    sub_work_boq_item_id,
                    sub_material_boq_item_id,
                    notes,
                    delivery_price_type,
                    delivery_amount,
                    material_quantity_per_work,
                    usage_coefficient,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_new_position_id,
                    v_new_work_id,
                    v_new_mat_id,
                    v_new_sub_work_id,
                    v_new_sub_mat_id,
                    v_link.notes,
                    v_link.delivery_price_type,
                    v_link.delivery_amount,
                    v_link.material_quantity_per_work,
                    v_link.usage_coefficient,
                    now(),
                    now()
                );
                v_transferred := v_transferred + 1;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Failed to transfer link: %', SQLERRM;
                    v_skipped := v_skipped + 1;
            END;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'links_found', v_links_count,
        'links_transferred', v_transferred,
        'links_skipped', v_skipped
    );
END;
$function$

-- Function: public.transfer_links_with_boq_mapping
CREATE OR REPLACE FUNCTION public.transfer_links_with_boq_mapping(p_old_position_id uuid, p_new_position_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_link RECORD;
    v_new_work_boq_id UUID;
    v_new_material_boq_id UUID;
    v_new_sub_work_id UUID;
    v_new_sub_material_id UUID;
    v_links_transferred INTEGER := 0;
    v_links_skipped INTEGER := 0;
BEGIN
    -- Удаляем существующие links в новой позиции
    DELETE FROM work_material_links
    WHERE client_position_id = p_new_position_id;

    -- Переносим каждый link с маппингом BOQ items
    FOR v_link IN
        SELECT * FROM work_material_links
        WHERE client_position_id = p_old_position_id
    LOOP
        -- Находим новый work_boq_item_id по соответствию
        v_new_work_boq_id := NULL;
        IF v_link.work_boq_item_id IS NOT NULL THEN
            SELECT new_boq.id INTO v_new_work_boq_id
            FROM boq_items old_boq
            JOIN boq_items new_boq ON (
                new_boq.client_position_id = p_new_position_id
                AND new_boq.item_number = old_boq.item_number
                AND COALESCE(new_boq.description, '') = COALESCE(old_boq.description, '')
            )
            WHERE old_boq.id = v_link.work_boq_item_id
            LIMIT 1;
        END IF;

        -- Находим новый material_boq_item_id по соответствию
        v_new_material_boq_id := NULL;
        IF v_link.material_boq_item_id IS NOT NULL THEN
            SELECT new_boq.id INTO v_new_material_boq_id
            FROM boq_items old_boq
            JOIN boq_items new_boq ON (
                new_boq.client_position_id = p_new_position_id
                AND new_boq.item_number = old_boq.item_number
                AND COALESCE(new_boq.description, '') = COALESCE(old_boq.description, '')
            )
            WHERE old_boq.id = v_link.material_boq_item_id
            LIMIT 1;
        END IF;

        -- Находим новые sub IDs
        v_new_sub_work_id := NULL;
        IF v_link.sub_work_boq_item_id IS NOT NULL THEN
            SELECT new_boq.id INTO v_new_sub_work_id
            FROM boq_items old_boq
            JOIN boq_items new_boq ON (
                new_boq.client_position_id = p_new_position_id
                AND new_boq.item_number = old_boq.item_number
                AND COALESCE(new_boq.description, '') = COALESCE(old_boq.description, '')
            )
            WHERE old_boq.id = v_link.sub_work_boq_item_id
            LIMIT 1;
        END IF;

        v_new_sub_material_id := NULL;
        IF v_link.sub_material_boq_item_id IS NOT NULL THEN
            SELECT new_boq.id INTO v_new_sub_material_id
            FROM boq_items old_boq
            JOIN boq_items new_boq ON (
                new_boq.client_position_id = p_new_position_id
                AND new_boq.item_number = old_boq.item_number
                AND COALESCE(new_boq.description, '') = COALESCE(old_boq.description, '')
            )
            WHERE old_boq.id = v_link.sub_material_boq_item_id
            LIMIT 1;
        END IF;

        -- Если нашли соответствия, создаем новый link
        IF (v_link.work_boq_item_id IS NULL OR v_new_work_boq_id IS NOT NULL) AND
           (v_link.material_boq_item_id IS NULL OR v_new_material_boq_id IS NOT NULL) THEN

            INSERT INTO work_material_links (
                client_position_id,
                work_boq_item_id,
                material_boq_item_id,
                sub_work_boq_item_id,
                sub_material_boq_item_id,
                notes,
                delivery_price_type,
                delivery_amount,
                material_quantity_per_work,
                usage_coefficient,
                created_at,
                updated_at
            )
            VALUES (
                p_new_position_id,
                v_new_work_boq_id,
                v_new_material_boq_id,
                v_new_sub_work_id,
                v_new_sub_material_id,
                v_link.notes,
                v_link.delivery_price_type,
                v_link.delivery_amount,
                v_link.material_quantity_per_work,
                v_link.usage_coefficient,
                now(),
                now()
            );

            v_links_transferred := v_links_transferred + 1;
        ELSE
            v_links_skipped := v_links_skipped + 1;
            RAISE NOTICE 'Skipped link: work_boq=%->%, material_boq=%->%',
                v_link.work_boq_item_id, v_new_work_boq_id,
                v_link.material_boq_item_id, v_new_material_boq_id;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'links_transferred', v_links_transferred,
        'links_skipped', v_links_skipped
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$

-- Function: public.transfer_mapping_data
CREATE OR REPLACE FUNCTION public.transfer_mapping_data(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_boq_result JSON;
    v_links_result JSON;
BEGIN
    -- Переносим BOQ items
    v_boq_result := transfer_boq_items_fixed(p_mapping_id);

    -- Переносим work_material_links
    v_links_result := transfer_links_fixed(p_mapping_id);

    RETURN json_build_object(
        'success', true,
        'boq', v_boq_result,
        'links', v_links_result,
        'mapping_id', p_mapping_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$

-- Function: public.transfer_mapping_data_v2
CREATE OR REPLACE FUNCTION public.transfer_mapping_data_v2(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_boq_result JSON;
    v_links_result JSON;
BEGIN
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Mapping not found');
    END IF;

    -- Переносим BOQ items
    v_boq_result := transfer_boq_items_fixed(p_mapping_id);

    -- Переносим links с правильным маппингом
    v_links_result := transfer_links_with_boq_mapping(
        v_mapping.old_position_id,
        v_mapping.new_position_id
    );

    RETURN json_build_object(
        'success', true,
        'boq', v_boq_result,
        'links', v_links_result,
        'mapping_id', p_mapping_id
    );
END;
$function$

-- Function: public.transfer_single_mapping
CREATE OR REPLACE FUNCTION public.transfer_single_mapping(p_mapping_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_mapping RECORD;
    v_boq_count INTEGER := 0;
    v_old_boq RECORD;
    v_new_boq_id UUID;
BEGIN
    -- Получаем маппинг
    SELECT * INTO v_mapping
    FROM tender_version_mappings
    WHERE id = p_mapping_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Mapping not found');
    END IF;

    -- Удаляем существующие BOQ items в новой позиции
    DELETE FROM boq_items
    WHERE client_position_id = v_mapping.new_position_id;

    -- Копируем BOQ items из старой позиции в новую
    FOR v_old_boq IN
        SELECT * FROM boq_items
        WHERE client_position_id = v_mapping.old_position_id
        ORDER BY sort_order, item_number
    LOOP
        INSERT INTO boq_items (
            tender_id,
            client_position_id,
            item_number,
            sub_number,
            sort_order,
            item_type,
            description,
            unit,
            quantity,
            unit_rate,
            material_id,
            work_id,
            consumption_coefficient,
            conversion_coefficient,
            delivery_price_type,
            delivery_amount,
            base_quantity,
            detail_cost_category_id,
            total_amount,
            created_at,
            updated_at
        )
        VALUES (
            v_mapping.new_tender_id,
            v_mapping.new_position_id,
            v_old_boq.item_number,
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
            now(),
            now()
        );

        v_boq_count := v_boq_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'boq_transferred', v_boq_count
    );
END;
$function$

-- Function: public.transfer_work_material_links
CREATE OR REPLACE FUNCTION public.transfer_work_material_links(p_old_position_id uuid, p_new_position_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_link RECORD;
    v_old_boq RECORD;
    v_new_work_id UUID;
    v_new_mat_id UUID;
    v_new_sub_work_id UUID;
    v_new_sub_mat_id UUID;
    v_links_count INTEGER := 0;
BEGIN
    -- Удаляем существующие links в новой позиции
    DELETE FROM work_material_links WHERE client_position_id = p_new_position_id;

    -- Переносим каждый link
    FOR v_link IN
        SELECT * FROM work_material_links
        WHERE client_position_id = p_old_position_id
    LOOP
        -- Находим соответствующие BOQ items в новой позиции по sub_number и типу
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

        -- Создаем новый link только если есть хотя бы одна пара work-material
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
$function$

-- Function: public.transfer_work_material_links_v2
CREATE OR REPLACE FUNCTION public.transfer_work_material_links_v2(p_old_position_id uuid, p_new_position_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    v_count := transfer_work_material_links(p_old_position_id, p_new_position_id);

    RETURN json_build_object(
        'success', true,
        'links_transferred', v_count
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'links_transferred', 0,
            'error', SQLERRM
        );
END;
$function$

-- Function: public.trigger_recalc_position_on_wml_change
CREATE OR REPLACE FUNCTION public.trigger_recalc_position_on_wml_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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

    -- ПРОСТОЕ суммирование total_amount
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

    -- Обновляем позицию
    UPDATE client_positions SET
        total_materials_cost = materials_total,
        total_works_cost = works_total,
        total_commercial_materials_cost = commercial_materials_total,
        total_commercial_works_cost = commercial_works_total,
        updated_at = NOW()
    WHERE id = v_position_id;

    RETURN COALESCE(NEW, OLD);
END;
$function$

-- Function: public.trigger_update_boq_currency_rates
CREATE OR REPLACE FUNCTION public.trigger_update_boq_currency_rates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result RECORD;
BEGIN
    -- Only proceed if currency rates have actually changed
    IF (OLD.usd_rate IS DISTINCT FROM NEW.usd_rate) OR 
       (OLD.eur_rate IS DISTINCT FROM NEW.eur_rate) OR 
       (OLD.cny_rate IS DISTINCT FROM NEW.cny_rate) THEN
        
        RAISE NOTICE 'Currency rates changed for tender %, triggering BOQ update', NEW.id;
        RAISE NOTICE 'Old rates - USD: %, EUR: %, CNY: %', OLD.usd_rate, OLD.eur_rate, OLD.cny_rate;
        RAISE NOTICE 'New rates - USD: %, EUR: %, CNY: %', NEW.usd_rate, NEW.eur_rate, NEW.cny_rate;
        
        -- Call the update function with the new rates
        SELECT * INTO v_result FROM update_boq_currency_rates(
            NEW.id,
            CASE WHEN OLD.usd_rate IS DISTINCT FROM NEW.usd_rate THEN NEW.usd_rate ELSE NULL END,
            CASE WHEN OLD.eur_rate IS DISTINCT FROM NEW.eur_rate THEN NEW.eur_rate ELSE NULL END,
            CASE WHEN OLD.cny_rate IS DISTINCT FROM NEW.cny_rate THEN NEW.cny_rate ELSE NULL END
        );
        
        RAISE NOTICE 'BOQ currency rates update completed: % total items updated', v_result.updated_items_count;
    ELSE
        RAISE NOTICE 'No currency rate changes detected for tender %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$

-- Function: public.trigger_update_commercial_costs_by_category
CREATE OR REPLACE FUNCTION public.trigger_update_commercial_costs_by_category()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    affected_tender_id UUID;
BEGIN
    -- Определяем затронутый тендер
    IF TG_OP = 'DELETE' THEN
        affected_tender_id := OLD.tender_id;
    ELSE
        affected_tender_id := NEW.tender_id;
    END IF;

    -- Пересчитываем если тендер не NULL
    IF affected_tender_id IS NOT NULL THEN
        PERFORM recalculate_commercial_costs_by_category(affected_tender_id);
    END IF;

    RETURN NULL;
END;
$function$

-- Function: public.update_boq_currency_rates
CREATE OR REPLACE FUNCTION public.update_boq_currency_rates(p_tender_id uuid, p_usd_rate numeric DEFAULT NULL::numeric, p_eur_rate numeric DEFAULT NULL::numeric, p_cny_rate numeric DEFAULT NULL::numeric)
 RETURNS TABLE(updated_items_count integer, updated_usd_items integer, updated_eur_items integer, updated_cny_items integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated_usd INTEGER := 0;
    v_updated_eur INTEGER := 0;
    v_updated_cny INTEGER := 0;
    v_total_updated INTEGER := 0;
BEGIN
    -- Log the function call
    RAISE NOTICE 'update_boq_currency_rates called for tender_id: %, usd_rate: %, eur_rate: %, cny_rate: %',
        p_tender_id, p_usd_rate, p_eur_rate, p_cny_rate;

    -- Update USD currency items if new USD rate provided
    -- Strategy: Update currency_rate AND trigger unit_rate update to force BEFORE trigger recalculation
    -- The calculate_boq_amounts_trigger will use the new currency_rate to recalculate total_amount
    IF p_usd_rate IS NOT NULL THEN
        UPDATE boq_items
        SET
            currency_rate = p_usd_rate,
            -- Trigger unit_rate change to force recalculation (set to itself triggers UPDATE OF unit_rate)
            unit_rate = unit_rate,
            updated_at = NOW()
        WHERE
            tender_id = p_tender_id
            AND currency_type = 'USD'
            AND currency_rate != p_usd_rate;

        GET DIAGNOSTICS v_updated_usd = ROW_COUNT;
        RAISE NOTICE 'Updated % USD items with new rate: %', v_updated_usd, p_usd_rate;
    END IF;

    -- Update EUR currency items if new EUR rate provided
    IF p_eur_rate IS NOT NULL THEN
        UPDATE boq_items
        SET
            currency_rate = p_eur_rate,
            -- Trigger unit_rate change to force recalculation
            unit_rate = unit_rate,
            updated_at = NOW()
        WHERE
            tender_id = p_tender_id
            AND currency_type = 'EUR'
            AND currency_rate != p_eur_rate;

        GET DIAGNOSTICS v_updated_eur = ROW_COUNT;
        RAISE NOTICE 'Updated % EUR items with new rate: %', v_updated_eur, p_eur_rate;
    END IF;

    -- Update CNY currency items if new CNY rate provided
    IF p_cny_rate IS NOT NULL THEN
        UPDATE boq_items
        SET
            currency_rate = p_cny_rate,
            -- Trigger unit_rate change to force recalculation
            unit_rate = unit_rate,
            updated_at = NOW()
        WHERE
            tender_id = p_tender_id
            AND currency_type = 'CNY'
            AND currency_rate != p_cny_rate;

        GET DIAGNOSTICS v_updated_cny = ROW_COUNT;
        RAISE NOTICE 'Updated % CNY items with new rate: %', v_updated_cny, p_cny_rate;
    END IF;

    -- Calculate total updated items
    v_total_updated := v_updated_usd + v_updated_eur + v_updated_cny;

    RAISE NOTICE 'Total updated items: %, USD: %, EUR: %, CNY: %',
        v_total_updated, v_updated_usd, v_updated_eur, v_updated_cny;

    -- Return the counts
    RETURN QUERY SELECT
        v_total_updated,
        v_updated_usd,
        v_updated_eur,
        v_updated_cny;
END;
$function$

-- Function: public.update_cost_categories_updated_at
CREATE OR REPLACE FUNCTION public.update_cost_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $function$

-- Function: public.update_detail_cost_categories_updated_at
CREATE OR REPLACE FUNCTION public.update_detail_cost_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $function$

-- Function: public.update_linked_material_total_amount
CREATE OR REPLACE FUNCTION public.update_linked_material_total_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_work RECORD;
    v_material RECORD;
    new_quantity DECIMAL(15,2);
    new_total DECIMAL(15,2);
    material_id UUID;
    work_id UUID;
BEGIN
    -- Определяем IDs
    IF TG_OP = 'DELETE' THEN
        material_id := COALESCE(OLD.material_boq_item_id, OLD.sub_material_boq_item_id);
        work_id := COALESCE(OLD.work_boq_item_id, OLD.sub_work_boq_item_id);
        RETURN OLD; -- При удалении не обновляем
    ELSE
        material_id := COALESCE(NEW.material_boq_item_id, NEW.sub_material_boq_item_id);
        work_id := COALESCE(NEW.work_boq_item_id, NEW.sub_work_boq_item_id);
    END IF;

    IF material_id IS NULL OR work_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Получаем работу
    SELECT quantity INTO v_work FROM boq_items WHERE id = work_id;

    -- Получаем материал
    SELECT
        unit_rate, currency_type, currency_rate,
        delivery_price_type, delivery_amount,
        consumption_coefficient, conversion_coefficient
    INTO v_material FROM boq_items WHERE id = material_id;

    -- Пересчитываем quantity
    new_quantity := COALESCE(v_work.quantity, 0) *
                   COALESCE(v_material.consumption_coefficient, NEW.material_quantity_per_work, 1) *
                   COALESCE(v_material.conversion_coefficient, NEW.usage_coefficient, 1);

    -- Пересчитываем total_amount
    new_total := new_quantity * COALESCE(v_material.unit_rate, 0) *
                CASE WHEN v_material.currency_type IS NOT NULL AND v_material.currency_type != 'RUB'
                     THEN COALESCE(v_material.currency_rate, 1) ELSE 1 END;

    -- Delivery cost
    new_total := new_total + CASE
        WHEN v_material.delivery_price_type = 'amount' THEN
            COALESCE(v_material.delivery_amount, 0) * new_quantity
        WHEN v_material.delivery_price_type = 'not_included' THEN new_total * 0.03
        ELSE 0
    END;

    -- Обновляем материал
    UPDATE boq_items SET quantity = new_quantity, total_amount = new_total, updated_at = NOW()
    WHERE id = material_id;

    RETURN NEW;
END;
$function$

-- Function: public.update_location_hierarchy
CREATE OR REPLACE FUNCTION public.update_location_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      IF NEW.parent_id IS NOT NULL THEN
          -- Получаем данные родителя
          SELECT level + 1, array_append(path, NEW.parent_id)
          INTO NEW.level, NEW.path
          FROM location
          WHERE id = NEW.parent_id;
      ELSE
          -- Корневая локация
          NEW.level = 0;
          NEW.path = '{}';
      END IF;

      RETURN NEW;
  END;
  $function$

-- Function: public.update_location_path
CREATE OR REPLACE FUNCTION public.update_location_path()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    parent_path text[];
    parent_level integer;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = ARRAY[NEW.id::text];
        NEW.level = 0;
    ELSE
        SELECT path, level INTO parent_path, parent_level
        FROM public.location
        WHERE id = NEW.parent_id;
        
        NEW.path = parent_path || NEW.id::text;
        NEW.level = parent_level + 1;
    END IF;
    
    RETURN NEW;
END;
$function$

-- Function: public.update_location_updated_at
CREATE OR REPLACE FUNCTION public.update_location_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $function$

-- Function: public.update_tender_cost_calculations
CREATE OR REPLACE FUNCTION public.update_tender_cost_calculations()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_base_quantity numeric(15,3);
    v_base_price numeric(15,2);
BEGIN
    -- Получаем базовые значения из category_location_mapping
    SELECT quantity, final_price 
    INTO v_base_quantity, v_base_price
    FROM public.category_location_mapping
    WHERE id = NEW.category_location_id;
    
    -- Вычисляем и обновляем поля
    NEW.base_quantity = v_base_quantity;
    NEW.base_price = v_base_price;
    NEW.final_quantity = v_base_quantity * NEW.quantity_multiplier;
    NEW.final_price = (v_base_price * NEW.quantity_multiplier + NEW.price_adjustment) * 
                      (1 + COALESCE(NEW.markup_percent, 0) / 100);
    
    RETURN NEW;
END;
$function$

-- Function: public.update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$

-- Function: public.update_work_material_templates_updated_at
CREATE OR REPLACE FUNCTION public.update_work_material_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

-- Function: public.upsert_cost_category
CREATE OR REPLACE FUNCTION public.upsert_cost_category(p_name text, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_id uuid;
    v_code text;
BEGIN
    -- Пытаемся найти существующую категорию
    SELECT id INTO v_id
    FROM public.cost_categories
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name));
    
    IF v_id IS NOT NULL THEN
        -- Обновляем описание если оно предоставлено
        IF p_description IS NOT NULL THEN
            UPDATE public.cost_categories
            SET description = p_description,
                updated_at = now()
            WHERE id = v_id;
        END IF;
        RETURN v_id;
    END IF;
    
    -- Создаем новую категорию
    v_code := 'CAT-' || extract(epoch from now())::bigint || '-' || md5(random()::text)::text;
    
    INSERT INTO public.cost_categories (code, name, description)
    VALUES (v_code, TRIM(p_name), p_description)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$function$

-- Function: public.upsert_detail_cost_category
CREATE OR REPLACE FUNCTION public.upsert_detail_cost_category(p_category_id uuid, p_name text, p_unit text, p_base_price numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_id uuid;
    v_code text;
BEGIN
    -- Пытаемся найти существующую детальную категорию
    SELECT id INTO v_id
    FROM public.detail_cost_categories
    WHERE category_id = p_category_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(p_name));
    
    IF v_id IS NOT NULL THEN
        -- Обновляем единицу измерения и цену
        UPDATE public.detail_cost_categories
        SET unit = p_unit,
            base_price = COALESCE(p_base_price, base_price),
            updated_at = now()
        WHERE id = v_id;
        RETURN v_id;
    END IF;
    
    -- Создаем новую детальную категорию
    v_code := 'DETAIL-' || extract(epoch from now())::bigint || '-' || md5(random()::text)::text;
    
    INSERT INTO public.detail_cost_categories (category_id, code, name, unit, base_price)
    VALUES (p_category_id, v_code, TRIM(p_name), p_unit, COALESCE(p_base_price, 0))
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$function$

-- Function: public.upsert_location
CREATE OR REPLACE FUNCTION public.upsert_location(p_name text, p_description text DEFAULT NULL::text, p_parent_id uuid DEFAULT NULL::uuid, p_location_type text DEFAULT 'other'::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_location_id UUID;
    v_unique_code TEXT;
    v_next_sort_order INTEGER;
BEGIN
    -- Проверяем, существует ли локация с таким именем
    SELECT id INTO v_location_id
    FROM public.location
    WHERE name = p_name
    AND is_active = true
    LIMIT 1;
    
    IF v_location_id IS NOT NULL THEN
        -- Обновляем существующую
        UPDATE public.location
        SET 
            description = COALESCE(p_description, description),
            parent_id = COALESCE(p_parent_id, parent_id),
            location_type = p_location_type,
            updated_at = NOW()
        WHERE id = v_location_id;
    ELSE
        -- Генерируем уникальный код
        v_unique_code := generate_unique_location_code(p_name, p_location_type);
        
        -- Получаем следующий sort_order
        SELECT COALESCE(MAX(sort_order), 0) + 10 INTO v_next_sort_order
        FROM public.location
        WHERE is_active = true;
        
        -- Создаем новую локацию
        INSERT INTO public.location (
            code,
            unique_code,
            name,
            description,
            parent_id,
            location_type,
            level,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_unique_code, -- используем уникальный код как основной
            v_unique_code,
            p_name,
            p_description,
            p_parent_id,
            p_location_type,
            CASE WHEN p_parent_id IS NULL THEN 1 ELSE 2 END,
            v_next_sort_order,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO v_location_id;
    END IF;
    
    RETURN v_location_id;
END;
$function$

-- Function: public.upsert_location
CREATE OR REPLACE FUNCTION public.upsert_location(p_name text, p_parent_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_id uuid;
    v_code text;
BEGIN
    -- Пытаемся найти существующую локацию
    SELECT id INTO v_id
    FROM public.location
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
    AND (parent_id IS NULL AND p_parent_id IS NULL OR parent_id = p_parent_id);
    
    IF v_id IS NOT NULL THEN
        -- Обновляем описание если оно предоставлено
        IF p_description IS NOT NULL THEN
            UPDATE public.location
            SET description = p_description,
                updated_at = now()
            WHERE id = v_id;
        END IF;
        RETURN v_id;
    END IF;
    
    -- Создаем новую локацию
    v_code := 'LOC-' || extract(epoch from now())::bigint || '-' || md5(random()::text)::text;
    
    INSERT INTO public.location (code, name, parent_id, description)
    VALUES (v_code, TRIM(p_name), p_parent_id, p_description)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$function$

-- Function: public.word_similarity
CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$

-- Function: public.word_similarity_commutator_op
CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$

-- Function: public.word_similarity_dist_commutator_op
CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$

-- Function: public.word_similarity_dist_op
CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$

-- Function: public.word_similarity_op
CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$


-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS calculate_boq_amounts_trigger ON public.boq_items;
CREATE TRIGGER calculate_boq_amounts_trigger BEFORE INSERT OR UPDATE OF unit_rate, quantity, currency_type, currency_rate, delivery_price_type, delivery_amount ON public.boq_items FOR EACH ROW EXECUTE FUNCTION calculate_boq_amounts()
DROP TRIGGER IF EXISTS recalculate_position_totals_trigger ON public.boq_items;
CREATE TRIGGER recalculate_position_totals_trigger AFTER INSERT OR DELETE OR UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION recalculate_client_position_totals()
DROP TRIGGER IF EXISTS update_commercial_costs_trigger ON public.boq_items;
CREATE TRIGGER update_commercial_costs_trigger AFTER INSERT OR DELETE OR UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION trigger_update_commercial_costs_by_category()
DROP TRIGGER IF EXISTS auto_assign_position_number_trigger ON public.client_positions;
CREATE TRIGGER auto_assign_position_number_trigger BEFORE INSERT ON public.client_positions FOR EACH ROW EXECUTE FUNCTION auto_assign_position_number()
DROP TRIGGER IF EXISTS tr_cost_nodes_autosort ON public.cost_nodes;
CREATE TRIGGER tr_cost_nodes_autosort BEFORE INSERT OR UPDATE OF parent_id, sort_order ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_autosort()
DROP TRIGGER IF EXISTS tr_cost_nodes_repath ON public.cost_nodes;
CREATE TRIGGER tr_cost_nodes_repath AFTER UPDATE OF parent_id, sort_order ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_repath_descendants()
DROP TRIGGER IF EXISTS tr_cost_nodes_set_path ON public.cost_nodes;
CREATE TRIGGER tr_cost_nodes_set_path BEFORE INSERT OR UPDATE OF parent_id, sort_order ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_before_ins_upd()
DROP TRIGGER IF EXISTS tr_cost_nodes_ts ON public.cost_nodes;
CREATE TRIGGER tr_cost_nodes_ts BEFORE INSERT OR UPDATE ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_set_timestamps()
DROP TRIGGER IF EXISTS update_material_names_updated_at ON public.material_names;
CREATE TRIGGER update_material_names_updated_at BEFORE UPDATE ON public.material_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
DROP TRIGGER IF EXISTS tr_tender_items_defaults ON public.tender_items;
CREATE TRIGGER tr_tender_items_defaults BEFORE INSERT ON public.tender_items FOR EACH ROW EXECUTE FUNCTION tender_items_defaults()
DROP TRIGGER IF EXISTS trigger_tender_markup_percentages_updated_at ON public.tender_markup_percentages;
CREATE TRIGGER trigger_tender_markup_percentages_updated_at BEFORE UPDATE ON public.tender_markup_percentages FOR EACH ROW EXECUTE FUNCTION handle_updated_at_tender_markup_percentages()
DROP TRIGGER IF EXISTS tenders_currency_rates_update ON public.tenders;
CREATE TRIGGER tenders_currency_rates_update AFTER UPDATE ON public.tenders FOR EACH ROW EXECUTE FUNCTION trigger_update_boq_currency_rates()
DROP TRIGGER IF EXISTS check_work_material_types_trigger ON public.work_material_links;
CREATE TRIGGER check_work_material_types_trigger BEFORE INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION check_work_material_types()
DROP TRIGGER IF EXISTS recalc_position_totals_on_wml_change ON public.work_material_links;
CREATE TRIGGER recalc_position_totals_on_wml_change AFTER INSERT OR DELETE OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION trigger_recalc_position_on_wml_change()
DROP TRIGGER IF EXISTS trigger_check_delivery_price ON public.work_material_links;
CREATE TRIGGER trigger_check_delivery_price BEFORE INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION check_delivery_price_consistency()
DROP TRIGGER IF EXISTS update_material_total_on_link_change ON public.work_material_links;
CREATE TRIGGER update_material_total_on_link_change AFTER INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION update_linked_material_total_amount()
DROP TRIGGER IF EXISTS work_material_templates_updated_at_trigger ON public.work_material_templates;
CREATE TRIGGER work_material_templates_updated_at_trigger BEFORE UPDATE ON public.work_material_templates FOR EACH ROW EXECUTE FUNCTION update_work_material_templates_updated_at()
DROP TRIGGER IF EXISTS update_work_names_updated_at ON public.work_names;
CREATE TRIGGER update_work_names_updated_at BEFORE UPDATE ON public.work_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
