ALTER TABLE "customers" ADD COLUMN "farmer_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_farmer_id_idx" ON "customers" USING btree ("farmer_id");--> statement-breakpoint

CREATE TYPE "public"."settlement_input_mode" AS ENUM('value', 'percentage');--> statement-breakpoint

CREATE TABLE "tbs_purchase_store_offsets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "purchase_id" uuid NOT NULL,
  "payable_id" uuid,
  "farmer_id" uuid NOT NULL,
  "input_mode" "settlement_input_mode" NOT NULL,
  "input_percentage" numeric(8, 2),
  "input_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
  "base_amount" numeric(16, 2) NOT NULL,
  "requested_amount" numeric(16, 2) NOT NULL,
  "applied_amount" numeric(16, 2) NOT NULL,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tbs_purchase_store_offsets_purchase_id_tbs_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."tbs_purchases"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tbs_purchase_store_offsets_payable_id_payables_id_fk" FOREIGN KEY ("payable_id") REFERENCES "public"."payables"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "tbs_purchase_store_offsets_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "tbs_purchase_store_offsets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX "tbs_purchase_store_offsets_purchase_idx" ON "tbs_purchase_store_offsets" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "tbs_purchase_store_offsets_farmer_idx" ON "tbs_purchase_store_offsets" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "tbs_purchase_store_offsets_payable_idx" ON "tbs_purchase_store_offsets" USING btree ("payable_id");--> statement-breakpoint

CREATE TABLE "tbs_purchase_store_offset_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "offset_id" uuid NOT NULL,
  "receivable_id" uuid NOT NULL,
  "customer_id" uuid,
  "applied_amount" numeric(16, 2) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tbs_purchase_store_offset_items_offset_id_tbs_purchase_store_offsets_id_fk" FOREIGN KEY ("offset_id") REFERENCES "public"."tbs_purchase_store_offsets"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tbs_purchase_store_offset_items_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "tbs_purchase_store_offset_items_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "tbs_purchase_store_offset_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX "tbs_purchase_store_offset_items_offset_idx" ON "tbs_purchase_store_offset_items" USING btree ("offset_id");--> statement-breakpoint
CREATE INDEX "tbs_purchase_store_offset_items_receivable_idx" ON "tbs_purchase_store_offset_items" USING btree ("receivable_id");--> statement-breakpoint
CREATE INDEX "tbs_purchase_store_offset_items_customer_idx" ON "tbs_purchase_store_offset_items" USING btree ("customer_id");--> statement-breakpoint
