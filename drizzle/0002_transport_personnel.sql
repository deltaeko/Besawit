DO $$ BEGIN
 CREATE TYPE "public"."transport_personnel_role" AS ENUM('driver', 'co_driver', 'helper');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transport_personnel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "role" "transport_personnel_role" NOT NULL,
  "name" varchar(150) NOT NULL,
  "phone" varchar(30),
  "identity_number" varchar(100),
  "primary_vehicle_id" uuid,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transport_personnel" ADD CONSTRAINT "transport_personnel_primary_vehicle_id_vehicles_id_fk"
 FOREIGN KEY ("primary_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transport_personnel_code_idx" ON "transport_personnel" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transport_personnel_role_idx" ON "transport_personnel" USING btree ("role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transport_personnel_vehicle_idx" ON "transport_personnel" USING btree ("primary_vehicle_id");
