DO $$ BEGIN
 ALTER TYPE "public"."deduction_type" ADD VALUE IF NOT EXISTS 'unripe';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."deduction_type" ADD VALUE IF NOT EXISTS 'long_stalk';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."deduction_input_mode" AS ENUM('kg', 'percentage', 'nominal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tbs_deduction_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "legacy_type" "deduction_type",
  "default_input_mode" "deduction_input_mode" DEFAULT 'kg' NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "factory_deduction_defaults" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "factory_id" uuid NOT NULL,
  "deduction_config_id" uuid NOT NULL,
  "input_mode" "deduction_input_mode" DEFAULT 'kg' NOT NULL,
  "default_value" numeric(16, 2) DEFAULT '0' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tbs_sales" ADD COLUMN IF NOT EXISTS "gross_sales_amount" numeric(16, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tbs_sales" ADD COLUMN IF NOT EXISTS "total_deduction_amount" numeric(16, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
UPDATE "tbs_sales"
SET
  "gross_sales_amount" = COALESCE("gross_sales_amount", "total_sales", 0),
  "total_deduction_amount" = COALESCE("total_deduction_amount", 0);
--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD COLUMN IF NOT EXISTS "config_id" uuid;
--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD COLUMN IF NOT EXISTS "label" varchar(150);
--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD COLUMN IF NOT EXISTS "input_mode" "deduction_input_mode" DEFAULT 'kg' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD COLUMN IF NOT EXISTS "input_value" numeric(16, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD COLUMN IF NOT EXISTS "percentage_value" numeric(10, 4) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD COLUMN IF NOT EXISTS "deduction_amount" numeric(16, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "tbs_sale_deductions"
SET
  "label" = COALESCE(
    "label",
    CASE "type"
      WHEN 'trash' THEN 'Sampah'
      WHEN 'water' THEN 'Air'
      WHEN 'sand_mud' THEN 'Pasir/Lumpur'
      WHEN 'fronds' THEN 'Pelepah/Tangkai'
      WHEN 'unripe' THEN 'Mentah'
      WHEN 'long_stalk' THEN 'Tangkai Panjang'
      ELSE 'Lainnya'
    END
  ),
  "input_mode" = COALESCE("input_mode", 'kg'),
  "input_value" = COALESCE(NULLIF("input_value", 0), "weight", 0),
  "percentage_value" = COALESCE("percentage_value", 0),
  "deduction_amount" = COALESCE("deduction_amount", 0),
  "sort_order" = COALESCE("sort_order", 0);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "factory_deduction_defaults" ADD CONSTRAINT "factory_deduction_defaults_factory_id_factories_id_fk"
 FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "factory_deduction_defaults" ADD CONSTRAINT "factory_deduction_defaults_deduction_config_id_tbs_deduction_configs_id_fk"
 FOREIGN KEY ("deduction_config_id") REFERENCES "public"."tbs_deduction_configs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tbs_sale_deductions" ADD CONSTRAINT "tbs_sale_deductions_config_id_tbs_deduction_configs_id_fk"
 FOREIGN KEY ("config_id") REFERENCES "public"."tbs_deduction_configs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tbs_deduction_configs_code_idx" ON "tbs_deduction_configs" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tbs_deduction_configs_active_idx" ON "tbs_deduction_configs" USING btree ("is_active");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "factory_deduction_defaults_factory_config_idx" ON "factory_deduction_defaults" USING btree ("factory_id","deduction_config_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factory_deduction_defaults_factory_idx" ON "factory_deduction_defaults" USING btree ("factory_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tbs_sale_deductions_config_idx" ON "tbs_sale_deductions" USING btree ("config_id");
