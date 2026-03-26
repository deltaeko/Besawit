ALTER TABLE "tbs_purchases" DROP CONSTRAINT "tbs_purchases_driver_id_drivers_id_fk";--> statement-breakpoint
ALTER TABLE "transport_personnel" ADD COLUMN "license_number" varchar(100);--> statement-breakpoint

CREATE TEMP TABLE "driver_personnel_map" (
  "driver_id" uuid PRIMARY KEY,
  "personnel_id" uuid NOT NULL
);--> statement-breakpoint

INSERT INTO "driver_personnel_map" ("driver_id", "personnel_id")
SELECT
  d."id",
  matched."id"
FROM "drivers" d
JOIN LATERAL (
  SELECT tp."id"
  FROM "transport_personnel" tp
  WHERE tp."role" = 'driver'
    AND lower(tp."name") = lower(d."name")
    AND coalesce(tp."phone", '') = coalesce(d."phone", '')
  ORDER BY tp."created_at" ASC
  LIMIT 1
) matched ON true;--> statement-breakpoint

UPDATE "transport_personnel" tp
SET
  "license_number" = COALESCE(tp."license_number", d."license_number"),
  "is_active" = d."is_active",
  "updated_at" = now()
FROM "drivers" d
JOIN "driver_personnel_map" map ON map."driver_id" = d."id"
WHERE tp."id" = map."personnel_id";--> statement-breakpoint

INSERT INTO "transport_personnel" (
  "code",
  "role",
  "name",
  "phone",
  "license_number",
  "identity_number",
  "primary_vehicle_id",
  "notes",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  d."code",
  'driver',
  d."name",
  d."phone",
  d."license_number",
  NULL,
  NULL,
  d."notes",
  d."is_active",
  d."created_at",
  d."updated_at"
FROM "drivers" d
LEFT JOIN "driver_personnel_map" map ON map."driver_id" = d."id"
WHERE map."driver_id" IS NULL;--> statement-breakpoint

INSERT INTO "driver_personnel_map" ("driver_id", "personnel_id")
SELECT
  d."id",
  tp."id"
FROM "drivers" d
JOIN "transport_personnel" tp
  ON tp."code" = d."code"
 AND tp."role" = 'driver'
LEFT JOIN "driver_personnel_map" map ON map."driver_id" = d."id"
WHERE map."driver_id" IS NULL;--> statement-breakpoint

UPDATE "tbs_purchases" p
SET "driver_id" = map."personnel_id"
FROM "driver_personnel_map" map
WHERE p."driver_id" = map."driver_id";--> statement-breakpoint

DROP TABLE "driver_personnel_map";--> statement-breakpoint
DROP TABLE "drivers";--> statement-breakpoint

ALTER TABLE "tbs_purchases"
  ADD CONSTRAINT "tbs_purchases_driver_id_transport_personnel_id_fk"
  FOREIGN KEY ("driver_id")
  REFERENCES "public"."transport_personnel"("id")
  ON DELETE no action
  ON UPDATE no action;
