

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."boq_item_type" AS ENUM (
    'work',
    'material'
);


ALTER TYPE "public"."boq_item_type" OWNER TO "postgres";


CREATE TYPE "public"."client_position_status" AS ENUM (
    'active',
    'inactive',
    'completed'
);


ALTER TYPE "public"."client_position_status" OWNER TO "postgres";


CREATE TYPE "public"."tender_status" AS ENUM (
    'draft',
    'active',
    'submitted',
    'awarded',
    'closed'
);


ALTER TYPE "public"."tender_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_work_material_types"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Проверяем, что work_boq_item_id действительно указывает на работу
    IF NOT EXISTS (
        SELECT 1 FROM public.boq_items 
        WHERE id = NEW.work_boq_item_id 
        AND item_type = 'work'
    ) THEN
        RAISE EXCEPTION 'work_boq_item_id must reference a BOQ item with type "work"';
    END IF;
    
    -- Проверяем, что material_boq_item_id действительно указывает на материал
    IF NOT EXISTS (
        SELECT 1 FROM public.boq_items 
        WHERE id = NEW.material_boq_item_id 
        AND item_type = 'material'
    ) THEN
        RAISE EXCEPTION 'material_boq_item_id must reference a BOQ item with type "material"';
    END IF;
    
    -- Проверяем, что оба элемента принадлежат одной позиции
    IF NOT EXISTS (
        SELECT 1 FROM public.boq_items w, public.boq_items m
        WHERE w.id = NEW.work_boq_item_id 
        AND m.id = NEW.material_boq_item_id
        AND w.client_position_id = NEW.client_position_id
        AND m.client_position_id = NEW.client_position_id
    ) THEN
        RAISE EXCEPTION 'Both work and material must belong to the specified client position';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_work_material_types"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_materials_for_work"("p_work_boq_item_id" "uuid") RETURNS TABLE("link_id" "uuid", "material_id" "uuid", "material_description" "text", "material_unit" "text", "material_quantity" numeric, "material_unit_rate" numeric, "quantity_per_work" numeric, "usage_coefficient" numeric, "total_needed" numeric, "total_cost" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wml.id AS link_id,
        m.id AS material_id,
        m.description AS material_description,
        m.unit AS material_unit,
        m.quantity AS material_quantity,
        m.unit_rate AS material_unit_rate,
        wml.material_quantity_per_work AS quantity_per_work,
        wml.usage_coefficient,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient) AS total_needed,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient * m.unit_rate) AS total_cost
    FROM public.work_material_links wml
    INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
    INNER JOIN public.boq_items m ON wml.material_boq_item_id = m.id
    WHERE wml.work_boq_item_id = p_work_boq_item_id;
END;
$$;


ALTER FUNCTION "public"."get_materials_for_work"("p_work_boq_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_sub_number"("p_client_position_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_next_sub_number INTEGER;
BEGIN
  -- Lock the client position row to prevent concurrent modifications
  PERFORM 1 FROM public.client_positions WHERE id = p_client_position_id FOR UPDATE;
  
  -- Get the maximum sub_number for this position
  SELECT COALESCE(MAX(sub_number), 0) + 1
  INTO v_next_sub_number
  FROM public.boq_items
  WHERE client_position_id = p_client_position_id;
  
  RETURN v_next_sub_number;
END;
$$;


ALTER FUNCTION "public"."get_next_sub_number"("p_client_position_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_next_sub_number"("p_client_position_id" "uuid") IS 'Safely gets the next available sub_number for a client position with row locking to prevent duplicates';



CREATE OR REPLACE FUNCTION "public"."get_works_using_material"("p_material_boq_item_id" "uuid") RETURNS TABLE("link_id" "uuid", "work_id" "uuid", "work_description" "text", "work_unit" "text", "work_quantity" numeric, "work_unit_rate" numeric, "quantity_per_work" numeric, "usage_coefficient" numeric, "total_material_usage" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wml.id AS link_id,
        w.id AS work_id,
        w.description AS work_description,
        w.unit AS work_unit,
        w.quantity AS work_quantity,
        w.unit_rate AS work_unit_rate,
        wml.material_quantity_per_work AS quantity_per_work,
        wml.usage_coefficient,
        (w.quantity * wml.material_quantity_per_work * wml.usage_coefficient) AS total_material_usage
    FROM public.work_material_links wml
    INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
    WHERE wml.material_boq_item_id = p_material_boq_item_id;
END;
$$;


ALTER FUNCTION "public"."get_works_using_material"("p_material_boq_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_client_position_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."recalculate_client_position_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."boq_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tender_id" "uuid" NOT NULL,
    "client_position_id" "uuid",
    "item_number" "text" NOT NULL,
    "sub_number" integer DEFAULT 1,
    "sort_order" integer DEFAULT 0,
    "item_type" "public"."boq_item_type" NOT NULL,
    "description" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "quantity" numeric(12,4) NOT NULL,
    "unit_rate" numeric(12,4) NOT NULL,
    "total_amount" numeric(15,2) GENERATED ALWAYS AS (("quantity" * "unit_rate")) STORED,
    "material_id" "uuid",
    "work_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "imported_at" timestamp with time zone,
    "consumption_coefficient" numeric(12,4),
    "conversion_coefficient" numeric(12,4),
    CONSTRAINT "chk_item_type_reference" CHECK (((("item_type" = 'material'::"public"."boq_item_type") AND ("material_id" IS NOT NULL) AND ("work_id" IS NULL)) OR (("item_type" = 'work'::"public"."boq_item_type") AND ("work_id" IS NOT NULL) AND ("material_id" IS NULL)) OR (("item_type" = ANY (ARRAY['material'::"public"."boq_item_type", 'work'::"public"."boq_item_type"])) AND ("material_id" IS NULL) AND ("work_id" IS NULL)))),
    CONSTRAINT "chk_sort_order_valid" CHECK (("sort_order" >= 0)),
    CONSTRAINT "chk_sub_number_positive" CHECK (("sub_number" > 0)),
    CONSTRAINT "chk_unit_rate_positive" CHECK (("unit_rate" >= (0)::numeric))
);


ALTER TABLE "public"."boq_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."boq_items" IS 'Bill of Quantities line items for each tender';



COMMENT ON COLUMN "public"."boq_items"."item_number" IS 'Полный номер позиции в формате "X.Y" где X - номер позиции заказчика, Y - подномер';



COMMENT ON COLUMN "public"."boq_items"."sub_number" IS 'Подномер элемента внутри позиции заказчика (1, 2, 3...)';



COMMENT ON COLUMN "public"."boq_items"."sort_order" IS 'Порядок сортировки внутри позиции заказчика';



COMMENT ON COLUMN "public"."boq_items"."consumption_coefficient" IS 'Коэффициент расхода материала';



COMMENT ON COLUMN "public"."boq_items"."conversion_coefficient" IS 'Коэффициент перевода единицы измерения материала';



CREATE TABLE IF NOT EXISTS "public"."client_positions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tender_id" "uuid" NOT NULL,
    "position_number" integer NOT NULL,
    "total_materials_cost" numeric(15,2) DEFAULT 0,
    "total_works_cost" numeric(15,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit" "text",
    "volume" numeric(12,4),
    "client_note" "text",
    "item_no" character varying(10) NOT NULL,
    "work_name" "text" NOT NULL,
    "manual_volume" numeric,
    CONSTRAINT "chk_position_number_positive" CHECK (("position_number" > 0))
);


ALTER TABLE "public"."client_positions" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_positions" IS 'Позиции заказчика из Excel файла - верхний уровень группировки в BOQ';



COMMENT ON COLUMN "public"."client_positions"."position_number" IS 'Порядковый номер позиции в тендере (1, 2, 3...)';



COMMENT ON COLUMN "public"."client_positions"."unit" IS 'Единица измерения из Excel';



COMMENT ON COLUMN "public"."client_positions"."volume" IS 'Объем работ из Excel';



COMMENT ON COLUMN "public"."client_positions"."client_note" IS 'Примечание заказчика из Excel';



COMMENT ON COLUMN "public"."client_positions"."item_no" IS 'Номер пункта из Excel (столбец № п/п)';



COMMENT ON COLUMN "public"."client_positions"."work_name" IS 'Наименование работ из Excel';



COMMENT ON COLUMN "public"."client_positions"."manual_volume" IS 'Объём работ, заданный вручную';



CREATE TABLE IF NOT EXISTS "public"."materials_library" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "unit" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."materials_library" OWNER TO "postgres";


COMMENT ON TABLE "public"."materials_library" IS 'Master catalog of materials with pricing';



CREATE TABLE IF NOT EXISTS "public"."tenders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "client_name" "text" NOT NULL,
    "tender_number" "text" NOT NULL,
    "submission_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenders" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenders" IS 'Main tender projects with client details';



CREATE TABLE IF NOT EXISTS "public"."work_material_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_position_id" "uuid" NOT NULL,
    "work_boq_item_id" "uuid" NOT NULL,
    "material_boq_item_id" "uuid" NOT NULL,
    "material_quantity_per_work" numeric(12,4) DEFAULT 1.0000,
    "usage_coefficient" numeric(12,4) DEFAULT 1.0000,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_material_quantity_positive" CHECK (("material_quantity_per_work" > (0)::numeric)),
    CONSTRAINT "chk_usage_coefficient_positive" CHECK (("usage_coefficient" > (0)::numeric))
);


ALTER TABLE "public"."work_material_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_material_links" IS 'Связи между работами и материалами в позициях ВОРа заказчика';



COMMENT ON COLUMN "public"."work_material_links"."client_position_id" IS 'ID позиции заказчика, в которой находятся связываемые работы и материалы';



COMMENT ON COLUMN "public"."work_material_links"."work_boq_item_id" IS 'ID элемента BOQ типа work (работа)';



COMMENT ON COLUMN "public"."work_material_links"."material_boq_item_id" IS 'ID элемента BOQ типа material (материал)';



COMMENT ON COLUMN "public"."work_material_links"."material_quantity_per_work" IS 'Количество материала, необходимое на единицу работы';



COMMENT ON COLUMN "public"."work_material_links"."usage_coefficient" IS 'Коэффициент использования материала в работе';



COMMENT ON COLUMN "public"."work_material_links"."notes" IS 'Примечания к связи работы и материала';



CREATE OR REPLACE VIEW "public"."work_material_links_detailed" AS
 SELECT "wml"."id",
    "wml"."client_position_id",
    "wml"."work_boq_item_id",
    "wml"."material_boq_item_id",
    "wml"."material_quantity_per_work",
    "wml"."usage_coefficient",
    "wml"."notes",
    "wml"."created_at",
    "wml"."updated_at",
    "cp"."position_number",
    "cp"."work_name" AS "position_name",
    "cp"."tender_id",
    "w"."item_number" AS "work_item_number",
    "w"."description" AS "work_description",
    "w"."unit" AS "work_unit",
    "w"."quantity" AS "work_quantity",
    "w"."unit_rate" AS "work_unit_rate",
    "w"."total_amount" AS "work_total_amount",
    "m"."item_number" AS "material_item_number",
    "m"."description" AS "material_description",
    "m"."unit" AS "material_unit",
    "m"."quantity" AS "material_quantity",
    "m"."unit_rate" AS "material_unit_rate",
    "m"."total_amount" AS "material_total_amount",
    "m"."consumption_coefficient" AS "material_consumption_coefficient",
    "m"."conversion_coefficient" AS "material_conversion_coefficient",
    (("w"."quantity" * "wml"."material_quantity_per_work") * "wml"."usage_coefficient") AS "total_material_needed",
    ((("w"."quantity" * "wml"."material_quantity_per_work") * "wml"."usage_coefficient") * "m"."unit_rate") AS "total_material_cost"
   FROM ((("public"."work_material_links" "wml"
     JOIN "public"."client_positions" "cp" ON (("wml"."client_position_id" = "cp"."id")))
     JOIN "public"."boq_items" "w" ON (("wml"."work_boq_item_id" = "w"."id")))
     JOIN "public"."boq_items" "m" ON (("wml"."material_boq_item_id" = "m"."id")))
  WHERE (("w"."item_type" = 'work'::"public"."boq_item_type") AND ("m"."item_type" = 'material'::"public"."boq_item_type"));


ALTER VIEW "public"."work_material_links_detailed" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."works_library" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "unit" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."works_library" OWNER TO "postgres";


COMMENT ON TABLE "public"."works_library" IS 'Master catalog of work items with labor components';



ALTER TABLE ONLY "public"."boq_items"
    ADD CONSTRAINT "boq_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_positions"
    ADD CONSTRAINT "client_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials_library"
    ADD CONSTRAINT "materials_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenders"
    ADD CONSTRAINT "tenders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenders"
    ADD CONSTRAINT "tenders_tender_number_key" UNIQUE ("tender_number");



ALTER TABLE ONLY "public"."boq_items"
    ADD CONSTRAINT "uq_boq_position_sub_number" UNIQUE ("client_position_id", "sub_number");



ALTER TABLE ONLY "public"."boq_items"
    ADD CONSTRAINT "uq_boq_tender_item_number" UNIQUE ("tender_id", "item_number");



ALTER TABLE ONLY "public"."client_positions"
    ADD CONSTRAINT "uq_client_positions_tender_number" UNIQUE ("tender_id", "position_number");



ALTER TABLE ONLY "public"."work_material_links"
    ADD CONSTRAINT "uq_work_material_link" UNIQUE ("work_boq_item_id", "material_boq_item_id");



ALTER TABLE ONLY "public"."work_material_links"
    ADD CONSTRAINT "work_material_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."works_library"
    ADD CONSTRAINT "works_library_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_boq_items_client_position_id" ON "public"."boq_items" USING "btree" ("client_position_id");



CREATE INDEX "idx_boq_items_item_type" ON "public"."boq_items" USING "btree" ("item_type");



CREATE INDEX "idx_boq_items_material_id" ON "public"."boq_items" USING "btree" ("material_id") WHERE ("material_id" IS NOT NULL);



CREATE INDEX "idx_boq_items_tender_id" ON "public"."boq_items" USING "btree" ("tender_id");



CREATE INDEX "idx_boq_items_tender_id_item_type" ON "public"."boq_items" USING "btree" ("tender_id", "item_type");



CREATE INDEX "idx_boq_items_work_id" ON "public"."boq_items" USING "btree" ("work_id") WHERE ("work_id" IS NOT NULL);



CREATE INDEX "idx_client_positions_item_no" ON "public"."client_positions" USING "btree" ("item_no");



CREATE INDEX "idx_client_positions_number" ON "public"."client_positions" USING "btree" ("tender_id", "position_number");



CREATE INDEX "idx_client_positions_tender_id" ON "public"."client_positions" USING "btree" ("tender_id");



CREATE INDEX "idx_client_positions_tender_id_position_number" ON "public"."client_positions" USING "btree" ("tender_id", "position_number");



CREATE INDEX "idx_client_positions_work_name" ON "public"."client_positions" USING "gin" ("to_tsvector"('"russian"'::"regconfig", "work_name"));



CREATE INDEX "idx_materials_library_category" ON "public"."materials_library" USING "btree" ("category");



CREATE INDEX "idx_materials_library_name" ON "public"."materials_library" USING "btree" ("name");



CREATE INDEX "idx_tenders_created_at" ON "public"."tenders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_tenders_tender_number" ON "public"."tenders" USING "btree" ("tender_number");



CREATE INDEX "idx_work_material_links_material" ON "public"."work_material_links" USING "btree" ("material_boq_item_id");



CREATE INDEX "idx_work_material_links_position" ON "public"."work_material_links" USING "btree" ("client_position_id");



CREATE INDEX "idx_work_material_links_work" ON "public"."work_material_links" USING "btree" ("work_boq_item_id");



CREATE INDEX "idx_works_library_name" ON "public"."works_library" USING "btree" ("name");



CREATE OR REPLACE TRIGGER "check_work_material_types_trigger" BEFORE INSERT OR UPDATE ON "public"."work_material_links" FOR EACH ROW EXECUTE FUNCTION "public"."check_work_material_types"();



CREATE OR REPLACE TRIGGER "recalculate_totals_on_boq_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."boq_items" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_client_position_totals"();



CREATE OR REPLACE TRIGGER "update_boq_items_updated_at" BEFORE UPDATE ON "public"."boq_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_client_positions_updated_at" BEFORE UPDATE ON "public"."client_positions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_materials_library_updated_at" BEFORE UPDATE ON "public"."materials_library" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenders_updated_at" BEFORE UPDATE ON "public"."tenders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_work_material_links_updated_at" BEFORE UPDATE ON "public"."work_material_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_works_library_updated_at" BEFORE UPDATE ON "public"."works_library" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."boq_items"
    ADD CONSTRAINT "boq_items_client_position_id_fkey" FOREIGN KEY ("client_position_id") REFERENCES "public"."client_positions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boq_items"
    ADD CONSTRAINT "boq_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials_library"("id");



ALTER TABLE ONLY "public"."boq_items"
    ADD CONSTRAINT "boq_items_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boq_items"
    ADD CONSTRAINT "boq_items_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works_library"("id");



ALTER TABLE ONLY "public"."client_positions"
    ADD CONSTRAINT "client_positions_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_material_links"
    ADD CONSTRAINT "fk_work_material_links_material" FOREIGN KEY ("material_boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_material_links"
    ADD CONSTRAINT "fk_work_material_links_position" FOREIGN KEY ("client_position_id") REFERENCES "public"."client_positions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_material_links"
    ADD CONSTRAINT "fk_work_material_links_work" FOREIGN KEY ("work_boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE CASCADE;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."check_work_material_types"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_work_material_types"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_work_material_types"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_materials_for_work"("p_work_boq_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_materials_for_work"("p_work_boq_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_materials_for_work"("p_work_boq_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_sub_number"("p_client_position_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_sub_number"("p_client_position_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_sub_number"("p_client_position_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_works_using_material"("p_material_boq_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_works_using_material"("p_material_boq_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_works_using_material"("p_material_boq_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_client_position_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_client_position_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_client_position_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."boq_items" TO "anon";
GRANT ALL ON TABLE "public"."boq_items" TO "authenticated";
GRANT ALL ON TABLE "public"."boq_items" TO "service_role";



GRANT ALL ON TABLE "public"."client_positions" TO "anon";
GRANT ALL ON TABLE "public"."client_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."client_positions" TO "service_role";



GRANT ALL ON TABLE "public"."materials_library" TO "anon";
GRANT ALL ON TABLE "public"."materials_library" TO "authenticated";
GRANT ALL ON TABLE "public"."materials_library" TO "service_role";



GRANT ALL ON TABLE "public"."tenders" TO "anon";
GRANT ALL ON TABLE "public"."tenders" TO "authenticated";
GRANT ALL ON TABLE "public"."tenders" TO "service_role";



GRANT ALL ON TABLE "public"."work_material_links" TO "anon";
GRANT ALL ON TABLE "public"."work_material_links" TO "authenticated";
GRANT ALL ON TABLE "public"."work_material_links" TO "service_role";



GRANT ALL ON TABLE "public"."work_material_links_detailed" TO "anon";
GRANT ALL ON TABLE "public"."work_material_links_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."work_material_links_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."works_library" TO "anon";
GRANT ALL ON TABLE "public"."works_library" TO "authenticated";
GRANT ALL ON TABLE "public"."works_library" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
111