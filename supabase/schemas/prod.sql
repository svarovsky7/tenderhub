

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
    "manual_volume" numeric(12,4),
    "client_note" "text",
    "item_no" character varying(10) NOT NULL,
    "work_name" "text" NOT NULL,
    CONSTRAINT "chk_position_number_positive" CHECK (("position_number" > 0))
);


ALTER TABLE "public"."client_positions" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_positions" IS 'Позиции заказчика из Excel файла - верхний уровень группировки в BOQ';



COMMENT ON COLUMN "public"."client_positions"."position_number" IS 'Порядковый номер позиции в тендере (1, 2, 3...)';



COMMENT ON COLUMN "public"."client_positions"."unit" IS 'Единица измерения из Excel';



COMMENT ON COLUMN "public"."client_positions"."volume" IS 'Объем работ из Excel';

COMMENT ON COLUMN "public"."client_positions"."manual_volume" IS 'Объем работ, заданный вручную';



COMMENT ON COLUMN "public"."client_positions"."client_note" IS 'Примечание заказчика из Excel';



COMMENT ON COLUMN "public"."client_positions"."item_no" IS 'Номер пункта из Excel (столбец № п/п)';



COMMENT ON COLUMN "public"."client_positions"."work_name" IS 'Наименование работ из Excel';



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



CREATE INDEX "idx_works_library_name" ON "public"."works_library" USING "btree" ("name");



CREATE OR REPLACE TRIGGER "recalculate_totals_on_boq_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."boq_items" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_client_position_totals"();



CREATE OR REPLACE TRIGGER "update_boq_items_updated_at" BEFORE UPDATE ON "public"."boq_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_client_positions_updated_at" BEFORE UPDATE ON "public"."client_positions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_materials_library_updated_at" BEFORE UPDATE ON "public"."materials_library" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenders_updated_at" BEFORE UPDATE ON "public"."tenders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



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
