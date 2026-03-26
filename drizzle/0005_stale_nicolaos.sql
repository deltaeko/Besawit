CREATE TABLE "product_price_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"purchase_price" numeric(16, 2) DEFAULT '0' NOT NULL,
	"selling_price" numeric(16, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_price_histories" ADD CONSTRAINT "product_price_histories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_price_histories" ADD CONSTRAINT "product_price_histories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "product_price_histories_product_idx" ON "product_price_histories" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX "product_price_histories_effective_idx" ON "product_price_histories" USING btree ("effective_from");
--> statement-breakpoint
INSERT INTO "product_price_histories" (
	"product_id",
	"effective_from",
	"purchase_price",
	"selling_price",
	"notes",
	"created_by"
)
SELECT
	p."id",
	COALESCE(p."updated_at", p."created_at", now()),
	p."purchase_price",
	p."selling_price",
	'Harga awal produk dari data existing.',
	NULL
FROM "products" p
WHERE NOT EXISTS (
	SELECT 1
	FROM "product_price_histories" h
	WHERE h."product_id" = p."id"
);
