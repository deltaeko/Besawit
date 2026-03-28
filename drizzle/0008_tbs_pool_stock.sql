ALTER TABLE "tbs_sales" ADD COLUMN "warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "tbs_sales" ADD CONSTRAINT "tbs_sales_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tbs_sales_warehouse_idx" ON "tbs_sales" USING btree ("warehouse_id");--> statement-breakpoint

INSERT INTO "products" (
  "category_id",
  "code",
  "sku",
  "name",
  "unit",
  "purchase_price",
  "selling_price",
  "min_stock",
  "allow_negative_stock",
  "notes",
  "is_active"
)
VALUES (
  NULL,
  'SYS-TBS-POOL',
  NULL,
  'TBS Pool',
  'kg',
  '0.00',
  '0.00',
  '0.00',
  false,
  'Produk internal sistem untuk pooled stock TBS.',
  false
)
ON CONFLICT ("code") DO NOTHING;
