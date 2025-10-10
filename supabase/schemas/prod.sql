-- Database Schema SQL Export
-- Generated: 2025-10-08T14:26:33.135821
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
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider),
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id),
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
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (authentication_method),
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id),
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

-- Table: auth.oauth_clients
CREATE TABLE IF NOT EXISTS auth.oauth_clients (
    id uuid NOT NULL,
    client_id text NOT NULL,
    client_secret_hash text NOT NULL,
    registration_type USER-DEFINED NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id),
    CONSTRAINT oauth_clients_pkey PRIMARY KEY (id)
);

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
-- Description: Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version character varying(255) NOT NULL
);
COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';

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

-- Table: public.boq_item_version_mappings
-- Description: Маппинг BOQ items между версиями тендеров для корректного переноса work_material_links
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
    CONSTRAINT boq_item_version_mappings_new_boq_item_id_fkey FOREIGN KEY (new_boq_item_id) REFERENCES None.None(None),
    CONSTRAINT boq_item_version_mappings_new_tender_id_fkey FOREIGN KEY (new_tender_id) REFERENCES None.None(None),
    CONSTRAINT boq_item_version_mappings_old_boq_item_id_fkey FOREIGN KEY (old_boq_item_id) REFERENCES None.None(None),
    CONSTRAINT boq_item_version_mappings_old_tender_id_fkey FOREIGN KEY (old_tender_id) REFERENCES None.None(None),
    CONSTRAINT boq_item_version_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT boq_item_version_mappings_position_mapping_id_fkey FOREIGN KEY (position_mapping_id) REFERENCES None.None(None),
    CONSTRAINT uq_boq_mapping UNIQUE (new_tender_id),
    CONSTRAINT uq_boq_mapping UNIQUE (old_boq_item_id)
);
COMMENT ON TABLE public.boq_item_version_mappings IS 'Маппинг BOQ items между версиями тендеров для корректного переноса work_material_links';

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
    quantity numeric(15,6) NOT NULL,
    unit_rate numeric(15,4) NOT NULL,
    material_id uuid,
    work_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    imported_at timestamp with time zone,
    consumption_coefficient numeric(15,8),
    conversion_coefficient numeric(15,8),
    delivery_price_type USER-DEFINED DEFAULT 'included'::delivery_price_type,
    delivery_amount numeric(12,2) DEFAULT 0,
    base_quantity numeric(12,4),
    detail_cost_category_id uuid,
    total_amount numeric(15,2),
    commercial_cost numeric(15,2) NOT NULL DEFAULT 0,
    commercial_markup_coefficient numeric(15,8) NOT NULL DEFAULT 1.0,
    material_type USER-DEFINED DEFAULT 'main'::material_type,
    currency_type character varying(3) DEFAULT 'RUB'::character varying,
    currency_rate numeric,
    quote_link text,
    note text,
    CONSTRAINT boq_items_client_position_id_fkey FOREIGN KEY (client_position_id) REFERENCES None.None(None),
    CONSTRAINT boq_items_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES None.None(None),
    CONSTRAINT boq_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES None.None(None),
    CONSTRAINT boq_items_pkey PRIMARY KEY (id),
    CONSTRAINT boq_items_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None),
    CONSTRAINT boq_items_work_id_fkey FOREIGN KEY (work_id) REFERENCES None.None(None),
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

  основе unit_rate + markup)';
COMMENT ON COLUMN public.boq_items.commercial_markup_coefficient IS 'Коэффициент коммерческой наценки (precision: 15,8 для точных расчетов)';
COMMENT ON COLUMN public.boq_items.material_type IS 'Тип материала: основной (main) или вспомогательный      

  (auxiliary). Основные материалы связаны с работами, вспомогательные - независимые';
COMMENT ON COLUMN public.boq_items.currency_type IS 'Тип валюты: RUB (рубль), USD (доллар), EUR (евро), CNY (юань)';
COMMENT ON COLUMN public.boq_items.currency_rate IS 'Курс валюты к рублю на момент создания/изменения (NULL для рублей)';
COMMENT ON COLUMN public.boq_items.quote_link IS 'Ссылка на коммерческое предложение (URL или текст)';
COMMENT ON COLUMN public.boq_items.note IS 'Примечание к элементу BOQ';

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
    manual_note text,
    position_type character varying(50) DEFAULT 'executable'::character varying,
    hierarchy_level integer(32) DEFAULT 6,
    total_commercial_materials_cost numeric(15,2) DEFAULT 0,
    total_commercial_works_cost numeric(15,2) DEFAULT 0,
    is_additional boolean DEFAULT false,
    parent_position_id uuid,
    CONSTRAINT client_positions_parent_position_id_fkey FOREIGN KEY (parent_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT client_positions_pkey PRIMARY KEY (id),
    CONSTRAINT client_positions_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None),
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
-- Description: Агрегированные коммерческие стоимости по категориям затрат      

  для каждого тендера
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
    CONSTRAINT commercial_costs_by_category_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES None.None(None),
    CONSTRAINT commercial_costs_by_category_pkey PRIMARY KEY (id),
    CONSTRAINT commercial_costs_by_category_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None),
    CONSTRAINT unique_tender_category UNIQUE (detail_cost_category_id),
    CONSTRAINT unique_tender_category UNIQUE (tender_id)
);
COMMENT ON TABLE public.commercial_costs_by_category IS 'Агрегированные коммерческие стоимости по категориям затрат      

  для каждого тендера';
COMMENT ON COLUMN public.commercial_costs_by_category.direct_materials IS 'Прямые затраты на материалы (из BOQ)';
COMMENT ON COLUMN public.commercial_costs_by_category.direct_works IS 'Прямые затраты на работы (из BOQ)';
COMMENT ON COLUMN public.commercial_costs_by_category.commercial_materials IS 'Коммерческие затраты на материалы (с      

  наценками)';
COMMENT ON COLUMN public.commercial_costs_by_category.commercial_works IS 'Коммерческие затраты на работы (с

  наценками)';
COMMENT ON COLUMN public.commercial_costs_by_category.markup_coefficient_materials IS 'Коэффициент наценки на

  материалы';

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
    CONSTRAINT cost_nodes_location_id_fkey FOREIGN KEY (location_id) REFERENCES None.None(None),
    CONSTRAINT cost_nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.cost_nodes(id),
    CONSTRAINT cost_nodes_pkey PRIMARY KEY (id),
    CONSTRAINT cost_nodes_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES None.None(None),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (name),
    CONSTRAINT uq_cost_nodes_sibling UNIQUE (parent_id)
);

-- Table: public.cost_redistribution_details
-- Description: Детализация изменений коммерческих стоимостей для каждого BOQ элемента
CREATE TABLE IF NOT EXISTS public.cost_redistribution_details (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    redistribution_id uuid NOT NULL,
    boq_item_id uuid NOT NULL,
    original_commercial_cost numeric(15,2) NOT NULL,
    redistributed_commercial_cost numeric(15,2) NOT NULL,
    adjustment_amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT cost_redistribution_details_boq_item_id_fkey FOREIGN KEY (boq_item_id) REFERENCES None.None(None),
    CONSTRAINT cost_redistribution_details_pkey PRIMARY KEY (id),
    CONSTRAINT cost_redistribution_details_redistribution_id_fkey FOREIGN KEY (redistribution_id) REFERENCES None.None(None),
    CONSTRAINT unique_item_per_redistribution UNIQUE (boq_item_id),
    CONSTRAINT unique_item_per_redistribution UNIQUE (redistribution_id)
);
COMMENT ON TABLE public.cost_redistribution_details IS 'Детализация изменений коммерческих стоимостей для каждого BOQ элемента';
COMMENT ON COLUMN public.cost_redistribution_details.original_commercial_cost IS 'Исходная коммерческая стоимость';
COMMENT ON COLUMN public.cost_redistribution_details.redistributed_commercial_cost IS 'Коммерческая стоимость после перераспределения';
COMMENT ON COLUMN public.cost_redistribution_details.adjustment_amount IS 'Величина корректировки (положительная = добавление, отрицательная = вычитание)';

-- Table: public.cost_redistributions
-- Description: Перераспределения коммерческих стоимостей работ для тендеров (версионные)
CREATE TABLE IF NOT EXISTS public.cost_redistributions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    is_active boolean NOT NULL DEFAULT false,
    source_config jsonb,
    target_config jsonb,
    CONSTRAINT cost_redistributions_pkey PRIMARY KEY (id),
    CONSTRAINT cost_redistributions_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.cost_redistributions IS 'Перераспределения коммерческих стоимостей работ для тендеров (версионные)';
COMMENT ON COLUMN public.cost_redistributions.tender_id IS 'ID тендера (версии) к которому применяется перераспределение';
COMMENT ON COLUMN public.cost_redistributions.name IS 'Название перераспределения';
COMMENT ON COLUMN public.cost_redistributions.is_active IS 'Активное перераспределение (только одно на тендер)';
COMMENT ON COLUMN public.cost_redistributions.source_config IS 'Конфигурация исходных категорий: массив объектов [{cost_category_id, cost_category_name, detail_cost_category_ids[], detail_cost_category_names[], percent}]';
COMMENT ON COLUMN public.cost_redistributions.target_config IS 'Конфигурация целевых категорий: массив объектов [{cost_category_id, cost_category_name, detail_cost_category_ids[], detail_cost_category_names[]}]';

-- Table: public.detail_cost_categories
CREATE TABLE IF NOT EXISTS public.detail_cost_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    cost_category_id uuid NOT NULL,
    location_id uuid NOT NULL,
    name text NOT NULL,
    unit_cost numeric(12,2),
    created_at timestamp with time zone DEFAULT now(),
    unit text,
    CONSTRAINT detail_cost_categories_cost_category_id_fkey FOREIGN KEY (cost_category_id) REFERENCES None.None(None),
    CONSTRAINT detail_cost_categories_location_id_fkey FOREIGN KEY (location_id) REFERENCES None.None(None),
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
-- Description: Справочник наименований материалов
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
-- Description: Master catalog of materials with pricing
CREATE TABLE IF NOT EXISTS public.materials_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    default_type USER-DEFINED DEFAULT 'main'::material_type,
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
    CONSTRAINT fk_materials_library_name FOREIGN KEY (name_id) REFERENCES None.None(None),
    CONSTRAINT materials_library_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.materials_library IS 'Master catalog of materials with pricing';
COMMENT ON COLUMN public.materials_library.default_type IS 'Тип материала по умолчанию при добавлении в      

  BOQ';
COMMENT ON COLUMN public.materials_library.name_id IS 'Ссылка на наименование материала';
COMMENT ON COLUMN public.materials_library.conversion_coefficient IS 'Коэффициент конверсии, перенесен из work_material_templates';

-- Table: public.tender_cost_volumes
-- Description: Объемы затрат по категориям для каждого тендера
CREATE TABLE IF NOT EXISTS public.tender_cost_volumes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    detail_cost_category_id uuid NOT NULL,
    volume numeric(12,4) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    unit_total numeric(12,2) DEFAULT 0,
    CONSTRAINT tender_cost_volumes_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES None.None(None),
    CONSTRAINT tender_cost_volumes_pkey PRIMARY KEY (id),
    CONSTRAINT tender_cost_volumes_tender_id_detail_cost_category_id_key UNIQUE (detail_cost_category_id),
    CONSTRAINT tender_cost_volumes_tender_id_detail_cost_category_id_key UNIQUE (tender_id),
    CONSTRAINT tender_cost_volumes_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.tender_cost_volumes IS 'Объемы затрат по категориям для каждого тендера';
COMMENT ON COLUMN public.tender_cost_volumes.tender_id IS 'ID тендера';
COMMENT ON COLUMN public.tender_cost_volumes.detail_cost_category_id IS 'ID детальной категории затрат';
COMMENT ON COLUMN public.tender_cost_volumes.volume IS 'Объем затрат для расчета стоимости';
COMMENT ON COLUMN public.tender_cost_volumes.unit_total IS 'Автоматически

  рассчитанная стоимость за единицу (руб/ед)';

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
    CONSTRAINT tender_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES None.None(None),
    CONSTRAINT tender_items_node_id_fkey FOREIGN KEY (node_id) REFERENCES None.None(None),
    CONSTRAINT tender_items_pkey PRIMARY KEY (id),
    CONSTRAINT tender_items_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None),
    CONSTRAINT tender_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES None.None(None)
);

-- Table: public.tender_markup_percentages
-- Description: New markup percentages structure for tender financial calculations with 11 specific markup types
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
    commercial_total_value numeric(15,2),
    commercial_total_calculated_at timestamp with time zone,
    CONSTRAINT tender_markup_percentages_new_pkey PRIMARY KEY (id),
    CONSTRAINT tender_markup_percentages_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None)
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
COMMENT ON COLUMN public.tender_markup_percentages.commercial_total_value IS 'Рассчитанная итоговая коммерческая стоимость КП';
COMMENT ON COLUMN public.tender_markup_percentages.commercial_total_calculated_at IS 'Дата и время последнего расчета коммерческой стоимости';

-- Table: public.tender_version_history
-- Description: История операций версионирования тендеров
CREATE TABLE IF NOT EXISTS public.tender_version_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL,
    version_number integer(32) NOT NULL,
    action text NOT NULL,
    details jsonb,
    positions_added integer(32),
    positions_removed integer(32),
    positions_modified integer(32),
    dop_transferred integer(32),
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    CONSTRAINT tender_version_history_pkey PRIMARY KEY (id),
    CONSTRAINT tender_version_history_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES None.None(None),
    CONSTRAINT tender_version_history_tender_id_version_number_key UNIQUE (tender_id),
    CONSTRAINT tender_version_history_tender_id_version_number_key UNIQUE (version_number)
);
COMMENT ON TABLE public.tender_version_history IS 'История операций версионирования тендеров';

-- Table: public.tender_version_mappings
-- Description: Таблица для хранения сопоставлений позиций между версиями тендеров
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
    CONSTRAINT tender_version_mappings_new_position_id_fkey FOREIGN KEY (new_position_id) REFERENCES None.None(None),
    CONSTRAINT tender_version_mappings_new_tender_id_fkey FOREIGN KEY (new_tender_id) REFERENCES None.None(None),
    CONSTRAINT tender_version_mappings_new_tender_id_new_position_id_key UNIQUE (new_position_id),
    CONSTRAINT tender_version_mappings_new_tender_id_new_position_id_key UNIQUE (new_tender_id),
    CONSTRAINT tender_version_mappings_old_position_id_fkey FOREIGN KEY (old_position_id) REFERENCES None.None(None),
    CONSTRAINT tender_version_mappings_old_tender_id_fkey FOREIGN KEY (old_tender_id) REFERENCES None.None(None),
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
    version integer(32) NOT NULL DEFAULT 1,
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
    CONSTRAINT fk_work_material_links_material FOREIGN KEY (material_boq_item_id) REFERENCES None.None(None),
    CONSTRAINT fk_work_material_links_position FOREIGN KEY (client_position_id) REFERENCES None.None(None),
    CONSTRAINT fk_work_material_links_sub_material FOREIGN KEY (sub_material_boq_item_id) REFERENCES None.None(None),
    CONSTRAINT fk_work_material_links_sub_work FOREIGN KEY (sub_work_boq_item_id) REFERENCES None.None(None),
    CONSTRAINT fk_work_material_links_work FOREIGN KEY (work_boq_item_id) REFERENCES None.None(None),
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
-- Description: Шаблоны работ и материалов. Может содержать работы без материалов, материалы без работ, или связки работа-материал
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
    CONSTRAINT work_material_templates_material_library_id_fkey FOREIGN KEY (material_library_id) REFERENCES None.None(None),
    CONSTRAINT work_material_templates_pkey PRIMARY KEY (id),
    CONSTRAINT work_material_templates_sub_material_library_id_fkey FOREIGN KEY (sub_material_library_id) REFERENCES None.None(None),
    CONSTRAINT work_material_templates_sub_work_library_id_fkey FOREIGN KEY (sub_work_library_id) REFERENCES None.None(None),
    CONSTRAINT work_material_templates_work_library_id_fkey FOREIGN KEY (work_library_id) REFERENCES None.None(None)
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
-- Description: Справочник наименований работ
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
-- Description: Master catalog of work items with labor components
CREATE TABLE IF NOT EXISTS public.works_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    item_type character varying(50),
    unit_rate numeric(10,2),
    currency_type character varying(10) DEFAULT 'RUB'::character varying,
    name_id uuid NOT NULL,
    CONSTRAINT fk_works_library_name FOREIGN KEY (name_id) REFERENCES None.None(None),
    CONSTRAINT works_library_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.works_library IS 'Master catalog of work items with labor components';
COMMENT ON COLUMN public.works_library.name_id IS 'Ссылка на наименование работы';

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
    CONSTRAINT messages_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.messages_2025_09_29
CREATE TABLE IF NOT EXISTS realtime.messages_2025_09_29 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_2025_09_29_pkey PRIMARY KEY (id),
    CONSTRAINT messages_2025_09_29_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.messages_2025_09_30
CREATE TABLE IF NOT EXISTS realtime.messages_2025_09_30 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_2025_09_30_pkey PRIMARY KEY (id),
    CONSTRAINT messages_2025_09_30_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.messages_2025_10_01
CREATE TABLE IF NOT EXISTS realtime.messages_2025_10_01 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_2025_10_01_pkey PRIMARY KEY (id),
    CONSTRAINT messages_2025_10_01_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.messages_2025_10_02
CREATE TABLE IF NOT EXISTS realtime.messages_2025_10_02 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_2025_10_02_pkey PRIMARY KEY (id),
    CONSTRAINT messages_2025_10_02_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.messages_2025_10_03
CREATE TABLE IF NOT EXISTS realtime.messages_2025_10_03 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_2025_10_03_pkey PRIMARY KEY (id),
    CONSTRAINT messages_2025_10_03_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.schema_migrations
-- Description: Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS realtime.schema_migrations (
    version bigint(64) NOT NULL,
    inserted_at timestamp without time zone,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
COMMENT ON TABLE realtime.schema_migrations IS 'Auth: Manages updates to the auth system.';

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
    statements ARRAY,
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

CREATE TYPE auth.oauth_registration_type AS ENUM ('dynamic', 'manual');

CREATE TYPE auth.one_time_token_type AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');

CREATE TYPE public.boq_item_type AS ENUM ('work', 'material', 'sub_work', 'sub_material');

CREATE TYPE public.client_position_status AS ENUM ('active', 'inactive', 'completed');

CREATE TYPE public.delivery_price_type AS ENUM ('included', 'not_included', 'amount');

CREATE TYPE public.material_type AS ENUM ('main', 'auxiliary');
COMMENT ON TYPE public.material_type IS 'Тип материала: main - основной (связан с работой), auxiliary -      

  вспомогательный (не связан с работой)';

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

-- View: public.client_positions_with_boq_summary
CREATE OR REPLACE VIEW public.client_positions_with_boq_summary AS
 SELECT cp.id,
    cp.tender_id,
    cp.position_number,
    cp.total_materials_cost,
    cp.total_works_cost,
    cp.created_at,
    cp.updated_at,
    cp.unit,
    cp.volume,
    cp.client_note,
    cp.item_no,
    cp.work_name,
    cp.manual_volume,
    cp.manual_note,
    cp.position_type,
    cp.hierarchy_level,
    cp.total_commercial_materials_cost,
    cp.total_commercial_works_cost,
    cp.is_additional,
    cp.parent_position_id,
    COALESCE(boq_agg.boq_items_count, (0)::bigint) AS boq_items_count,
    COALESCE(boq_agg.total_boq_cost, (0)::numeric) AS total_boq_cost,
    COALESCE(boq_agg.materials_count, (0)::bigint) AS materials_count,
    COALESCE(boq_agg.works_count, (0)::bigint) AS works_count
   FROM (client_positions cp
     LEFT JOIN ( SELECT boq_items.client_position_id,
            count(*) AS boq_items_count,
            sum(boq_items.total_amount) AS total_boq_cost,
            count(*) FILTER (WHERE (boq_items.item_type = 'material'::boq_item_type)) AS materials_count,
            count(*) FILTER (WHERE (boq_items.item_type = 'work'::boq_item_type)) AS works_count
           FROM boq_items
          WHERE (boq_items.client_position_id IS NOT NULL)
          GROUP BY boq_items.client_position_id) boq_agg ON ((cp.id = boq_agg.client_position_id)));

-- View: public.materials_library_with_names
CREATE OR REPLACE VIEW public.materials_library_with_names AS
 SELECT m.id,
    m.name_id,
    n.name,
    n.unit,
    m.item_type,
    m.material_type,
    m.consumption_coefficient,
    m.conversion_coefficient,
    m.unit_rate,
    m.currency_type,
    m.delivery_price_type,
    m.delivery_amount,
    m.quote_link,
    m.created_at,
    m.updated_at
   FROM (materials_library m
     LEFT JOIN material_names n ON ((m.name_id = n.id)));

-- View: public.v_commercial_costs_summary
CREATE OR REPLACE VIEW public.v_commercial_costs_summary AS
 SELECT cc.id,
    t.title AS tender_title,
    t.client_name,
    cat.name AS category_name,
    det.name AS detail_name,
    loc.title AS location,
    cc.direct_materials,
    cc.direct_works,
    cc.direct_submaterials,
    cc.direct_subworks,
    cc.direct_total,
    cc.commercial_materials,
    cc.commercial_works,
    cc.commercial_submaterials,
    cc.commercial_subworks,
    cc.commercial_total,
    round((cc.commercial_total - cc.direct_total), 2) AS markup_amount,
    round(
        CASE
            WHEN (cc.direct_total > (0)::numeric) THEN (((cc.commercial_total - cc.direct_total) / cc.direct_total) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS markup_percent,
    cc.last_calculation_date
   FROM ((((commercial_costs_by_category cc
     JOIN tenders t ON ((t.id = cc.tender_id)))
     JOIN detail_cost_categories det ON ((det.id = cc.detail_cost_category_id)))
     LEFT JOIN cost_categories cat ON ((cat.id = det.cost_category_id)))
     LEFT JOIN location loc ON ((loc.id = det.location_id)))
  ORDER BY t.title, cat.name, det.name;

-- View: public.v_cost_categories_full
CREATE OR REPLACE VIEW public.v_cost_categories_full AS
 SELECT dcc.id AS detail_category_id,
    cc.id AS category_id,
    l.id AS location_id,
    cc.name AS category_name,
    dcc.name AS detail_name,
    COALESCE(NULLIF(concat_ws(', '::text, l.city, l.region, l.country), ''::text), l.title, 'Не указано'::text) AS location_display,
    concat(cc.name, '-', dcc.name,
        CASE
            WHEN ((l.city IS NOT NULL) OR (l.region IS NOT NULL) OR (l.country IS NOT NULL) OR (l.title IS NOT NULL)) THEN concat('-', COALESCE(NULLIF(concat_ws(', '::text, l.city, l.region, l.country), ''::text), l.title))
            ELSE ''::text
        END) AS full_category_path,
    dcc.unit,
    dcc.unit_cost
   FROM ((detail_cost_categories dcc
     JOIN cost_categories cc ON ((cc.id = dcc.cost_category_id)))
     LEFT JOIN location l ON ((l.id = dcc.location_id)));

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

-- View: public.works_library_with_names
CREATE OR REPLACE VIEW public.works_library_with_names AS
 SELECT w.id,
    w.name_id,
    n.name,
    n.unit,
    w.item_type,
    w.unit_rate,
    w.currency_type,
    w.created_at,
    w.updated_at
   FROM (works_library w
     LEFT JOIN work_names n ON ((w.name_id = n.id)));

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
CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$


-- Function: extensions.armor
CREATE OR REPLACE FUNCTION extensions.armor(bytea)
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
CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$


-- Function: extensions.digest
CREATE OR REPLACE FUNCTION extensions.digest(text, text)
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
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)
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
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$


-- Function: extensions.pgp_pub_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)
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
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$


-- Function: extensions.pgp_sym_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$


-- Function: extensions.pgp_sym_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$


-- Function: extensions.pgp_sym_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)
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


-- Function: public.auto_match_positions
-- Description: Автоматически сопоставляет позиции между версиями используя fuzzy matching
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
-- Description: Триггер v10: автоматически рассчитывает delivery_amount (3% для not_included) и total_amount без дополнительных полей
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
-- Description: v10: Упрощенный расчет total_amount = (unit_rate + delivery_amount) × quantity для материалов, unit_rate × quantity для работ
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
-- Description: Триггер v6: автоматически рассчитывает ТОЛЬКО delivery_amount. total_amount пересчитается автоматически как generated column.
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


-- Function: public.calculate_work_portion
-- Description: Рассчитывает долю работ в коммерческой стоимости BOQ элемента
CREATE OR REPLACE FUNCTION public.calculate_work_portion(p_item_type boq_item_type, p_material_type material_type, p_commercial_cost numeric, p_total_amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$

BEGIN

  -- Для работ: вся commercial_cost - это работы

  IF p_item_type IN ('work', 'sub_work') THEN

    RETURN p_commercial_cost;

  END IF;



  -- Для материалов: зависит от material_type

  IF p_item_type IN ('material', 'sub_material') THEN

    -- Основной материал: работы = commercial_cost - total_amount (наценка)

    IF p_material_type = 'main' THEN

      RETURN p_commercial_cost - p_total_amount;

    END IF;



    -- Вспомогательный материал: вся commercial_cost - это работы

    IF p_material_type = 'auxiliary' THEN

      RETURN p_commercial_cost;

    END IF;

  END IF;



  -- По умолчанию возвращаем 0

  RETURN 0;

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
-- Description: Удаляет неиспользованные черновые версии тендера
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


-- Function: public.complete_version_transfer
-- Description: Переносит все данные между версиями включая manual_volume и manual_note
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
-- Description: Переносит данные с work_material_links и manual полями
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
-- Description: Создает новую версию тендера с автоматической генерацией уникального номера (без добавления версии к названию)
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


-- Function: public.get_categories_with_work_costs
-- Description: Возвращает категории затрат с текущей стоимостью работ для тендера
CREATE OR REPLACE FUNCTION public.get_categories_with_work_costs(p_tender_id uuid)
 RETURNS TABLE(id uuid, name text, current_works_cost numeric, items_count bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$

BEGIN

  RETURN QUERY

  SELECT

    dc.id,

    dc.name,

    COALESCE(SUM(

      calculate_work_portion(

        bi.item_type,

        bi.material_type,

        bi.commercial_cost,

        bi.total_amount

      ) * bi.quantity

    ), 0) AS current_works_cost,

    COUNT(bi.id) AS items_count

  FROM detail_cost_categories dc

  LEFT JOIN boq_items bi ON bi.detail_cost_category_id = dc.id

    AND bi.tender_id = p_tender_id

    AND bi.commercial_cost > 0

  GROUP BY dc.id, dc.name

  HAVING COUNT(bi.id) > 0 OR dc.id IN (

    SELECT DISTINCT detail_cost_category_id

    FROM boq_items

    WHERE tender_id = p_tender_id

      AND detail_cost_category_id IS NOT NULL

  )

  ORDER BY dc.name;

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
-- Description: Агрегация затрат тендера по типам элементов BOQ
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
CREATE OR REPLACE FUNCTION public.lca(ltree[])
 RETURNS ltree
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/ltree', $function$_lca$function$


-- Function: public.lca
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree, ltree, ltree, ltree)
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
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree, ltree)
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
CREATE OR REPLACE FUNCTION public.lca(ltree, ltree, ltree, ltree, ltree)
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

      -- ✅ ИСПРАВЛЕНО: убрали умножение на quantity

      SELECT COALESCE(SUM(commercial_cost), 0) INTO commercial_materials_total

      FROM public.boq_items

      WHERE client_position_id = position_id

      AND item_type IN ('material', 'sub_material');



      -- Recalculate commercial work costs (коммерческие)

      -- ✅ ИСПРАВЛЕНО: убрали умножение на quantity

      SELECT COALESCE(SUM(commercial_cost), 0) INTO commercial_works_total

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


-- Function: public.redistribute_work_costs
-- Description: Перераспределяет коммерческую стоимость работ между категориями затрат для тендера (с обработкой дубликатов)
CREATE OR REPLACE FUNCTION public.redistribute_work_costs(p_tender_id uuid, p_redistribution_name text, p_description text, p_source_withdrawals jsonb, p_target_categories uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$

DECLARE

  v_redistribution_id UUID;

  v_source_withdrawal JSONB;

  v_category_id UUID;

  v_percent NUMERIC;

  v_total_withdrawn NUMERIC := 0;

  v_total_target_works_cost NUMERIC := 0;

  v_boq_item RECORD;

  v_work_portion NUMERIC;

  v_withdrawal_amount NUMERIC;

  v_item_weight NUMERIC;

  v_addition_amount NUMERIC;

  v_new_commercial_cost NUMERIC;

BEGIN

  RAISE NOTICE '🚀 redistribute_work_costs started for tender: %, name: %', p_tender_id, p_redistribution_name;



  -- Деактивировать все существующие активные перераспределения для этого тендера

  UPDATE public.cost_redistributions

  SET is_active = false,

      updated_at = NOW()

  WHERE tender_id = p_tender_id AND is_active = true;



  RAISE NOTICE '✅ Deactivated existing redistributions';



  -- Создать новую запись перераспределения

  INSERT INTO public.cost_redistributions (

    tender_id,

    name,

    description,

    is_active

  ) VALUES (

    p_tender_id,

    p_redistribution_name,

    p_description,

    true

  ) RETURNING id INTO v_redistribution_id;



  RAISE NOTICE '✅ Created new redistribution with ID: %', v_redistribution_id;



  -- ШАГ 1: Вычитание из исходных категорий

  FOR v_source_withdrawal IN SELECT * FROM jsonb_array_elements(p_source_withdrawals)

  LOOP

    v_category_id := (v_source_withdrawal->>'detail_cost_category_id')::UUID;

    v_percent := (v_source_withdrawal->>'percent')::NUMERIC;



    RAISE NOTICE '📊 Processing source category: %, percent: %', v_category_id, v_percent;



    -- Обработать каждый BOQ item в этой категории

    FOR v_boq_item IN

      SELECT

        id,

        item_type,

        material_type,

        commercial_cost,

        total_amount,

        description

      FROM public.boq_items

      WHERE tender_id = p_tender_id

        AND detail_cost_category_id = v_category_id

        AND commercial_cost > 0

    LOOP

      -- Рассчитать workPortion

      v_work_portion := calculate_work_portion(

        v_boq_item.item_type,

        v_boq_item.material_type,

        v_boq_item.commercial_cost,

        v_boq_item.total_amount

      );



      -- Вычислить сумму вычитания

      v_withdrawal_amount := v_work_portion * (v_percent / 100);



      -- Накопить общую вычтенную сумму

      v_total_withdrawn := v_total_withdrawn + v_withdrawal_amount;



      -- Новая коммерческая стоимость

      v_new_commercial_cost := v_boq_item.commercial_cost - v_withdrawal_amount;



      -- Сохранить в details с обработкой конфликтов (если элемент уже был добавлен)

      INSERT INTO public.cost_redistribution_details (

        redistribution_id,

        boq_item_id,

        original_commercial_cost,

        redistributed_commercial_cost,

        adjustment_amount

      ) VALUES (

        v_redistribution_id,

        v_boq_item.id,

        v_boq_item.commercial_cost,

        v_new_commercial_cost,

        -v_withdrawal_amount  -- Отрицательное значение = вычитание

      )

      ON CONFLICT (redistribution_id, boq_item_id) DO UPDATE SET

        redistributed_commercial_cost = cost_redistribution_details.redistributed_commercial_cost - v_withdrawal_amount,

        adjustment_amount = cost_redistribution_details.adjustment_amount - v_withdrawal_amount;



      RAISE NOTICE '➖ Withdrawn from item %: % (workPortion: %, percent: %)',

        v_boq_item.description, v_withdrawal_amount, v_work_portion, v_percent;

    END LOOP;

  END LOOP;



  RAISE NOTICE '✅ Total withdrawn: %', v_total_withdrawn;



  -- Проверка: должно быть вычтено что-то

  IF v_total_withdrawn <= 0 THEN

    RAISE EXCEPTION 'No amounts were withdrawn. Check source categories and percentages.';

  END IF;



  -- ШАГ 2: Рассчитать общую стоимость работ в целевых категориях

  FOR v_boq_item IN

    SELECT

      id,

      item_type,

      material_type,

      commercial_cost,

      total_amount

    FROM public.boq_items

    WHERE tender_id = p_tender_id

      AND detail_cost_category_id = ANY(p_target_categories)

      AND commercial_cost > 0

  LOOP

    v_work_portion := calculate_work_portion(

      v_boq_item.item_type,

      v_boq_item.material_type,

      v_boq_item.commercial_cost,

      v_boq_item.total_amount

    );



    v_total_target_works_cost := v_total_target_works_cost + v_work_portion;

  END LOOP;



  RAISE NOTICE '✅ Total target works cost: %', v_total_target_works_cost;



  -- Проверка: должны быть целевые категории

  IF v_total_target_works_cost <= 0 THEN

    RAISE EXCEPTION 'No target items found or total target works cost is zero';

  END IF;



  -- ШАГ 3: Распределение на целевые категории

  FOR v_boq_item IN

    SELECT

      id,

      item_type,

      material_type,

      commercial_cost,

      total_amount,

      description

    FROM public.boq_items

    WHERE tender_id = p_tender_id

      AND detail_cost_category_id = ANY(p_target_categories)

      AND commercial_cost > 0

  LOOP

    -- Рассчитать workPortion

    v_work_portion := calculate_work_portion(

      v_boq_item.item_type,

      v_boq_item.material_type,

      v_boq_item.commercial_cost,

      v_boq_item.total_amount

    );



    -- Рассчитать вес элемента

    v_item_weight := v_work_portion / v_total_target_works_cost;



    -- Рассчитать сумму добавления

    v_addition_amount := v_total_withdrawn * v_item_weight;



    -- Новая коммерческая стоимость

    v_new_commercial_cost := v_boq_item.commercial_cost + v_addition_amount;



    -- Сохранить в details

    INSERT INTO public.cost_redistribution_details (

      redistribution_id,

      boq_item_id,

      original_commercial_cost,

      redistributed_commercial_cost,

      adjustment_amount

    ) VALUES (

      v_redistribution_id,

      v_boq_item.id,

      v_boq_item.commercial_cost,

      v_new_commercial_cost,

      v_addition_amount  -- Положительное значение = добавление

    )

    ON CONFLICT (redistribution_id, boq_item_id) DO UPDATE SET

      redistributed_commercial_cost = cost_redistribution_details.redistributed_commercial_cost + v_addition_amount,

      adjustment_amount = cost_redistribution_details.adjustment_amount + v_addition_amount;



    RAISE NOTICE '➕ Added to item %: % (weight: %)',

      v_boq_item.description, v_addition_amount, v_item_weight;

  END LOOP;



  RAISE NOTICE '✅ Redistribution completed successfully. ID: %', v_redistribution_id;



  RETURN v_redistribution_id;

END;

$function$


-- Function: public.redistribute_work_costs
CREATE OR REPLACE FUNCTION public.redistribute_work_costs(p_tender_id uuid, p_redistribution_name text, p_description text, p_source_withdrawals jsonb, p_target_categories uuid[], p_source_config jsonb DEFAULT NULL::jsonb, p_target_config jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$

DECLARE

  v_redistribution_id UUID;

  v_source_withdrawal JSONB;

  v_category_id UUID;

  v_percent NUMERIC;

  v_total_withdrawn NUMERIC := 0;

  v_total_target_works_cost NUMERIC := 0;

  v_boq_item RECORD;

  v_work_portion NUMERIC;

  v_withdrawal_amount NUMERIC;

  v_item_weight NUMERIC;

  v_addition_amount NUMERIC;

  v_new_commercial_cost NUMERIC;

BEGIN

  RAISE NOTICE '🚀 redistribute_work_costs started for tender: %, name: %', p_tender_id, p_redistribution_name;



  -- Деактивировать все существующие активные перераспределения для этого тендера

  UPDATE public.cost_redistributions

  SET is_active = false,

      updated_at = NOW()

  WHERE tender_id = p_tender_id AND is_active = true;



  RAISE NOTICE '✅ Deactivated existing redistributions';



  -- Создать новую запись перераспределения (WITH CONFIG)

  INSERT INTO public.cost_redistributions (

    tender_id,

    name,

    description,

    is_active,

    source_config,  -- NEW

    target_config   -- NEW

  ) VALUES (

    p_tender_id,

    p_redistribution_name,

    p_description,

    true,

    p_source_config,  -- NEW

    p_target_config   -- NEW

  ) RETURNING id INTO v_redistribution_id;



  RAISE NOTICE '✅ Created new redistribution with ID: %', v_redistribution_id;



  -- ШАГ 1: Вычитание из исходных категорий

  FOR v_source_withdrawal IN SELECT * FROM jsonb_array_elements(p_source_withdrawals)

  LOOP

    v_category_id := (v_source_withdrawal->>'detail_cost_category_id')::UUID;

    v_percent := (v_source_withdrawal->>'percent')::NUMERIC;



    RAISE NOTICE '📊 Processing source category: %, percent: %', v_category_id, v_percent;



    -- Обработать каждый BOQ item в этой категории

    FOR v_boq_item IN

      SELECT

        id,

        item_type,

        material_type,

        commercial_cost,

        total_amount,

        description

      FROM public.boq_items

      WHERE tender_id = p_tender_id

        AND detail_cost_category_id = v_category_id

        AND commercial_cost > 0

    LOOP

      -- Рассчитать workPortion

      v_work_portion := calculate_work_portion(

        v_boq_item.item_type,

        v_boq_item.material_type,

        v_boq_item.commercial_cost,

        v_boq_item.total_amount

      );



      -- Вычислить сумму вычитания

      v_withdrawal_amount := v_work_portion * (v_percent / 100);



      -- Накопить общую вычтенную сумму

      v_total_withdrawn := v_total_withdrawn + v_withdrawal_amount;



      -- Новая коммерческая стоимость

      v_new_commercial_cost := v_boq_item.commercial_cost - v_withdrawal_amount;



      -- Сохранить в details

      INSERT INTO public.cost_redistribution_details (

        redistribution_id,

        boq_item_id,

        original_commercial_cost,

        redistributed_commercial_cost,

        adjustment_amount

      ) VALUES (

        v_redistribution_id,

        v_boq_item.id,

        v_boq_item.commercial_cost,

        v_new_commercial_cost,

        -v_withdrawal_amount  -- Отрицательное значение = вычитание

      )

      ON CONFLICT (redistribution_id, boq_item_id) DO UPDATE SET

        redistributed_commercial_cost = cost_redistribution_details.redistributed_commercial_cost - v_withdrawal_amount,

        adjustment_amount = cost_redistribution_details.adjustment_amount - v_withdrawal_amount;



      RAISE NOTICE '➖ Withdrawn from item %: % (workPortion: %, percent: %)',

        v_boq_item.description, v_withdrawal_amount, v_work_portion, v_percent;

    END LOOP;

  END LOOP;



  RAISE NOTICE '✅ Total withdrawn: %', v_total_withdrawn;



  -- Проверка: должно быть вычтено что-то

  IF v_total_withdrawn <= 0 THEN

    RAISE EXCEPTION 'No amounts were withdrawn. Check source categories and percentages.';

  END IF;



  -- ШАГ 2: Рассчитать общую стоимость работ в целевых категориях

  FOR v_boq_item IN

    SELECT

      id,

      item_type,

      material_type,

      commercial_cost,

      total_amount

    FROM public.boq_items

    WHERE tender_id = p_tender_id

      AND detail_cost_category_id = ANY(p_target_categories)

      AND commercial_cost > 0

  LOOP

    v_work_portion := calculate_work_portion(

      v_boq_item.item_type,

      v_boq_item.material_type,

      v_boq_item.commercial_cost,

      v_boq_item.total_amount

    );



    v_total_target_works_cost := v_total_target_works_cost + v_work_portion;

  END LOOP;



  RAISE NOTICE '✅ Total target works cost: %', v_total_target_works_cost;



  -- Проверка: должны быть целевые категории

  IF v_total_target_works_cost <= 0 THEN

    RAISE EXCEPTION 'No target items found or total target works cost is zero';

  END IF;



  -- ШАГ 3: Распределение на целевые категории

  FOR v_boq_item IN

    SELECT

      id,

      item_type,

      material_type,

      commercial_cost,

      total_amount,

      description

    FROM public.boq_items

    WHERE tender_id = p_tender_id

      AND detail_cost_category_id = ANY(p_target_categories)

      AND commercial_cost > 0

  LOOP

    -- Рассчитать workPortion

    v_work_portion := calculate_work_portion(

      v_boq_item.item_type,

      v_boq_item.material_type,

      v_boq_item.commercial_cost,

      v_boq_item.total_amount

    );



    -- Рассчитать вес элемента

    v_item_weight := v_work_portion / v_total_target_works_cost;



    -- Рассчитать сумму добавления

    v_addition_amount := v_total_withdrawn * v_item_weight;



    -- Новая коммерческая стоимость

    v_new_commercial_cost := v_boq_item.commercial_cost + v_addition_amount;



    -- Сохранить в details

    INSERT INTO public.cost_redistribution_details (

      redistribution_id,

      boq_item_id,

      original_commercial_cost,

      redistributed_commercial_cost,

      adjustment_amount

    ) VALUES (

      v_redistribution_id,

      v_boq_item.id,

      v_boq_item.commercial_cost,

      v_new_commercial_cost,

      v_addition_amount  -- Положительное значение = добавление

    )

    ON CONFLICT (redistribution_id, boq_item_id) DO UPDATE SET

      redistributed_commercial_cost = cost_redistribution_details.redistributed_commercial_cost + v_addition_amount,

      adjustment_amount = cost_redistribution_details.adjustment_amount + v_addition_amount;



    RAISE NOTICE '➕ Added to item %: % (weight: %)',

      v_boq_item.description, v_addition_amount, v_item_weight;

  END LOOP;



  RAISE NOTICE '✅ Redistribution completed successfully. ID: %', v_redistribution_id;



  RETURN v_redistribution_id;

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
-- Description: Поиск категорий затрат по частичному совпадению в названиях категорий, детализации и локаций.

  Возвращает cost_node_id (или detail_id как fallback), полное отображаемое имя и компоненты пути.
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
-- Description: Тестовая функция для проверки переноса версий
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
-- Description: Комплексный перенос всех данных между версиями тендера включая work_material_links и ДОП позиции
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
-- Description: Улучшенная версия переноса BOQ items с автоматическим переносом связей
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
-- Description: Переносит BOQ items и manual поля на основе маппинга
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
-- Description: Переносит ДОП позиции включая manual_volume и manual_note
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
-- Description: Исправленная версия переноса ДОП позиций с manual полями
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
-- Description: Улучшенная версия переноса ДОП позиций с manual полями
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
-- Description: Улучшенная версия переноса work_material_links с созданием BOQ items
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
-- Description: ПРОСТОЕ суммирование total_amount построчно. Без логики связей.
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
-- Description: Trigger function that automatically calls update_boq_currency_rates when tender currency rates are updated.
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
-- Description: Updates currency_rate field in boq_items table when tender currency rates change.

V2 FIX: Updates both currency_rate AND unit_rate (to itself) to trigger calculate_boq_amounts_trigger.

This ensures total_amount is recalculated with the new currency_rate by the BEFORE trigger.

The AFTER trigger recalculate_position_totals_trigger then updates client_positions totals.
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


-- Function: public.update_cost_redistribution_updated_at
CREATE OR REPLACE FUNCTION public.update_cost_redistribution_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

BEGIN

  NEW.updated_at = NOW();

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
-- Description: Автоматически обновляет quantity и total_amount связанного материала при изменении work_material_links. Использует v_work_id и v_material_id для избежания конфликтов с именами колонок.
CREATE OR REPLACE FUNCTION public.update_linked_material_total_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

DECLARE

    v_work RECORD;

    v_material RECORD;

    new_quantity DECIMAL(15,6);  -- Changed from DECIMAL(15,2) to DECIMAL(15,6)

    new_total DECIMAL(15,2);

    v_material_id UUID;

    v_work_id UUID;

BEGIN

    -- Определяем IDs

    IF TG_OP = 'DELETE' THEN

        v_material_id := COALESCE(OLD.material_boq_item_id, OLD.sub_material_boq_item_id);

        v_work_id := COALESCE(OLD.work_boq_item_id, OLD.sub_work_boq_item_id);

        RETURN OLD;

    ELSE

        v_material_id := COALESCE(NEW.material_boq_item_id, NEW.sub_material_boq_item_id);

        v_work_id := COALESCE(NEW.work_boq_item_id, NEW.sub_work_boq_item_id);

    END IF;



    IF v_material_id IS NULL OR v_work_id IS NULL THEN

        RETURN NEW;

    END IF;



    -- Получаем работу

    SELECT quantity INTO v_work FROM boq_items WHERE id = v_work_id;



    -- Получаем материал

    SELECT

        unit_rate, currency_type, currency_rate,

        delivery_price_type, delivery_amount,

        consumption_coefficient, conversion_coefficient

    INTO v_material FROM boq_items WHERE id = v_material_id;



    -- Пересчитываем quantity с точностью до 6 знаков

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

    UPDATE boq_items

    SET

        quantity = new_quantity,

        total_amount = new_total,

        updated_at = NOW()

    WHERE id = v_material_id;



    RETURN NEW;

END;

$function$


-- Function: public.update_linked_materials_on_work_change
-- Description: Automatically updates quantity and total_amount of all materials linked to a work when the work quantity changes. Fixes the issue where collapsed position cards show outdated totals.
CREATE OR REPLACE FUNCTION public.update_linked_materials_on_work_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

DECLARE

    link_record RECORD;

    v_material RECORD;

    new_quantity DECIMAL(15,6);  -- Changed from DECIMAL(15,2) to DECIMAL(15,6)

    new_total DECIMAL(15,2);

BEGIN

    -- Only process for work items

    IF NEW.item_type NOT IN ('work', 'sub_work') THEN

        RETURN NEW;

    END IF;



    -- Only process if quantity changed

    IF TG_OP = 'UPDATE' AND OLD.quantity = NEW.quantity THEN

        RETURN NEW;

    END IF;



    -- Find all materials linked to this work

    FOR link_record IN

        SELECT * FROM work_material_links

        WHERE work_boq_item_id = NEW.id OR sub_work_boq_item_id = NEW.id

    LOOP

        -- Get material ID

        DECLARE

            v_material_id UUID;

        BEGIN

            v_material_id := COALESCE(link_record.material_boq_item_id, link_record.sub_material_boq_item_id);



            IF v_material_id IS NULL THEN

                CONTINUE;

            END IF;



            -- Get material data

            SELECT

                unit_rate, currency_type, currency_rate,

                delivery_price_type, delivery_amount,

                consumption_coefficient, conversion_coefficient

            INTO v_material

            FROM boq_items

            WHERE id = v_material_id;



            -- Calculate new quantity with 6 decimal precision

            new_quantity := COALESCE(NEW.quantity, 0) *

                           COALESCE(v_material.consumption_coefficient, link_record.material_quantity_per_work, 1) *

                           COALESCE(v_material.conversion_coefficient, link_record.usage_coefficient, 1);



            -- Calculate new total_amount

            new_total := new_quantity * COALESCE(v_material.unit_rate, 0) *

                        CASE WHEN v_material.currency_type IS NOT NULL AND v_material.currency_type != 'RUB'

                             THEN COALESCE(v_material.currency_rate, 1) ELSE 1 END;



            -- Add delivery cost

            new_total := new_total + CASE

                WHEN v_material.delivery_price_type = 'amount' THEN

                    COALESCE(v_material.delivery_amount, 0) * new_quantity

                WHEN v_material.delivery_price_type = 'not_included' THEN

                    new_total * 0.03

                ELSE 0

            END;



            -- Update the linked material

            UPDATE boq_items

            SET

                quantity = new_quantity,

                total_amount = new_total,

                updated_at = NOW()

            WHERE id = v_material_id;



            RAISE NOTICE 'Updated linked material % for work %: new_qty=%, new_total=%',

                v_material_id, NEW.id, new_quantity, new_total;

        END;

    END LOOP;



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


-- Function: storage.delete_leaf_prefixes
CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
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


-- Function: storage.lock_top_prefixes
CREATE OR REPLACE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$function$


-- Function: storage.objects_delete_cleanup
CREATE OR REPLACE FUNCTION storage.objects_delete_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
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


-- Function: storage.objects_update_cleanup
CREATE OR REPLACE FUNCTION storage.objects_update_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$function$


-- Function: storage.objects_update_level_trigger
CREATE OR REPLACE FUNCTION storage.objects_update_level_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
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


-- Function: storage.prefixes_delete_cleanup
CREATE OR REPLACE FUNCTION storage.prefixes_delete_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
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
CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
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

-- Trigger: calculate_boq_amounts_trigger on public.boq_items
CREATE TRIGGER calculate_boq_amounts_trigger BEFORE INSERT OR UPDATE OF unit_rate, quantity, currency_type, currency_rate, delivery_price_type, delivery_amount ON public.boq_items FOR EACH ROW EXECUTE FUNCTION calculate_boq_amounts()

-- Trigger: recalculate_position_totals_trigger on public.boq_items
CREATE TRIGGER recalculate_position_totals_trigger AFTER INSERT OR DELETE OR UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION recalculate_client_position_totals()

-- Trigger: update_commercial_costs_trigger on public.boq_items
CREATE TRIGGER update_commercial_costs_trigger AFTER INSERT OR DELETE OR UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION trigger_update_commercial_costs_by_category()

-- Trigger: update_linked_materials_trigger on public.boq_items
-- Description: Triggers update of linked materials when work quantity changes, ensuring position totals are always accurate.
CREATE TRIGGER update_linked_materials_trigger AFTER UPDATE OF quantity ON public.boq_items FOR EACH ROW EXECUTE FUNCTION update_linked_materials_on_work_change()

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

-- Trigger: trigger_cost_redistribution_updated_at on public.cost_redistributions
CREATE TRIGGER trigger_cost_redistribution_updated_at BEFORE UPDATE ON public.cost_redistributions FOR EACH ROW EXECUTE FUNCTION update_cost_redistribution_updated_at()

-- Trigger: update_material_names_updated_at on public.material_names
CREATE TRIGGER update_material_names_updated_at BEFORE UPDATE ON public.material_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()

-- Trigger: tr_tender_items_defaults on public.tender_items
CREATE TRIGGER tr_tender_items_defaults BEFORE INSERT ON public.tender_items FOR EACH ROW EXECUTE FUNCTION tender_items_defaults()

-- Trigger: trigger_tender_markup_percentages_updated_at on public.tender_markup_percentages
CREATE TRIGGER trigger_tender_markup_percentages_updated_at BEFORE UPDATE ON public.tender_markup_percentages FOR EACH ROW EXECUTE FUNCTION handle_updated_at_tender_markup_percentages()

-- Trigger: tenders_currency_rates_update on public.tenders
-- Description: Automatically updates BOQ item currency rates when tender currency rates change.
CREATE TRIGGER tenders_currency_rates_update AFTER UPDATE ON public.tenders FOR EACH ROW EXECUTE FUNCTION trigger_update_boq_currency_rates()

-- Trigger: check_work_material_types_trigger on public.work_material_links
CREATE TRIGGER check_work_material_types_trigger BEFORE INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION check_work_material_types()

-- Trigger: recalc_position_totals_on_wml_change on public.work_material_links
-- Description: Автоматически пересчитывает totals в client_positions при изменении work_material_links (INSERT/UPDATE/DELETE). Предотвращает устаревание данных при копировании позиций с links.
CREATE TRIGGER recalc_position_totals_on_wml_change AFTER INSERT OR DELETE OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION trigger_recalc_position_on_wml_change()

-- Trigger: trigger_check_delivery_price on public.work_material_links
CREATE TRIGGER trigger_check_delivery_price BEFORE INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION check_delivery_price_consistency()

-- Trigger: update_material_total_on_link_change on public.work_material_links
CREATE TRIGGER update_material_total_on_link_change AFTER INSERT OR UPDATE ON public.work_material_links FOR EACH ROW EXECUTE FUNCTION update_linked_material_total_amount()

-- Trigger: work_material_templates_updated_at_trigger on public.work_material_templates
CREATE TRIGGER work_material_templates_updated_at_trigger BEFORE UPDATE ON public.work_material_templates FOR EACH ROW EXECUTE FUNCTION update_work_material_templates_updated_at()

-- Trigger: update_work_names_updated_at on public.work_names
CREATE TRIGGER update_work_names_updated_at BEFORE UPDATE ON public.work_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()

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

-- Index on auth.oauth_clients
CREATE INDEX oauth_clients_client_id_idx ON auth.oauth_clients USING btree (client_id);

-- Index on auth.oauth_clients
CREATE UNIQUE INDEX oauth_clients_client_id_key ON auth.oauth_clients USING btree (client_id);

-- Index on auth.oauth_clients
CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);

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

-- Index on public.boq_item_version_mappings
CREATE INDEX idx_boq_mapping_new ON public.boq_item_version_mappings USING btree (new_boq_item_id);

-- Index on public.boq_item_version_mappings
CREATE INDEX idx_boq_mapping_old ON public.boq_item_version_mappings USING btree (old_boq_item_id);

-- Index on public.boq_item_version_mappings
CREATE INDEX idx_boq_mapping_tenders ON public.boq_item_version_mappings USING btree (old_tender_id, new_tender_id);

-- Index on public.boq_item_version_mappings
CREATE UNIQUE INDEX uq_boq_mapping ON public.boq_item_version_mappings USING btree (old_boq_item_id, new_tender_id);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_aggregation ON public.boq_items USING btree (client_position_id, total_amount, quantity, unit_rate);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_client_position ON public.boq_items USING btree (client_position_id, item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_client_position_id ON public.boq_items USING btree (client_position_id);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_commercial_cost ON public.boq_items USING btree (commercial_cost);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_currency_type ON public.boq_items USING btree (currency_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_delivery_price_type ON public.boq_items USING btree (delivery_price_type) WHERE (item_type = 'material'::boq_item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_delivery_type ON public.boq_items USING btree (delivery_price_type) WHERE (item_type = 'material'::boq_item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_description_gin ON public.boq_items USING gin (to_tsvector('russian'::regconfig, description));

-- Index on public.boq_items
CREATE INDEX idx_boq_items_detail_cost_category_id ON public.boq_items USING btree (detail_cost_category_id) WHERE (detail_cost_category_id IS NOT NULL);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_item_type ON public.boq_items USING btree (item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_markup_coefficient ON public.boq_items USING btree (commercial_markup_coefficient);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_material_delivery ON public.boq_items USING btree (item_type, delivery_price_type, delivery_amount) WHERE (item_type = 'material'::boq_item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_material_id ON public.boq_items USING btree (material_id) WHERE (material_id IS NOT NULL);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_note ON public.boq_items USING gin (to_tsvector('russian'::regconfig, note)) WHERE (note IS NOT NULL);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_position_id_sort ON public.boq_items USING btree (client_position_id, sort_order) WHERE (client_position_id IS NOT NULL);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_position_sort ON public.boq_items USING btree (client_position_id, sub_number, sort_order);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_position_sub ON public.boq_items USING btree (client_position_id, sub_number);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_quote_link ON public.boq_items USING btree (quote_link) WHERE (quote_link IS NOT NULL);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_tender_id ON public.boq_items USING btree (tender_id);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_tender_id_item_type ON public.boq_items USING btree (tender_id, item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_tender_position ON public.boq_items USING btree (tender_id, client_position_id, sort_order) WHERE ((tender_id IS NOT NULL) AND (client_position_id IS NOT NULL));

-- Index on public.boq_items
CREATE INDEX idx_boq_items_tender_position_type ON public.boq_items USING btree (tender_id, client_position_id, item_type);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_tender_type ON public.boq_items USING btree (tender_id, item_type, client_position_id);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_total_amount ON public.boq_items USING btree (total_amount) WHERE (total_amount > (0)::numeric);

-- Index on public.boq_items
CREATE INDEX idx_boq_items_work_id ON public.boq_items USING btree (work_id) WHERE (work_id IS NOT NULL);

-- Index on public.boq_items
CREATE UNIQUE INDEX uq_boq_position_sub_number ON public.boq_items USING btree (client_position_id, sub_number);

-- Index on public.boq_items
CREATE UNIQUE INDEX uq_boq_tender_item_number ON public.boq_items USING btree (tender_id, item_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_additional ON public.client_positions USING btree (tender_id, is_additional, parent_position_id);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_hierarchy ON public.client_positions USING btree (tender_id, hierarchy_level, position_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_is_additional ON public.client_positions USING btree (is_additional) WHERE (is_additional = true);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_item_no ON public.client_positions USING btree (item_no);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_number ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_parent_position_id ON public.client_positions USING btree (parent_position_id) WHERE (parent_position_id IS NOT NULL);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_search_gin ON public.client_positions USING gin (to_tsvector('russian'::regconfig, ((((COALESCE(work_name, ''::text) || ' '::text) || (COALESCE(item_no, ''::character varying))::text) || ' '::text) || COALESCE(client_note, ''::text))));

-- Index on public.client_positions
CREATE INDEX idx_client_positions_tender_id ON public.client_positions USING btree (tender_id);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_tender_id_position ON public.client_positions USING btree (tender_id, position_number) WHERE (tender_id IS NOT NULL);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_tender_id_position_number ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_tender_position ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.client_positions
CREATE INDEX idx_client_positions_work_name ON public.client_positions USING gin (to_tsvector('russian'::regconfig, work_name));

-- Index on public.client_positions
CREATE UNIQUE INDEX uq_client_positions_position_tender ON public.client_positions USING btree (tender_id, position_number);

-- Index on public.commercial_costs_by_category
CREATE INDEX idx_commercial_costs_category ON public.commercial_costs_by_category USING btree (detail_cost_category_id);

-- Index on public.commercial_costs_by_category
CREATE INDEX idx_commercial_costs_tender ON public.commercial_costs_by_category USING btree (tender_id);

-- Index on public.commercial_costs_by_category
CREATE INDEX idx_commercial_costs_tender_category ON public.commercial_costs_by_category USING btree (tender_id, detail_cost_category_id);

-- Index on public.commercial_costs_by_category
CREATE UNIQUE INDEX unique_tender_category ON public.commercial_costs_by_category USING btree (tender_id, detail_cost_category_id);

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

-- Index on public.cost_redistribution_details
CREATE INDEX idx_redistribution_details_item ON public.cost_redistribution_details USING btree (boq_item_id);

-- Index on public.cost_redistribution_details
CREATE INDEX idx_redistribution_details_redistribution ON public.cost_redistribution_details USING btree (redistribution_id);

-- Index on public.cost_redistribution_details
CREATE UNIQUE INDEX unique_item_per_redistribution ON public.cost_redistribution_details USING btree (redistribution_id, boq_item_id);

-- Index on public.cost_redistributions
CREATE INDEX idx_cost_redistributions_active ON public.cost_redistributions USING btree (tender_id, is_active) WHERE (is_active = true);

-- Index on public.cost_redistributions
CREATE INDEX idx_cost_redistributions_tender ON public.cost_redistributions USING btree (tender_id);

-- Index on public.cost_redistributions
CREATE UNIQUE INDEX unique_active_per_tender ON public.cost_redistributions USING btree (tender_id) WHERE (is_active = true);

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

-- Index on public.material_names
CREATE INDEX idx_material_names_name ON public.material_names USING btree (name);

-- Index on public.material_names
CREATE UNIQUE INDEX material_names_name_key ON public.material_names USING btree (name);

-- Index on public.tender_cost_volumes
CREATE INDEX idx_tender_cost_volumes_category_id ON public.tender_cost_volumes USING btree (detail_cost_category_id);

-- Index on public.tender_cost_volumes
CREATE INDEX idx_tender_cost_volumes_tender_id ON public.tender_cost_volumes USING btree (tender_id);

-- Index on public.tender_cost_volumes
CREATE INDEX idx_tender_cost_volumes_unit_total ON public.tender_cost_volumes USING btree (unit_total);

-- Index on public.tender_cost_volumes
CREATE UNIQUE INDEX tender_cost_volumes_tender_id_detail_cost_category_id_key ON public.tender_cost_volumes USING btree (tender_id, detail_cost_category_id);

-- Index on public.tender_items
CREATE INDEX ix_tender_items_node ON public.tender_items USING btree (node_id);

-- Index on public.tender_items
CREATE INDEX ix_tender_items_tender ON public.tender_items USING btree (tender_id);

-- Index on public.tender_markup_percentages
CREATE INDEX idx_tender_markup_tender_active ON public.tender_markup_percentages USING btree (tender_id, is_active) WHERE (is_active = true);

-- Index on public.tender_markup_percentages
CREATE INDEX tender_markup_percentages_tender_id_idx ON public.tender_markup_percentages USING btree (tender_id);

-- Index on public.tender_markup_percentages
CREATE UNIQUE INDEX unique_active_markup_per_tender ON public.tender_markup_percentages USING btree (tender_id) WHERE (is_active = true);

-- Index on public.tender_version_history
CREATE INDEX idx_version_history_action ON public.tender_version_history USING btree (action);

-- Index on public.tender_version_history
CREATE INDEX idx_version_history_date ON public.tender_version_history USING btree (performed_at DESC);

-- Index on public.tender_version_history
CREATE INDEX idx_version_history_tender ON public.tender_version_history USING btree (tender_id);

-- Index on public.tender_version_history
CREATE UNIQUE INDEX tender_version_history_tender_id_version_number_key ON public.tender_version_history USING btree (tender_id, version_number);

-- Index on public.tender_version_mappings
CREATE INDEX idx_version_mappings_dop ON public.tender_version_mappings USING btree (is_dop) WHERE (is_dop = true);

-- Index on public.tender_version_mappings
CREATE INDEX idx_version_mappings_new_tender ON public.tender_version_mappings USING btree (new_tender_id);

-- Index on public.tender_version_mappings
CREATE INDEX idx_version_mappings_old_tender ON public.tender_version_mappings USING btree (old_tender_id);

-- Index on public.tender_version_mappings
CREATE INDEX idx_version_mappings_status ON public.tender_version_mappings USING btree (mapping_status);

-- Index on public.tender_version_mappings
CREATE INDEX idx_version_mappings_type ON public.tender_version_mappings USING btree (mapping_type);

-- Index on public.tender_version_mappings
CREATE UNIQUE INDEX tender_version_mappings_new_tender_id_new_position_id_key ON public.tender_version_mappings USING btree (new_tender_id, new_position_id);

-- Index on public.tender_version_mappings
CREATE UNIQUE INDEX tender_version_mappings_old_tender_id_old_position_id_new_t_key ON public.tender_version_mappings USING btree (old_tender_id, old_position_id, new_tender_id);

-- Index on public.tenders
CREATE INDEX idx_tenders_created_at ON public.tenders USING btree (created_at DESC);

-- Index on public.tenders
CREATE INDEX idx_tenders_parent_version ON public.tenders USING btree (parent_version_id);

-- Index on public.tenders
CREATE INDEX idx_tenders_tender_number ON public.tenders USING btree (tender_number);

-- Index on public.tenders
CREATE INDEX idx_tenders_updated_at ON public.tenders USING btree (updated_at DESC);

-- Index on public.tenders
CREATE INDEX idx_tenders_version_status ON public.tenders USING btree (version_status);

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
CREATE INDEX idx_work_material_links_items ON public.work_material_links USING btree (work_boq_item_id, material_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_material ON public.work_material_links USING btree (material_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_position ON public.work_material_links USING btree (client_position_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_position_work ON public.work_material_links USING btree (client_position_id, work_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_sub_material ON public.work_material_links USING btree (sub_material_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_sub_work ON public.work_material_links USING btree (sub_work_boq_item_id);

-- Index on public.work_material_links
CREATE INDEX idx_work_material_links_work ON public.work_material_links USING btree (work_boq_item_id);

-- Index on public.work_material_links
CREATE UNIQUE INDEX uq_sub_work_material_pair ON public.work_material_links USING btree (sub_work_boq_item_id, sub_material_boq_item_id);

-- Index on public.work_material_links
CREATE UNIQUE INDEX uq_work_material_pair ON public.work_material_links USING btree (work_boq_item_id, material_boq_item_id);

-- Index on public.work_material_templates
CREATE INDEX idx_work_material_templates_material_library_id ON public.work_material_templates USING btree (material_library_id);

-- Index on public.work_material_templates
CREATE INDEX idx_work_material_templates_sub_material_library_id ON public.work_material_templates USING btree (sub_material_library_id);

-- Index on public.work_material_templates
CREATE INDEX idx_work_material_templates_sub_work_library_id ON public.work_material_templates USING btree (sub_work_library_id);

-- Index on public.work_material_templates
CREATE INDEX idx_work_material_templates_template_name ON public.work_material_templates USING btree (template_name);

-- Index on public.work_material_templates
CREATE INDEX idx_work_material_templates_work_library_id ON public.work_material_templates USING btree (work_library_id);

-- Index on public.work_names
CREATE INDEX idx_work_names_name ON public.work_names USING btree (name);

-- Index on public.work_names
CREATE UNIQUE INDEX work_names_name_key ON public.work_names USING btree (name);

-- Index on realtime.messages
CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));

-- Index on realtime.messages_2025_09_29
CREATE INDEX messages_2025_09_29_inserted_at_topic_idx ON realtime.messages_2025_09_29 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));

-- Index on realtime.messages_2025_09_30
CREATE INDEX messages_2025_09_30_inserted_at_topic_idx ON realtime.messages_2025_09_30 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));

-- Index on realtime.messages_2025_10_01
CREATE INDEX messages_2025_10_01_inserted_at_topic_idx ON realtime.messages_2025_10_01 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));

-- Index on realtime.messages_2025_10_02
CREATE INDEX messages_2025_10_02_inserted_at_topic_idx ON realtime.messages_2025_10_02 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));

-- Index on realtime.messages_2025_10_03
CREATE INDEX messages_2025_10_03_inserted_at_topic_idx ON realtime.messages_2025_10_03 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));

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
-- GRANT USAGE ON SCHEMA pg_temp_19 TO postgres;
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
-- GRANT USAGE ON SCHEMA pg_temp_37 TO postgres;
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
-- GRANT USAGE ON SCHEMA pg_temp_6 TO postgres;
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
-- GRANT USAGE ON SCHEMA pg_toast_temp_19 TO postgres;
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
-- GRANT USAGE ON SCHEMA pg_toast_temp_37 TO postgres;
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
-- GRANT USAGE ON SCHEMA pg_toast_temp_6 TO postgres;
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
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_19 TO supabase_admin;
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
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_37 TO supabase_admin;
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
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_6 TO supabase_admin;
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
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_19 TO supabase_admin;
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
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_37 TO supabase_admin;
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
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_6 TO supabase_admin;
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
-- GRANT USAGE ON SCHEMA pg_temp_19 TO supabase_read_only_user;
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
-- GRANT USAGE ON SCHEMA pg_temp_37 TO supabase_read_only_user;
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
-- GRANT USAGE ON SCHEMA pg_temp_6 TO supabase_read_only_user;
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
-- GRANT USAGE ON SCHEMA pg_toast_temp_19 TO supabase_read_only_user;
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
-- GRANT USAGE ON SCHEMA pg_toast_temp_37 TO supabase_read_only_user;
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
-- GRANT USAGE ON SCHEMA pg_toast_temp_6 TO supabase_read_only_user;
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
