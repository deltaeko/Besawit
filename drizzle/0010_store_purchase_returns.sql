CREATE TABLE "store_purchase_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"purchase_id" uuid NOT NULL,
	"return_date" timestamp with time zone DEFAULT now() NOT NULL,
	"total_return_amount" numeric(16, 2) NOT NULL,
	"notes" text,
	"created_by" uuid,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_purchase_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"purchase_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_cost" numeric(16, 2) NOT NULL,
	"line_total" numeric(16, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_purchase_returns" ADD CONSTRAINT "store_purchase_returns_purchase_id_store_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."store_purchases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "store_purchase_returns" ADD CONSTRAINT "store_purchase_returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "store_purchase_return_items" ADD CONSTRAINT "store_purchase_return_items_return_id_store_purchase_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."store_purchase_returns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "store_purchase_return_items" ADD CONSTRAINT "store_purchase_return_items_purchase_item_id_store_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."store_purchase_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "store_purchase_return_items" ADD CONSTRAINT "store_purchase_return_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "store_purchase_returns_code_idx" ON "store_purchase_returns" USING btree ("code");
--> statement-breakpoint
CREATE INDEX "store_purchase_returns_purchase_idx" ON "store_purchase_returns" USING btree ("purchase_id");
--> statement-breakpoint
CREATE INDEX "store_purchase_returns_date_idx" ON "store_purchase_returns" USING btree ("return_date");
--> statement-breakpoint
CREATE INDEX "store_purchase_return_items_return_idx" ON "store_purchase_return_items" USING btree ("return_id");
--> statement-breakpoint
CREATE INDEX "store_purchase_return_items_purchase_item_idx" ON "store_purchase_return_items" USING btree ("purchase_item_id");
