CREATE TYPE "public"."adjustment_status" AS ENUM('pending', 'approved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cash_transaction_type" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."deduction_type" AS ENUM('trash', 'water', 'sand_mud', 'fronds', 'others');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('payable_statement', 'receivable_statement', 'payment_receipt', 'store_invoice', 'stock_take_report');--> statement-breakpoint
CREATE TYPE "public"."finance_source_type" AS ENUM('tbs_purchase', 'tbs_sale', 'store_purchase', 'store_sale', 'manual');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('opening_balance', 'purchase_in', 'sales_out', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out');--> statement-breakpoint
CREATE TYPE "public"."payable_party_type" AS ENUM('farmer', 'supplier', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'giro', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partial', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."receivable_party_type" AS ENUM('factory', 'customer', 'other');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'cancelled', 'void');--> statement-breakpoint
CREATE TYPE "public"."reference_type" AS ENUM('tbs_purchase', 'tbs_sale', 'store_purchase', 'store_sale', 'stock_take', 'stock_adjustment', 'payment', 'manual');--> statement-breakpoint
CREATE TYPE "public"."return_action_type" AS ENUM('disposed', 'resold', 'returned_to_farmer');--> statement-breakpoint
CREATE TYPE "public"."sale_type" AS ENUM('cash', 'credit');--> statement-breakpoint
CREATE TYPE "public"."send_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."stock_take_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid,
	"action" varchar(80) NOT NULL,
	"actor_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"transaction_date" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "cash_transaction_type" NOT NULL,
	"category" varchar(100) NOT NULL,
	"reference_type" "reference_type",
	"reference_id" uuid,
	"amount" numeric(16, 2) NOT NULL,
	"description" text,
	"created_by" uuid,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(30),
	"email" varchar(150),
	"address" text,
	"city" varchar(120),
	"contact_person" varchar(120),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" "document_type" NOT NULL,
	"reference_type" "reference_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"file_name" varchar(200),
	"file_url" text,
	"payload" jsonb,
	"status" "send_status" DEFAULT 'pending' NOT NULL,
	"printed_by" uuid,
	"printed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(30),
	"license_number" varchar(100),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(30),
	"email" varchar(150),
	"address" text,
	"city" varchar(120),
	"contact_person" varchar(120),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(30),
	"email" varchar(150),
	"address" text,
	"city" varchar(120),
	"farm_location" varchar(150),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"source_type" "finance_source_type" NOT NULL,
	"source_id" uuid,
	"party_type" "payable_party_type" NOT NULL,
	"farmer_id" uuid,
	"supplier_id" uuid,
	"due_date" timestamp with time zone,
	"amount" numeric(16, 2) NOT NULL,
	"paid_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"outstanding_amount" numeric(16, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"direction" "payment_direction" NOT NULL,
	"method" "payment_method" NOT NULL,
	"payable_id" uuid,
	"receivable_id" uuid,
	"amount" numeric(16, 2) NOT NULL,
	"notes" text,
	"created_by" uuid,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"code" varchar(50) NOT NULL,
	"sku" varchar(80),
	"name" varchar(150) NOT NULL,
	"unit" varchar(30) NOT NULL,
	"purchase_price" numeric(16, 2) DEFAULT '0' NOT NULL,
	"selling_price" numeric(16, 2) DEFAULT '0' NOT NULL,
	"min_stock" numeric(14, 2) DEFAULT '0' NOT NULL,
	"allow_negative_stock" boolean DEFAULT false NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"source_type" "finance_source_type" NOT NULL,
	"source_id" uuid,
	"party_type" "receivable_party_type" NOT NULL,
	"factory_id" uuid,
	"customer_id" uuid,
	"due_date" timestamp with time zone,
	"amount" numeric(16, 2) NOT NULL,
	"paid_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"outstanding_amount" numeric(16, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"adjustment_type" "movement_type" NOT NULL,
	"system_qty" numeric(14, 2) NOT NULL,
	"physical_qty" numeric(14, 2) NOT NULL,
	"adjustment_qty" numeric(14, 2) NOT NULL,
	"unit_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"variance_value" numeric(16, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"stock_take_id" uuid,
	"status" "adjustment_status" DEFAULT 'pending' NOT NULL,
	"total_variance_value" numeric(16, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"warehouse_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"average_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"last_movement_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balances_warehouse_id_product_id_pk" PRIMARY KEY("warehouse_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"reference_type" "reference_type" NOT NULL,
	"reference_id" uuid,
	"movement_type" "movement_type" NOT NULL,
	"movement_date" timestamp with time zone DEFAULT now() NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_value" numeric(16, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_take_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_take_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"system_qty" numeric(14, 2) NOT NULL,
	"physical_qty" numeric(14, 2) NOT NULL,
	"variance_qty" numeric(14, 2) NOT NULL,
	"unit_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"variance_value" numeric(16, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_takes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"stock_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "stock_take_status" DEFAULT 'draft' NOT NULL,
	"variance_value" numeric(16, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_cost" numeric(16, 2) NOT NULL,
	"line_total" numeric(16, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"transaction_date" timestamp with time zone DEFAULT now() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"invoice_number" varchar(100),
	"subtotal" numeric(16, 2) NOT NULL,
	"discount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(16, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_price" numeric(16, 2) NOT NULL,
	"line_total" numeric(16, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"transaction_date" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"invoice_number" varchar(100),
	"sale_type" "sale_type" NOT NULL,
	"subtotal" numeric(16, 2) NOT NULL,
	"discount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(16, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(30),
	"email" varchar(150),
	"address" text,
	"city" varchar(120),
	"contact_person" varchar(120),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tbs_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"purchase_date" timestamp with time zone DEFAULT now() NOT NULL,
	"farmer_id" uuid NOT NULL,
	"driver_id" uuid,
	"vehicle_id" uuid,
	"warehouse_id" uuid,
	"gross_weight" numeric(14, 2) NOT NULL,
	"tare_weight" numeric(14, 2) NOT NULL,
	"net_weight" numeric(14, 2) NOT NULL,
	"buying_price_per_kg" numeric(16, 2) NOT NULL,
	"total_purchase" numeric(16, 2) NOT NULL,
	"transport_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"loading_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"other_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_operational_cost" numeric(16, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tbs_sale_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"type" "deduction_type" NOT NULL,
	"weight" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tbs_sale_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"return_weight" numeric(14, 2) NOT NULL,
	"return_reason" text NOT NULL,
	"action_type" "return_action_type" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tbs_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"sale_date" timestamp with time zone DEFAULT now() NOT NULL,
	"reference_purchase_id" uuid NOT NULL,
	"factory_id" uuid NOT NULL,
	"gross_weight" numeric(14, 2) NOT NULL,
	"tare_weight" numeric(14, 2) NOT NULL,
	"net_weight_initial" numeric(14, 2) NOT NULL,
	"total_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"return_weight" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_weight_final" numeric(14, 2) NOT NULL,
	"selling_price_per_kg" numeric(16, 2) NOT NULL,
	"total_sales" numeric(16, 2) NOT NULL,
	"margin" numeric(16, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"phone" varchar(30),
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"plate_number" varchar(50) NOT NULL,
	"type" varchar(100),
	"capacity_kg" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_type" "reference_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"destination" varchar(30) NOT NULL,
	"message" text NOT NULL,
	"provider" varchar(100) DEFAULT 'manual' NOT NULL,
	"status" "send_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"payload" jsonb,
	"sent_by" uuid,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_printed_by_users_id_fk" FOREIGN KEY ("printed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payable_id_payables_id_fk" FOREIGN KEY ("payable_id") REFERENCES "public"."payables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_adjustment_id_stock_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."stock_adjustments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_stock_take_id_stock_takes_id_fk" FOREIGN KEY ("stock_take_id") REFERENCES "public"."stock_takes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_take_items" ADD CONSTRAINT "stock_take_items_stock_take_id_stock_takes_id_fk" FOREIGN KEY ("stock_take_id") REFERENCES "public"."stock_takes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_take_items" ADD CONSTRAINT "stock_take_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_takes" ADD CONSTRAINT "stock_takes_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_takes" ADD CONSTRAINT "stock_takes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_takes" ADD CONSTRAINT "stock_takes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_purchase_items" ADD CONSTRAINT "store_purchase_items_purchase_id_store_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."store_purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_purchase_items" ADD CONSTRAINT "store_purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sale_items" ADD CONSTRAINT "store_sale_items_sale_id_store_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."store_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sale_items" ADD CONSTRAINT "store_sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sales" ADD CONSTRAINT "store_sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sales" ADD CONSTRAINT "store_sales_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sales" ADD CONSTRAINT "store_sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_purchases" ADD CONSTRAINT "tbs_purchases_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_purchases" ADD CONSTRAINT "tbs_purchases_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_purchases" ADD CONSTRAINT "tbs_purchases_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_purchases" ADD CONSTRAINT "tbs_purchases_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_purchases" ADD CONSTRAINT "tbs_purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_sale_deductions" ADD CONSTRAINT "tbs_sale_deductions_sale_id_tbs_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."tbs_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_sale_returns" ADD CONSTRAINT "tbs_sale_returns_sale_id_tbs_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."tbs_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_sales" ADD CONSTRAINT "tbs_sales_reference_purchase_id_tbs_purchases_id_fk" FOREIGN KEY ("reference_purchase_id") REFERENCES "public"."tbs_purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_sales" ADD CONSTRAINT "tbs_sales_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tbs_sales" ADD CONSTRAINT "tbs_sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_transactions_code_idx" ON "cash_transactions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "cash_transactions_date_idx" ON "cash_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_code_idx" ON "customers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "document_logs_reference_idx" ON "document_logs" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_code_idx" ON "drivers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "factories_code_idx" ON "factories" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "farmers_code_idx" ON "farmers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "payables_code_idx" ON "payables" USING btree ("code");--> statement-breakpoint
CREATE INDEX "payables_status_idx" ON "payables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payables_source_idx" ON "payables" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_code_idx" ON "payments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_code_idx" ON "product_categories" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_code_idx" ON "products" USING btree ("code");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receivables_code_idx" ON "receivables" USING btree ("code");--> statement-breakpoint
CREATE INDEX "receivables_status_idx" ON "receivables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "receivables_source_idx" ON "receivables" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_code_idx" ON "roles" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "stock_adjustment_items_adjustment_idx" ON "stock_adjustment_items" USING btree ("adjustment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_adjustments_code_idx" ON "stock_adjustments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "stock_adjustments_stock_take_idx" ON "stock_adjustments" USING btree ("stock_take_id");--> statement-breakpoint
CREATE INDEX "stock_balances_product_idx" ON "stock_balances" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_warehouse_idx" ON "stock_movements" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "stock_movements_reference_idx" ON "stock_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "stock_take_items_stock_take_idx" ON "stock_take_items" USING btree ("stock_take_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_takes_code_idx" ON "stock_takes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "stock_takes_warehouse_idx" ON "stock_takes" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "store_purchase_items_purchase_idx" ON "store_purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_purchases_code_idx" ON "store_purchases" USING btree ("code");--> statement-breakpoint
CREATE INDEX "store_purchases_supplier_idx" ON "store_purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "store_sale_items_sale_idx" ON "store_sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_sales_code_idx" ON "store_sales" USING btree ("code");--> statement-breakpoint
CREATE INDEX "store_sales_customer_idx" ON "store_sales" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_code_idx" ON "suppliers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "tbs_purchases_code_idx" ON "tbs_purchases" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tbs_purchases_farmer_idx" ON "tbs_purchases" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "tbs_purchases_date_idx" ON "tbs_purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "tbs_sale_deductions_sale_idx" ON "tbs_sale_deductions" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "tbs_sale_returns_sale_idx" ON "tbs_sale_returns" USING btree ("sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tbs_sales_code_idx" ON "tbs_sales" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tbs_sales_purchase_idx" ON "tbs_sales" USING btree ("reference_purchase_id");--> statement-breakpoint
CREATE INDEX "tbs_sales_factory_idx" ON "tbs_sales" USING btree ("factory_id");--> statement-breakpoint
CREATE INDEX "tbs_sales_date_idx" ON "tbs_sales" USING btree ("sale_date");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_code_idx" ON "vehicles" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_number_idx" ON "vehicles" USING btree ("plate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_code_idx" ON "warehouses" USING btree ("code");--> statement-breakpoint
CREATE INDEX "whatsapp_logs_reference_idx" ON "whatsapp_logs" USING btree ("reference_type","reference_id");