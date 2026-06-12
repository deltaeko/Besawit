CREATE TABLE IF NOT EXISTS "branding_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(32) DEFAULT 'default' NOT NULL,
	"company_name" varchar(150) NOT NULL,
	"app_display_name" varchar(150),
	"tagline" text,
	"logo_url" text,
	"logo_square_url" text,
	"favicon_url" text,
	"primary_color" varchar(20),
	"accent_color" varchar(20),
	"support_email" varchar(150),
	"support_phone" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "branding_settings_scope_idx" ON "branding_settings" USING btree ("scope");
--> statement-breakpoint
INSERT INTO "branding_settings" (
	"scope",
	"company_name",
	"app_display_name",
	"tagline",
	"primary_color",
	"accent_color"
)
SELECT
	'default',
	'Besawit',
	'Besawit',
	'Platform operasional sawit, inventory, toko pertanian, dan finance.',
	'#1f3b23',
	'#e0f46e'
WHERE NOT EXISTS (
	SELECT 1 FROM "branding_settings" WHERE "scope" = 'default'
);
