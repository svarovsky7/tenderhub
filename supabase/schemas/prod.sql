-- Database Schema SQL Export
-- Generated: 2025-08-18T17:30:50.256308
-- Database: postgres
-- Host: aws-0-eu-central-1.pooler.supabase.com

-- ============================================
-- TABLES
-- ============================================

-- Table: auth.audit_log_entries
-- Description: Auth: Audit trail for user actions.
CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) NOT NULL DEFAULT ''::character varying,
    CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';

-- Table: auth.flow_state
-- Description: stores metadata for pkce logins
CREATE TABLE IF NOT EXISTS auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method USER-DEFINED NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';

-- Table: auth.identities
-- Description: Auth: Stores identities associated to a user.
CREATE TABLE IF NOT EXISTS auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT identities_pkey PRIMARY KEY (id),
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id),
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider),
    CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';
COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';

-- Table: auth.instances
-- Description: Auth: Manages users across multiple sites.
CREATE TABLE IF NOT EXISTS auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT instances_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';

-- Table: auth.mfa_amr_claims
-- Description: auth: stores authenticator method reference claims for multi factor authentication
CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL,
    CONSTRAINT amr_id_pk PRIMARY KEY (id),
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id),
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (authentication_method),
    CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';

-- Table: auth.mfa_challenges
-- Description: auth: stores metadata about challenge requests made
CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb,
    CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES None.None(None),
    CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';

-- Table: auth.mfa_factors
-- Description: auth: stores metadata about factors
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type USER-DEFINED NOT NULL,
    status USER-DEFINED NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at),
    CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
    CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';

-- Table: auth.one_time_tokens
CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type USER-DEFINED NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

-- Table: auth.refresh_tokens
-- Description: Auth: Store of tokens used to refresh JWT tokens once they expire.
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id uuid,
    id bigint(64) NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES None.None(None),
    CONSTRAINT refresh_tokens_token_unique UNIQUE (token)
);
COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';

-- Table: auth.saml_providers
-- Description: Auth: Manages SAML Identity Provider connections.
CREATE TABLE IF NOT EXISTS auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id),
    CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
    CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';

-- Table: auth.saml_relay_states
-- Description: Auth: Contains SAML Relay State information for each Service Provider initiated login.
CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES None.None(None),
    CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
    CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';

-- Table: auth.schema_migrations
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version character varying(255) NOT NULL,
    version character varying(255) NOT NULL,
    version character varying(255) NOT NULL
);

-- Table: auth.sessions
-- Description: Auth: Stores session data associated to a user.
CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal USER-DEFINED,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';
COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';

-- Table: auth.sso_domains
-- Description: Auth: Manages SSO email address domain mapping to an SSO Identity Provider.
CREATE TABLE IF NOT EXISTS auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
    CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';

-- Table: auth.sso_providers
-- Description: Auth: Manages SSO identity provider information; see saml_providers for SAML.
CREATE TABLE IF NOT EXISTS auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';
COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';

-- Table: auth.users
-- Description: Auth: Stores user login data within a secure schema.
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint(16) DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean NOT NULL DEFAULT false,
    deleted_at timestamp with time zone,
    is_anonymous boolean NOT NULL DEFAULT false,
    CONSTRAINT users_phone_key UNIQUE (phone),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';
COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';

-- Table: public.boq_items
-- Description: Bill of Quantities line items for each tender
CREATE TABLE IF NOT EXISTS public.boq_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    client_position_id uuid,
    item_number text NOT NULL,
    sub_number integer(32) DEFAULT 1,
    sort_order integer(32) DEFAULT 0,
    item_type USER-DEFINED NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    quantity numeric(12,4) NOT NULL,
    unit_rate numeric(12,4) NOT NULL,
    material_id uuid,
    work_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    imported_at timestamp with time zone,
    consumption_coefficient numeric(12,4),
    conversion_coefficient numeric(12,4),
    delivery_price_type USER-DEFINED DEFAULT 'included'::delivery_price_type,
    delivery_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2),
    cost_node_id uuid,
    CONSTRAINT boq_items_client_position_id_fkey FOREIGN KEY (client_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT boq_items_cost_node_id_fkey FOREIGN KEY (cost_node_id) REFERENCES public.cost_nodes(id),
    CONSTRAINT boq_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials_library(id),
    CONSTRAINT boq_items_pkey PRIMARY KEY (id),
    CONSTRAINT boq_items_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT boq_items_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works_library(id),
    CONSTRAINT uq_boq_position_sub_number UNIQUE (client_position_id),
    CONSTRAINT uq_boq_position_sub_number UNIQUE (client_position_id),
    CONSTRAINT uq_boq_position_sub_number UNIQUE (sub_number),
    CONSTRAINT uq_boq_position_sub_number UNIQUE (sub_number),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (tender_id),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (tender_id),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (item_number),
    CONSTRAINT uq_boq_tender_item_number UNIQUE (item_number)
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
COMMENT ON COLUMN public.boq_items.total_amount IS 'Общая стоимость элемента BOQ (автоматически рассчитывается с учетом доставки для материалов)';
COMMENT ON COLUMN public.boq_items.cost_node_id IS 'Reference to cost category from cost_nodes hierarchy';

-- Table: public.client_positions
-- Description: Позиции заказчика из Excel файла - верхний уровень группировки в BOQ
CREATE TABLE IF NOT EXISTS public.client_positions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    position_number integer(32) NOT NULL,
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
    CONSTRAINT client_positions_pkey PRIMARY KEY (id),
    CONSTRAINT client_positions_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT uq_client_positions_position_tender UNIQUE (tender_id),
    CONSTRAINT uq_client_positions_position_tender UNIQUE (tender_id),
    CONSTRAINT uq_client_positions_position_tender UNIQUE (position_number),
    CONSTRAINT uq_client_positions_position_tender UNIQUE (position_number)
);
COMMENT ON TABLE public.client_positions IS 'Позиции заказчика из Excel файла - верхний уровень группировки в BOQ';
COMMENT ON COLUMN public.client_positions.position_number IS 'Sequential position number within tender (auto-assigned if not provided)';
COMMENT ON COLUMN public.client_positions.unit IS 'Единица измерения из Excel';
COMMENT ON COLUMN public.client_positions.volume IS 'Объем работ из Excel';
COMMENT ON COLUMN public.client_positions.client_note IS 'Примечание заказчика из Excel';
COMMENT ON COLUMN public.client_positions.item_no IS 'Номер пункта из Excel (столбец № п/п)';
COMMENT ON COLUMN public.client_positions.work_name IS 'Наименование работ из Excel';
COMMENT ON COLUMN public.client_positions.manual_volume IS 'Объём работ, заданный вручную';

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
    sort_order integer(32) NOT NULL DEFAULT 100,
    path USER-DEFINED NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT cost_nodes_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id),
    CONSTRAINT cost_nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.cost_nodes(id),
    CONSTRAINT cost_nodes_pkey PRIMARY KEY (id),
    CONSTRAINT cost_nodes_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (parent_id),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (parent_id),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (name),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (name)
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

-- Table: public.materials_library
-- Description: Master catalog of materials with pricing
CREATE TABLE IF NOT EXISTS public.materials_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    unit text NOT NULL,
    category text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT materials_library_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.materials_library IS 'Master catalog of materials with pricing';

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

-- Table: public.tenders
-- Description: Main tender projects with client details
CREATE TABLE IF NOT EXISTS public.tenders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    client_name text NOT NULL,
    tender_number text NOT NULL,
    submission_deadline timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tenders_pkey PRIMARY KEY (id),
    CONSTRAINT tenders_tender_number_key UNIQUE (tender_number)
);
COMMENT ON TABLE public.tenders IS 'Main tender projects with client details';

-- Table: public.units
CREATE TABLE IF NOT EXISTS public.units (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    title text NOT NULL,
    CONSTRAINT units_code_key UNIQUE (code),
    CONSTRAINT units_pkey PRIMARY KEY (id)
);

-- Table: public.work_material_links
-- Description: Связи между работами и материалами. Одна работа может быть связана с множеством материалов, один материал может быть связан с множеством работ. Уникальна пара (work_boq_item_id, material_boq_item_id).
CREATE TABLE IF NOT EXISTS public.work_material_links (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    client_position_id uuid NOT NULL,
    work_boq_item_id uuid,
    material_boq_item_id uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    delivery_price_type USER-DEFINED DEFAULT 'included'::delivery_price_type,
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
    CONSTRAINT uq_work_material_pair UNIQUE (work_boq_item_id),
    CONSTRAINT uq_work_material_pair UNIQUE (work_boq_item_id),
    CONSTRAINT uq_work_material_pair UNIQUE (material_boq_item_id),
    CONSTRAINT uq_work_material_pair UNIQUE (material_boq_item_id),
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

-- Table: public.works_library
-- Description: Master catalog of work items with labor components
CREATE TABLE IF NOT EXISTS public.works_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    unit text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT works_library_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.works_library IS 'Master catalog of work items with labor components';

-- Table: realtime.messages
CREATE TABLE IF NOT EXISTS realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_pkey PRIMARY KEY (inserted_at),
    CONSTRAINT messages_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.schema_migrations
CREATE TABLE IF NOT EXISTS realtime.schema_migrations (
    version bigint(64) NOT NULL,
    version bigint(64) NOT NULL,
    version bigint(64) NOT NULL,
    inserted_at timestamp without time zone,
    inserted_at timestamp without time zone,
    inserted_at timestamp without time zone,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

-- Table: realtime.subscription
CREATE TABLE IF NOT EXISTS realtime.subscription (
    id bigint(64) NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters ARRAY NOT NULL DEFAULT '{}'::realtime.user_defined_filter[],
    claims jsonb NOT NULL,
    claims_role regrole NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT pk_subscription PRIMARY KEY (id)
);

-- Table: storage.buckets
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint(64),
    allowed_mime_types ARRAY,
    owner_id text,
    type USER-DEFINED NOT NULL DEFAULT 'STANDARD'::storage.buckettype,
    CONSTRAINT buckets_pkey PRIMARY KEY (id)
);
COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';

-- Table: storage.buckets_analytics
CREATE TABLE IF NOT EXISTS storage.buckets_analytics (
    id text NOT NULL,
    type USER-DEFINED NOT NULL DEFAULT 'ANALYTICS'::storage.buckettype,
    format text NOT NULL DEFAULT 'ICEBERG'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id)
);

-- Table: storage.migrations
CREATE TABLE IF NOT EXISTS storage.migrations (
    id integer(32) NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: storage.objects
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens ARRAY,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer(32),
    CONSTRAINT objects_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT objects_pkey PRIMARY KEY (id)
);
COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';

-- Table: storage.prefixes
CREATE TABLE IF NOT EXISTS storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL,
    level integer(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prefixes_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id),
    CONSTRAINT prefixes_pkey PRIMARY KEY (level),
    CONSTRAINT prefixes_pkey PRIMARY KEY (name)
);

-- Table: storage.s3_multipart_uploads
CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint(64) NOT NULL DEFAULT 0,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL,
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_metadata jsonb,
    CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id)
);

-- Table: storage.s3_multipart_uploads_parts
CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads_parts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    upload_id text NOT NULL,
    size bigint(64) NOT NULL DEFAULT 0,
    part_number integer(32) NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL,
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id),
    CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES None.None(None)
);

-- Table: supabase_migrations.schema_migrations
-- Description: Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text NOT NULL,
    version text NOT NULL,
    version text NOT NULL,
    statements ARRAY,
    statements ARRAY,
    statements ARRAY,
    name text,
    name text,
    name text,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
COMMENT ON TABLE supabase_migrations.schema_migrations IS 'Auth: Manages updates to the auth system.';

-- Table: supabase_migrations.seed_files
CREATE TABLE IF NOT EXISTS supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL,
    CONSTRAINT seed_files_pkey PRIMARY KEY (path)
);

-- Table: vault.secrets
-- Description: Table with encrypted `secret` column for storing sensitive information on disk.
CREATE TABLE IF NOT EXISTS vault.secrets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    description text NOT NULL DEFAULT ''::text,
    secret text NOT NULL,
    key_id uuid,
    nonce bytea DEFAULT vault._crypto_aead_det_noncegen(),
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT secrets_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE vault.secrets IS 'Table with encrypted `secret` column for storing sensitive information on disk.';


-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');

CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');

CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');

CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn', 'phone');

CREATE TYPE auth.one_time_token_type AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');

CREATE TYPE public.boq_item_type AS ENUM ('work', 'material', 'sub_work', 'sub_material');

CREATE TYPE public.client_position_status AS ENUM ('active', 'inactive', 'completed');

CREATE TYPE public.delivery_price_type AS ENUM ('included', 'not_included', 'amount');

CREATE TYPE public.tender_status AS ENUM ('draft', 'active', 'submitted', 'awarded', 'closed');

CREATE TYPE realtime.action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');

CREATE TYPE realtime.equality_op AS ENUM ('eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in');

CREATE TYPE storage.buckettype AS ENUM ('STANDARD', 'ANALYTICS');


-- ============================================
-- VIEWS
-- ============================================

-- View: extensions.pg_stat_statements
CREATE OR REPLACE VIEW extensions.pg_stat_statements AS
 SELECT userid,
    dbid,
    toplevel,
    queryid,
    query,
    plans,
    total_plan_time,
    min_plan_time,
    max_plan_time,
    mean_plan_time,
    stddev_plan_time,
    calls,
    total_exec_time,
    min_exec_time,
    max_exec_time,
    mean_exec_time,
    stddev_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_dirtied,
    shared_blks_written,
    local_blks_hit,
    local_blks_read,
    local_blks_dirtied,
    local_blks_written,
    temp_blks_read,
    temp_blks_written,
    shared_blk_read_time,
    shared_blk_write_time,
    local_blk_read_time,
    local_blk_write_time,
    temp_blk_read_time,
    temp_blk_write_time,
    wal_records,
    wal_fpi,
    wal_bytes,
    jit_functions,
    jit_generation_time,
    jit_inlining_count,
    jit_inlining_time,
    jit_optimization_count,
    jit_optimization_time,
    jit_emission_count,
    jit_emission_time,
    jit_deform_count,
    jit_deform_time,
    stats_since,
    minmax_stats_since
   FROM pg_stat_statements(true) pg_stat_statements(userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, shared_blk_read_time, shared_blk_write_time, local_blk_read_time, local_blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time, jit_deform_count, jit_deform_time, stats_since, minmax_stats_since);

-- View: extensions.pg_stat_statements_info
CREATE OR REPLACE VIEW extensions.pg_stat_statements_info AS
 SELECT dealloc,
    stats_reset
   FROM pg_stat_statements_info() pg_stat_statements_info(dealloc, stats_reset);

-- View: public.vw_cost_categories
CREATE OR REPLACE VIEW public.vw_cost_categories AS
 SELECT id,
    name,
    sort_order,
    path,
    is_active
   FROM cost_nodes
  WHERE (kind = 'group'::text);

-- View: public.vw_detail_cost_categories
CREATE OR REPLACE VIEW public.vw_detail_cost_categories AS
 SELECT id,
    parent_id AS category_id,
    name,
    unit_id,
    location_id,
    sort_order,
    path,
    is_active
   FROM cost_nodes
  WHERE (kind = 'item'::text);

-- View: public.work_material_links_detailed
CREATE OR REPLACE VIEW public.work_material_links_detailed AS
 SELECT wml.id,
    wml.client_position_id,
    wml.work_boq_item_id,
    wml.material_boq_item_id,
    wml.sub_work_boq_item_id,
    wml.sub_material_boq_item_id,
    wml.delivery_price_type,
    wml.delivery_amount,
    wml.notes,
    wml.created_at,
    wml.updated_at,
    wml.material_quantity_per_work,
    wml.usage_coefficient,
    COALESCE(w.description, sw.description) AS work_description,
    COALESCE(w.unit, sw.unit) AS work_unit,
    COALESCE(w.quantity, sw.quantity) AS work_quantity,
    COALESCE(w.unit_rate, sw.unit_rate) AS work_unit_rate,
    COALESCE(m.description, sm.description) AS material_description,
    COALESCE(m.unit, sm.unit) AS material_unit,
    COALESCE(m.quantity, sm.quantity) AS material_quantity,
    COALESCE(m.unit_rate, sm.unit_rate) AS material_unit_rate,
    COALESCE(m.consumption_coefficient, sm.consumption_coefficient) AS material_consumption_coefficient,
    COALESCE(m.conversion_coefficient, sm.conversion_coefficient) AS material_conversion_coefficient,
    COALESCE(m.delivery_price_type, sm.delivery_price_type) AS material_delivery_price_type,
    COALESCE(m.delivery_amount, sm.delivery_amount) AS material_delivery_amount,
    ((COALESCE(w.quantity, sw.quantity, (0)::numeric) * COALESCE(COALESCE(m.consumption_coefficient, sm.consumption_coefficient), (1)::numeric)) * COALESCE(COALESCE(m.conversion_coefficient, sm.conversion_coefficient), (1)::numeric)) AS total_material_needed,
    (((COALESCE(w.quantity, sw.quantity, (0)::numeric) * COALESCE(COALESCE(m.consumption_coefficient, sm.consumption_coefficient), (1)::numeric)) * COALESCE(COALESCE(m.conversion_coefficient, sm.conversion_coefficient), (1)::numeric)) * COALESCE(COALESCE(m.unit_rate, sm.unit_rate), (0)::numeric)) AS total_material_cost
   FROM ((((work_material_links wml
     LEFT JOIN boq_items w ON (((wml.work_boq_item_id = w.id) AND (w.item_type = 'work'::boq_item_type))))
     LEFT JOIN boq_items sw ON (((wml.sub_work_boq_item_id = sw.id) AND (sw.item_type = 'sub_work'::boq_item_type))))
     LEFT JOIN boq_items m ON (((wml.material_boq_item_id = m.id) AND (m.item_type = 'material'::boq_item_type))))
     LEFT JOIN boq_items sm ON (((wml.sub_material_boq_item_id = sm.id) AND (sm.item_type = 'sub_material'::boq_item_type))));

-- View: vault.decrypted_secrets
CREATE OR REPLACE VIEW vault.decrypted_secrets AS
 SELECT id,
    name,
    description,
    secret,
    convert_from(vault._crypto_aead_det_decrypt(message => decode(secret, 'base64'::text), additional => convert_to((id)::text, 'utf8'::name), key_id => (0)::bigint, context => '\x7067736f6469756d'::bytea, nonce => nonce), 'utf8'::name) AS decrypted_secret,
    key_id,
    nonce,
    created_at,
    updated_at
   FROM vault.secrets s;


-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: auth.email
-- Description: Deprecated. Use auth.jwt() -> 'email' instead.
CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$


-- Function: auth.jwt
CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$


-- Function: auth.role
-- Description: Deprecated. Use auth.jwt() -> 'role' instead.
CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$


-- Function: auth.uid
-- Description: Deprecated. Use auth.jwt() -> 'sub' instead.
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$


-- Function: extensions.armor
CREATE OR REPLACE FUNCTION extensions.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$


-- Function: extensions.armor
CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$


-- Function: extensions.crypt
CREATE OR REPLACE FUNCTION extensions.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$


-- Function: extensions.dearmor
CREATE OR REPLACE FUNCTION extensions.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$


-- Function: extensions.decrypt
CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$


-- Function: extensions.decrypt_iv
CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$


-- Function: extensions.digest
CREATE OR REPLACE FUNCTION extensions.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$


-- Function: extensions.digest
CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$


-- Function: extensions.encrypt
CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$


-- Function: extensions.encrypt_iv
CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$


-- Function: extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$


-- Function: extensions.gen_random_uuid
CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$


-- Function: extensions.gen_salt
CREATE OR REPLACE FUNCTION extensions.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$


-- Function: extensions.gen_salt
CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$


-- Function: extensions.grant_pg_cron_access
-- Description: Grants access to pg_cron
CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$function$


-- Function: extensions.grant_pg_graphql_access
-- Description: Grants access to pg_graphql
CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$function$


-- Function: extensions.grant_pg_net_access
-- Description: Grants access to pg_net
CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$function$


-- Function: extensions.hmac
CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$


-- Function: extensions.hmac
CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$


-- Function: extensions.pg_stat_statements
CREATE OR REPLACE FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone)
 RETURNS SETOF record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_1_11$function$


-- Function: extensions.pg_stat_statements_info
CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)
 RETURNS record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_info$function$


-- Function: extensions.pg_stat_statements_reset
CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0, minmax_only boolean DEFAULT false)
 RETURNS timestamp with time zone
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_reset_1_11$function$


-- Function: extensions.pgp_armor_headers
CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$


-- Function: extensions.pgp_key_id
CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$


-- Function: extensions.pgp_pub_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$


-- Function: extensions.pgp_pub_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$


-- Function: extensions.pgp_pub_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$


-- Function: extensions.pgp_pub_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$


-- Function: extensions.pgp_pub_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$


-- Function: extensions.pgp_pub_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$


-- Function: extensions.pgp_pub_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$


-- Function: extensions.pgp_pub_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$


-- Function: extensions.pgp_pub_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$


-- Function: extensions.pgp_pub_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$


-- Function: extensions.pgp_sym_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$


-- Function: extensions.pgp_sym_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$


-- Function: extensions.pgp_sym_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$


-- Function: extensions.pgp_sym_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$


-- Function: extensions.pgp_sym_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$


-- Function: extensions.pgp_sym_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$


-- Function: extensions.pgp_sym_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$


-- Function: extensions.pgp_sym_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$


-- Function: extensions.pgrst_ddl_watch
CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$


-- Function: extensions.pgrst_drop_watch
CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$


-- Function: extensions.set_graphql_placeholder
-- Description: Reintroduces placeholder function for graphql_public.graphql
CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$function$


-- Function: extensions.uuid_generate_v1
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$


-- Function: extensions.uuid_generate_v1mc
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$


-- Function: extensions.uuid_generate_v3
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$


-- Function: extensions.uuid_generate_v4
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$


-- Function: extensions.uuid_generate_v5
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$


-- Function: extensions.uuid_nil
CREATE OR REPLACE FUNCTION extensions.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$


-- Function: extensions.uuid_ns_dns
CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$


-- Function: extensions.uuid_ns_oid
CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$


-- Function: extensions.uuid_ns_url
CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$


-- Function: extensions.uuid_ns_x500
CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$


-- Function: graphql._internal_resolve
CREATE OR REPLACE FUNCTION graphql._internal_resolve(query text, variables jsonb DEFAULT '{}'::jsonb, "operationName" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE c
AS '$libdir/pg_graphql', $function$resolve_wrapper$function$


-- Function: graphql.comment_directive
CREATE OR REPLACE FUNCTION graphql.comment_directive(comment_ text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
    /*
    comment on column public.account.name is '@graphql.name: myField'
    */
    select
        coalesce(
            (
                regexp_match(
                    comment_,
                    '@graphql\((.+)\)'
                )
            )[1]::jsonb,
            jsonb_build_object()
        )
$function$


-- Function: graphql.exception
CREATE OR REPLACE FUNCTION graphql.exception(message text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
begin
    raise exception using errcode='22000', message=message;
end;
$function$


-- Function: graphql.get_schema_version
CREATE OR REPLACE FUNCTION graphql.get_schema_version()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    select last_value from graphql.seq_schema_version;
$function$


-- Function: graphql.increment_schema_version
CREATE OR REPLACE FUNCTION graphql.increment_schema_version()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    perform pg_catalog.nextval('graphql.seq_schema_version');
end;
$function$


-- Function: graphql.resolve
CREATE OR REPLACE FUNCTION graphql.resolve(query text, variables jsonb DEFAULT '{}'::jsonb, "operationName" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    res jsonb;
    message_text text;
begin
  begin
    select graphql._internal_resolve("query" := "query",
                                     "variables" := "variables",
                                     "operationName" := "operationName",
                                     "extensions" := "extensions") into res;
    return res;
  exception
    when others then
    get stacked diagnostics message_text = message_text;
    return
    jsonb_build_object('data', null,
                       'errors', jsonb_build_array(jsonb_build_object('message', message_text)));
  end;
end;
$function$


-- Function: graphql_public.graphql
CREATE OR REPLACE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE sql
AS $function$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $function$


-- Function: pgbouncer.get_auth
CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$function$


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


-- Function: public.bulk_upsert_category_location_mappings
-- Description: Массовая вставка/обновление связей категория-локация
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


-- Function: public.calculate_boq_item_total
-- Description: Вспомогательная функция для расчета total_amount с учетом доставки
CREATE OR REPLACE FUNCTION public.calculate_boq_item_total(p_item_type text, p_quantity numeric, p_unit_rate numeric, p_delivery_price_type delivery_price_type, p_delivery_amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    IF p_item_type = 'material' THEN
        IF p_delivery_price_type = 'amount' AND p_delivery_amount IS NOT NULL THEN
            RETURN COALESCE(p_quantity, 1) * (COALESCE(p_unit_rate, 0) + COALESCE(p_delivery_amount, 0));
        ELSE
            RETURN COALESCE(p_quantity, 1) * COALESCE(p_unit_rate, 0);
        END IF;
    ELSE
        RETURN COALESCE(p_quantity, 0) * COALESCE(p_unit_rate, 0);
    END IF;
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


-- Function: public.clear_all_category_location_mappings
-- Description: Очищает все связи перед новым импортом
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
-- Description: Получает все локации, связанные с детальной
  категорией
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
-- Description: Возвращает статистику по связям
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
-- Description: Alias for get_next_position_number - returns next available position number
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
-- Description: Returns the next available position number for a tender
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
-- Description: Returns next available sub_number for BOQ items in a client position with race condition handling
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
-- Description: Импорт одной строки данных категорий затрат
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
CREATE OR REPLACE FUNCTION public.index(ltree, ltree, integer)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_index$function$


-- Function: public.index
CREATE OR REPLACE FUNCTION public.index(ltree, ltree)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$ltree_index$function$


-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree)
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
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$


-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree)
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


-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree, ltree)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$lca$function$


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


-- Function: public.recalculate_client_position_totals
CREATE OR REPLACE FUNCTION public.recalculate_client_position_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
    
    -- Recalculate material costs (including sub_material)
    SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
    FROM public.boq_items 
    WHERE client_position_id = position_id 
    AND item_type IN ('material', 'sub_material');
    
    -- Recalculate work costs (including sub_work)
    SELECT COALESCE(SUM(total_amount), 0) INTO works_total
    FROM public.boq_items 
    WHERE client_position_id = position_id 
    AND item_type IN ('work', 'sub_work');
    
    -- Update client position totals
    UPDATE public.client_positions 
    SET 
        total_materials_cost = materials_total,
        total_works_cost = works_total,
        updated_at = NOW()
    WHERE id = position_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$


-- Function: public.renumber_client_positions
-- Description: Renumbers all positions in a tender sequentially
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
-- Description: Moves or copies a material link between works without deleting the original link
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
-- Description: Resolves conflicts when moving materials between works (sum or replace strategy)
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


-- Function: public.safe_upsert_cost_category
-- Description: Безопасное создание или обновление категории затрат
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
-- Description: Безопасное создание или обновление локации
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


-- Function: public.schema_cache_purge
CREATE OR REPLACE FUNCTION public.schema_cache_purge()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  notify pgrst, 'reload schema';
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
CREATE OR REPLACE FUNCTION public.subpath(ltree, integer)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$subpath$function$


-- Function: public.subpath
CREATE OR REPLACE FUNCTION public.subpath(ltree, integer, integer)
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


-- Function: public.text2ltree
CREATE OR REPLACE FUNCTION public.text2ltree(text)
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$text2ltree$function$


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
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $function$


-- Function: public.upsert_cost_category
-- Description: Безопасное создание или обновление категории затрат
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
-- Description: Безопасное создание или обновление детальной категории
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
-- Description: Безопасное создание или обновление локации
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


-- Function: realtime.apply_rls
CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))
 RETURNS SETOF realtime.wal_rls
 LANGUAGE plpgsql
AS $function$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$function$


-- Function: realtime.broadcast_changes
CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$function$


-- Function: realtime.build_prepared_statement_sql
CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])
 RETURNS text
 LANGUAGE sql
AS $function$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $function$


-- Function: realtime.cast
CREATE OR REPLACE FUNCTION realtime."cast"(val text, type_ regtype)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $function$


-- Function: realtime.check_equality_op
CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $function$


-- Function: realtime.is_visible_through_filters
CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $function$


-- Function: realtime.list_changes
CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)
 RETURNS SETOF realtime.wal_rls
 LANGUAGE sql
 SET log_min_messages TO 'fatal'
AS $function$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $function$


-- Function: realtime.quote_wal2json
CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $function$


-- Function: realtime.send
CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$function$


-- Function: realtime.subscription_check_filters
CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $function$


-- Function: realtime.to_regrole
CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)
 RETURNS regrole
 LANGUAGE sql
 IMMUTABLE
AS $function$ select role_name::regrole $function$


-- Function: realtime.topic
CREATE OR REPLACE FUNCTION realtime.topic()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select nullif(current_setting('realtime.topic', true), '')::text;
$function$


-- Function: storage.add_prefixes
CREATE OR REPLACE FUNCTION storage.add_prefixes(_bucket_id text, _name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$function$


-- Function: storage.can_insert_object
CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$


-- Function: storage.delete_prefix
CREATE OR REPLACE FUNCTION storage.delete_prefix(_bucket_id text, _name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$function$


-- Function: storage.delete_prefix_hierarchy_trigger
CREATE OR REPLACE FUNCTION storage.delete_prefix_hierarchy_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$function$


-- Function: storage.enforce_bucket_name_length
CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$


-- Function: storage.extension
CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$


-- Function: storage.filename
CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$


-- Function: storage.foldername
CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$


-- Function: storage.get_level
CREATE OR REPLACE FUNCTION storage.get_level(name text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT array_length(string_to_array("name", '/'), 1);
$function$


-- Function: storage.get_prefix
CREATE OR REPLACE FUNCTION storage.get_prefix(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$function$


-- Function: storage.get_prefixes
CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$function$


-- Function: storage.get_size_by_bucket
CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$


-- Function: storage.list_multipart_uploads_with_delimiter
CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$


-- Function: storage.list_objects_with_delimiter
CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$function$


-- Function: storage.objects_insert_prefix_trigger
CREATE OR REPLACE FUNCTION storage.objects_insert_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$


-- Function: storage.objects_update_prefix_trigger
CREATE OR REPLACE FUNCTION storage.objects_update_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$


-- Function: storage.operation
CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$


-- Function: storage.prefixes_insert_trigger
CREATE OR REPLACE FUNCTION storage.prefixes_insert_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$function$


-- Function: storage.search
CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
AS $function$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$function$


-- Function: storage.search_legacy_v1
CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$


-- Function: storage.search_v1_optimised
CREATE OR REPLACE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$


-- Function: storage.search_v2
CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$function$


-- Function: storage.update_updated_at_column
CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$


-- Function: vault._crypto_aead_det_decrypt
CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$


-- Function: vault._crypto_aead_det_encrypt
CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$


-- Function: vault._crypto_aead_det_noncegen
CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$


-- Function: vault.create_secret
CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  rec record;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (
    new_secret,
    new_name,
    new_description
  )
  RETURNING * INTO rec;
  UPDATE vault.secrets s
  SET secret = encode(vault._crypto_aead_det_encrypt(
    message := convert_to(rec.secret, 'utf8'),
    additional := convert_to(s.id::text, 'utf8'),
    key_id := 0,
    context := 'pgsodium'::bytea,
    nonce := rec.nonce
  ), 'base64')
  WHERE id = rec.id;
  RETURN rec.id;
END
$function$


-- Function: vault.update_secret
CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);
BEGIN
  UPDATE vault.secrets s
  SET
    secret = CASE WHEN new_secret IS NULL THEN s.secret
                  ELSE encode(vault._crypto_aead_det_encrypt(
                    message := convert_to(new_secret, 'utf8'),
                    additional := convert_to(s.id::text, 'utf8'),
                    key_id := 0,
                    context := 'pgsodium'::bytea,
                    nonce := s.nonce
                  ), 'base64') END,
    name = coalesce(new_name, s.name),
    description = coalesce(new_description, s.description),
    updated_at = now()
  WHERE s.id = secret_id;
END
$function$



-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: recalculate_totals_on_boq_change on public.boq_items
CREATE TRIGGER recalculate_totals_on_boq_change AFTER INSERT OR DELETE OR UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION recalculate_client_position_totals()

-- Trigger: trigger_check_boq_delivery on public.boq_items
CREATE TRIGGER trigger_check_boq_delivery BEFORE INSERT OR UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION check_boq_item_delivery_consistency()

-- Trigger: trigger_check_delivery_consistency_boq on public.boq_items
CREATE TRIGGER trigger_check_delivery_consistency_boq BEFORE INSERT OR UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION check_delivery_consistency_boq()

-- Trigger: auto_assign_position_number_trigger on public.client_positions
CREATE TRIGGER auto_assign_position_number_trigger BEFORE INSERT ON public.client_positions FOR EACH ROW EXECUTE FUNCTION auto_assign_position_number()

-- Trigger: tr_cost_nodes_autosort on public.cost_nodes
CREATE TRIGGER tr_cost_nodes_autosort BEFORE INSERT OR UPDATE OF parent_id, sort_order ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_autosort()

-- Trigger: tr_cost_nodes_repath on public.cost_nodes
CREATE TRIGGER tr_cost_nodes_repath AFTER UPDATE OF parent_id, sort_order ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_repath_descendants()

-- Trigger: tr_cost_nodes_set_path on public.cost_nodes
CREATE TRIGGER tr_cost_nodes_set_path BEFORE INSERT OR UPDATE OF parent_id, sort_order ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_before_ins_upd()

-- Trigger: tr_cost_nodes_ts on public.cost_nodes
CREATE TRIGGER tr_cost_nodes_ts BEFORE INSERT OR UPDATE ON public.cost_nodes FOR EACH ROW EXECUTE FUNCTION cost_nodes_set_timestamps()

-- Trigger: tr_tender_items_defaults on public.tender_items
CREATE TRIGGER tr_tender_items_defaults BEFORE INSERT ON public.tender_items FOR EACH ROW EXECUTE FUNCTION tender_items_defaults()

-- Trigger: check_work_material_types_trigger on public.work_material_links
CREATE TRIGGER check_work_material_types_trigger BEFORE INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION check_work_material_types()

-- Trigger: trigger_check_delivery_price on public.work_material_links
CREATE TRIGGER trigger_check_delivery_price BEFORE INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION check_delivery_price_consistency()

-- Trigger: tr_check_filters on realtime.subscription
CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()

-- Trigger: enforce_bucket_name_length_trigger on storage.buckets
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length()

-- Trigger: objects_delete_delete_prefix on storage.objects
CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()

-- Trigger: objects_insert_create_prefix on storage.objects
CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger()

-- Trigger: objects_update_create_prefix on storage.objects
CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger()

-- Trigger: update_objects_updated_at on storage.objects
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()

-- Trigger: prefixes_create_hierarchy on storage.prefixes
CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger()

-- Trigger: prefixes_delete_hierarchy on storage.prefixes
CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()


-- ============================================
-- INDEXES
-- ============================================

-- Index on auth.audit_log_entries
CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);

-- Index on auth.flow_state
CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);

-- Index on auth.flow_state
CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);

-- Index on auth.flow_state
CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);

-- Index on auth.identities
CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);

-- Index on auth.identities
CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider);

-- Index on auth.identities
CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);

-- Index on auth.mfa_amr_claims
CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id);

-- Index on auth.mfa_challenges
CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);

-- Index on auth.mfa_factors
CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);

-- Index on auth.mfa_factors
CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at);

-- Index on auth.mfa_factors
CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);

-- Index on auth.mfa_factors
CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);

-- Index on auth.mfa_factors
CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);

-- Index on auth.one_time_tokens
CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);

-- Index on auth.one_time_tokens
CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);

-- Index on auth.one_time_tokens
CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);

-- Index on auth.refresh_tokens
CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);

-- Index on auth.saml_providers
CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id);

-- Index on auth.saml_providers
CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);

-- Index on auth.saml_relay_states
CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);

-- Index on auth.saml_relay_states
CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);

-- Index on auth.saml_relay_states
CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);

-- Index on auth.sessions
CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);

-- Index on auth.sessions
CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);

-- Index on auth.sessions
CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);

-- Index on auth.sso_domains
CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));

-- Index on auth.sso_domains
CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);

-- Index on auth.sso_providers
CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));

-- Index on auth.sso_providers
CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);

-- Index on auth.users
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);

-- Index on auth.users
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));

-- Index on auth.users
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);

-- Index on auth.users
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);

-- Index on auth.users
CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_client_position_id ON public.boq_items USING btree (client_position_id);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_cost_node_id ON public.boq_items USING btree (cost_node_id);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_delivery_price_type ON public.boq_items USING btree (delivery_price_type) WHERE (item_type = 'material'::boq_item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_delivery_type ON public.boq_items USING btree (delivery_price_type) WHERE (item_type = 'material'::boq_item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_item_type ON public.boq_items USING btree (item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_material_delivery ON public.boq_items USING btree (item_type, delivery_price_type, delivery_amount) WHERE (item_type = 'material'::boq_item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_material_id ON public.boq_items USING btree (material_id) WHERE (material_id IS NOT NULL);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_position_sub ON public.boq_items USING btree (client_position_id, sub_number);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_tender_id ON public.boq_items USING btree (tender_id);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_tender_id_item_type ON public.boq_items USING btree (tender_id, item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_total_amount ON public.boq_items USING btree (total_amount) WHERE (total_amount > (0)::numeric);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_work_id ON public.boq_items USING btree (work_id) WHERE (work_id IS NOT NULL);

-- Index on public.boq_items
CREATE UNIQUE INDEX uq_boq_position_sub_number ON public.boq_items USING btree (client_position_id, sub_number);

-- Index on public.boq_items
CREATE UNIQUE INDEX uq_boq_tender_item_number ON public.boq_items USING btree (tender_id, item_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_item_no ON public.client_positions USING btree (item_no);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_number ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_tender_id ON public.client_positions USING btree (tender_id);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_tender_id_position_number ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_tender_position ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_work_name ON public.client_positions USING gin (to_tsvector('russian'::regconfig, work_name));

-- Index on public.client_positions
CREATE UNIQUE INDEX uq_client_positions_position_tender ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.cost_categories
CREATE UNIQUE INDEX cost_categories_code_idx ON public.cost_categories USING btree (code);

-- Index on public.cost_categories
CREATE INDEX idx_cost_categories_name ON public.cost_categories USING btree (name);

-- Index on public.cost_nodes
CREATE INDEX ix_cost_nodes_parent_sort ON public.cost_nodes USING btree (parent_id, sort_order);

-- Index on public.cost_nodes
CREATE INDEX ix_cost_nodes_path_gist ON public.cost_nodes USING gist (path);

-- Index on public.cost_nodes
CREATE INDEX ix_cost_nodes_search_gin ON public.cost_nodes USING gin (to_tsvector('russian'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(code, ''::text))));

-- Index on public.cost_nodes
CREATE UNIQUE INDEX uq_cost_nodes_sibling ON public.cost_nodes USING btree (parent_id, name);

-- Index on public.detail_cost_categories
CREATE INDEX detail_cost_categories_cost_category_id_idx ON public.detail_cost_categories USING btree (cost_category_id);

-- Index on public.detail_cost_categories
CREATE INDEX detail_cost_categories_location_id_idx ON public.detail_cost_categories USING btree (location_id);

-- Index on public.detail_cost_categories
CREATE INDEX idx_detail_cost_categories_category_id ON public.detail_cost_categories USING btree (cost_category_id);

-- Index on public.detail_cost_categories
CREATE INDEX idx_detail_cost_categories_location_id ON public.detail_cost_categories USING btree (location_id);

-- Index on public.detail_cost_categories
CREATE INDEX idx_detail_cost_categories_name ON public.detail_cost_categories USING btree (name);

-- Index on public.location
CREATE INDEX idx_location_city ON public.location USING btree (city);

-- Index on public.location
CREATE INDEX idx_location_country ON public.location USING btree (country);

-- Index on public.location
CREATE UNIQUE INDEX ix_location_code_unique ON public.location USING btree (code);

-- Index on public.location
CREATE UNIQUE INDEX location_city_idx ON public.location USING btree (city);

-- Index on public.materials_library
CREATE INDEX idx_materials_library_category ON public.materials_library USING btree (category);

-- Index on public.materials_library
CREATE INDEX idx_materials_library_name ON public.materials_library USING btree (name);

-- Index on public.tender_items
CREATE INDEX ix_tender_items_node ON public.tender_items USING btree (node_id);

-- Index on public.tender_items
CREATE INDEX ix_tender_items_tender ON public.tender_items USING btree (tender_id);

-- Index on public.tenders
CREATE INDEX idx_tenders_created_at ON public.tenders USING btree (created_at DESC);

-- Index on public.tenders
CREATE INDEX idx_tenders_tender_number ON public.tenders USING btree (tender_number);

-- Index on public.tenders
CREATE UNIQUE INDEX tenders_tender_number_key ON public.tenders USING btree (tender_number);

-- Index on public.units
CREATE UNIQUE INDEX units_code_key ON public.units USING btree (code);

-- Index on public.work_material_links
CREATE INDEX idx_wml_material ON public.work_material_links USING btree (material_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_wml_position ON public.work_material_links USING btree (client_position_id);

-- Index on public.work_material_links
CREATE INDEX idx_wml_work ON public.work_material_links USING btree (work_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_material ON public.work_material_links USING btree (material_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_position ON public.work_material_links USING btree (client_position_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_sub_material ON public.work_material_links USING btree (sub_material_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_sub_work ON public.work_material_links USING btree (sub_work_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_work ON public.work_material_links USING btree (work_boq_item_id);

-- Index on public.work_material_links
CREATE UNIQUE INDEX uq_work_material_pair ON public.work_material_links USING btree (work_boq_item_id, material_boq_item_id);

-- Index on public.works_library
CREATE INDEX idx_works_library_name ON public.works_library USING btree (name);

-- Index on realtime.subscription
CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);

-- Index on realtime.subscription
CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id);

-- Index on realtime.subscription
CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);

-- Index on storage.buckets
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);

-- Index on storage.migrations
CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name);

-- Index on storage.objects
CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);

-- Index on storage.objects
CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);

-- Index on storage.objects
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");

-- Index on storage.objects
CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);

-- Index on storage.objects
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);

-- Index on storage.objects
CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");

-- Index on storage.prefixes
CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);

-- Index on storage.s3_multipart_uploads
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);

-- Index on vault.secrets
CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL);


-- ============================================
-- ROLES AND PRIVILEGES
-- ============================================

-- Role: anon
CREATE ROLE anon;
-- Members of role anon:
-- - authenticator
-- - postgres (WITH ADMIN OPTION)
-- Database privileges for anon:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO anon;
-- Schema privileges for anon:
-- GRANT USAGE ON SCHEMA auth TO anon;
-- GRANT USAGE ON SCHEMA extensions TO anon;
-- GRANT USAGE ON SCHEMA graphql TO anon;
-- GRANT USAGE ON SCHEMA graphql_public TO anon;
-- GRANT USAGE ON SCHEMA public TO anon;
-- GRANT USAGE ON SCHEMA realtime TO anon;
-- GRANT USAGE ON SCHEMA storage TO anon;

-- Role: authenticated
CREATE ROLE authenticated;
-- Members of role authenticated:
-- - authenticator
-- - postgres (WITH ADMIN OPTION)
-- Database privileges for authenticated:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO authenticated;
-- Schema privileges for authenticated:
-- GRANT USAGE ON SCHEMA auth TO authenticated;
-- GRANT USAGE ON SCHEMA extensions TO authenticated;
-- GRANT USAGE ON SCHEMA graphql TO authenticated;
-- GRANT USAGE ON SCHEMA graphql_public TO authenticated;
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT USAGE ON SCHEMA realtime TO authenticated;
-- GRANT USAGE ON SCHEMA storage TO authenticated;

-- Role: authenticator
CREATE ROLE authenticator WITH LOGIN NOINHERIT;
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
-- Members of role authenticator:
-- - postgres (WITH ADMIN OPTION)
-- - supabase_storage_admin
-- Database privileges for authenticator:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO authenticator;
-- Schema privileges for authenticator:
-- GRANT USAGE ON SCHEMA public TO authenticator;

-- Role: dashboard_user
CREATE ROLE dashboard_user WITH CREATEDB CREATEROLE REPLICATION;
-- Database privileges for dashboard_user:
-- GRANT CONNECT, CREATE, TEMP ON DATABASE postgres TO dashboard_user;
-- Schema privileges for dashboard_user:
-- GRANT CREATE, USAGE ON SCHEMA auth TO dashboard_user;
-- GRANT CREATE, USAGE ON SCHEMA extensions TO dashboard_user;
-- GRANT USAGE ON SCHEMA public TO dashboard_user;
-- GRANT CREATE, USAGE ON SCHEMA storage TO dashboard_user;

-- Role: postgres
CREATE ROLE postgres WITH CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS;
GRANT anon TO postgres WITH ADMIN OPTION;
GRANT authenticated TO postgres WITH ADMIN OPTION;
GRANT authenticator TO postgres WITH ADMIN OPTION;
GRANT pg_create_subscription TO postgres;
GRANT pg_monitor TO postgres WITH ADMIN OPTION;
GRANT pg_read_all_data TO postgres WITH ADMIN OPTION;
GRANT pg_signal_backend TO postgres WITH ADMIN OPTION;
GRANT service_role TO postgres WITH ADMIN OPTION;
GRANT supabase_realtime_admin TO postgres;
-- Database privileges for postgres:
-- GRANT CONNECT, CREATE, TEMP ON DATABASE postgres TO postgres;
-- Schema privileges for postgres:
-- GRANT USAGE ON SCHEMA auth TO postgres;
-- GRANT CREATE, USAGE ON SCHEMA extensions TO postgres;
-- GRANT USAGE ON SCHEMA graphql TO postgres;
-- GRANT USAGE ON SCHEMA graphql_public TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_0 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_1 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_10 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_11 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_12 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_13 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_14 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_15 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_16 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_17 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_18 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_2 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_20 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_21 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_22 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_23 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_24 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_25 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_26 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_27 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_28 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_29 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_3 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_30 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_31 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_32 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_33 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_34 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_35 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_36 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_38 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_39 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_4 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_40 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_41 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_42 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_43 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_44 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_45 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_46 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_47 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_48 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_49 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_5 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_50 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_51 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_52 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_53 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_54 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_55 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_56 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_57 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_58 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_59 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_7 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_8 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_9 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_0 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_1 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_10 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_11 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_12 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_13 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_14 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_15 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_16 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_17 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_18 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_2 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_20 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_21 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_22 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_23 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_24 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_25 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_26 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_27 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_28 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_29 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_3 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_30 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_31 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_32 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_33 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_34 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_35 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_36 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_38 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_39 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_4 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_40 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_41 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_42 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_43 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_44 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_45 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_46 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_47 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_48 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_49 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_5 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_50 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_51 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_52 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_53 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_54 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_55 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_56 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_57 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_58 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_59 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_7 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_8 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_9 TO postgres;
-- GRANT USAGE ON SCHEMA pgbouncer TO postgres;
-- GRANT CREATE, USAGE ON SCHEMA public TO postgres;
-- GRANT CREATE, USAGE ON SCHEMA realtime TO postgres;
-- GRANT USAGE ON SCHEMA storage TO postgres;
-- GRANT CREATE, USAGE ON SCHEMA supabase_migrations TO postgres;
-- GRANT USAGE ON SCHEMA vault TO postgres;

-- Role: service_role
CREATE ROLE service_role WITH BYPASSRLS;
-- Members of role service_role:
-- - authenticator
-- - postgres (WITH ADMIN OPTION)
-- Database privileges for service_role:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO service_role;
-- Schema privileges for service_role:
-- GRANT USAGE ON SCHEMA auth TO service_role;
-- GRANT USAGE ON SCHEMA extensions TO service_role;
-- GRANT USAGE ON SCHEMA graphql TO service_role;
-- GRANT USAGE ON SCHEMA graphql_public TO service_role;
-- GRANT USAGE ON SCHEMA public TO service_role;
-- GRANT USAGE ON SCHEMA realtime TO service_role;
-- GRANT USAGE ON SCHEMA storage TO service_role;
-- GRANT USAGE ON SCHEMA vault TO service_role;

-- Role: supabase_admin
CREATE ROLE supabase_admin WITH SUPERUSER CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS;
-- Database privileges for supabase_admin:
-- GRANT CONNECT, CREATE, TEMP ON DATABASE postgres TO supabase_admin;
-- Schema privileges for supabase_admin:
-- GRANT CREATE, USAGE ON SCHEMA auth TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA extensions TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA graphql TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA graphql_public TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_0 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_1 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_10 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_11 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_12 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_13 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_14 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_15 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_16 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_17 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_18 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_2 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_20 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_21 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_22 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_23 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_24 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_25 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_26 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_27 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_28 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_29 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_3 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_30 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_31 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_32 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_33 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_34 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_35 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_36 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_38 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_39 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_4 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_40 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_41 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_42 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_43 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_44 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_45 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_46 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_47 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_48 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_49 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_5 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_50 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_51 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_52 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_53 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_54 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_55 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_56 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_57 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_58 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_59 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_7 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_8 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_9 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_0 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_1 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_10 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_11 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_12 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_13 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_14 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_15 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_16 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_17 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_18 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_2 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_20 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_21 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_22 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_23 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_24 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_25 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_26 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_27 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_28 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_29 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_3 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_30 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_31 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_32 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_33 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_34 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_35 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_36 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_38 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_39 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_4 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_40 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_41 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_42 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_43 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_44 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_45 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_46 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_47 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_48 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_49 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_5 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_50 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_51 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_52 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_53 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_54 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_55 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_56 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_57 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_58 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_59 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_7 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_8 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_9 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pgbouncer TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA public TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA realtime TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA storage TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA supabase_migrations TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA vault TO supabase_admin;

-- Role: supabase_auth_admin
CREATE ROLE supabase_auth_admin WITH CREATEROLE LOGIN NOINHERIT;
-- Database privileges for supabase_auth_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_auth_admin;
-- Schema privileges for supabase_auth_admin:
-- GRANT CREATE, USAGE ON SCHEMA auth TO supabase_auth_admin;
-- GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Role: supabase_read_only_user
CREATE ROLE supabase_read_only_user WITH LOGIN BYPASSRLS;
GRANT pg_read_all_data TO supabase_read_only_user;
-- Database privileges for supabase_read_only_user:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_read_only_user;
-- Schema privileges for supabase_read_only_user:
-- GRANT USAGE ON SCHEMA auth TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA extensions TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA graphql TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA graphql_public TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_0 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_1 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_10 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_11 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_12 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_13 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_14 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_15 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_16 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_17 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_18 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_2 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_20 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_21 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_22 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_23 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_24 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_25 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_26 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_27 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_28 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_29 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_3 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_30 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_31 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_32 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_33 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_34 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_35 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_36 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_38 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_39 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_4 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_40 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_41 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_42 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_43 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_44 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_45 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_46 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_47 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_48 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_49 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_5 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_50 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_51 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_52 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_53 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_54 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_55 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_56 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_57 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_58 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_59 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_7 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_8 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_9 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_0 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_1 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_10 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_11 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_12 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_13 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_14 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_15 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_16 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_17 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_18 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_2 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_20 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_21 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_22 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_23 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_24 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_25 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_26 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_27 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_28 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_29 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_3 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_30 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_31 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_32 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_33 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_34 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_35 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_36 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_38 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_39 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_4 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_40 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_41 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_42 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_43 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_44 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_45 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_46 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_47 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_48 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_49 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_5 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_50 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_51 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_52 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_53 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_54 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_55 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_56 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_57 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_58 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_59 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_7 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_8 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_9 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pgbouncer TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA public TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA realtime TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA storage TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA supabase_migrations TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA vault TO supabase_read_only_user;

-- Role: supabase_realtime_admin
CREATE ROLE supabase_realtime_admin WITH NOINHERIT;
-- Members of role supabase_realtime_admin:
-- - postgres
-- Database privileges for supabase_realtime_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_realtime_admin;
-- Schema privileges for supabase_realtime_admin:
-- GRANT USAGE ON SCHEMA public TO supabase_realtime_admin;
-- GRANT CREATE, USAGE ON SCHEMA realtime TO supabase_realtime_admin;

-- Role: supabase_replication_admin
CREATE ROLE supabase_replication_admin WITH LOGIN REPLICATION;
-- Database privileges for supabase_replication_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_replication_admin;
-- Schema privileges for supabase_replication_admin:
-- GRANT USAGE ON SCHEMA public TO supabase_replication_admin;

-- Role: supabase_storage_admin
CREATE ROLE supabase_storage_admin WITH CREATEROLE LOGIN NOINHERIT;
GRANT authenticator TO supabase_storage_admin;
-- Database privileges for supabase_storage_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_storage_admin;
-- Schema privileges for supabase_storage_admin:
-- GRANT USAGE ON SCHEMA public TO supabase_storage_admin;
-- GRANT CREATE, USAGE ON SCHEMA storage TO supabase_storage_admin;
