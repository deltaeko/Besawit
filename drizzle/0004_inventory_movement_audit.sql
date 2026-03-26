DO $$ BEGIN
 CREATE TYPE "public"."stock_mutation_reason" AS ENUM('correction', 'damaged', 'lost', 'transfer', 'stock_take', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "reason" "stock_mutation_reason" DEFAULT 'other' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "counterparty_warehouse_id" uuid;
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "before_quantity" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "after_quantity" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD COLUMN IF NOT EXISTS "target_warehouse_id" uuid;
--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD COLUMN IF NOT EXISTS "reason" "stock_mutation_reason" DEFAULT 'other' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD COLUMN IF NOT EXISTS "reason" "stock_mutation_reason" DEFAULT 'other' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD COLUMN IF NOT EXISTS "before_qty" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD COLUMN IF NOT EXISTS "after_qty" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
UPDATE "stock_movements"
SET
  "before_quantity" = COALESCE("before_quantity", 0),
  "after_quantity" = COALESCE(
    "after_quantity",
    CASE
      WHEN "movement_type" IN ('sales_out', 'adjustment_out', 'transfer_out') THEN 0
      ELSE COALESCE("quantity", 0)
    END
  ),
  "reason" = COALESCE("reason", 'other'::"stock_mutation_reason");
--> statement-breakpoint
UPDATE "stock_adjustments"
SET
  "reason" = COALESCE(
    "reason",
    CASE
      WHEN "stock_take_id" IS NOT NULL THEN 'stock_take'::"stock_mutation_reason"
      ELSE 'other'::"stock_mutation_reason"
    END
  );
--> statement-breakpoint
UPDATE "stock_adjustment_items"
SET
  "reason" = COALESCE("reason", 'other'::"stock_mutation_reason"),
  "before_qty" = COALESCE("before_qty", "system_qty", 0),
  "after_qty" = COALESCE("after_qty", "physical_qty", 0);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_counterparty_warehouse_id_warehouses_id_fk"
 FOREIGN KEY ("counterparty_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_target_warehouse_id_warehouses_id_fk"
 FOREIGN KEY ("target_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
