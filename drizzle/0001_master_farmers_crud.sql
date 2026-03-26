ALTER TABLE "farmers" ADD COLUMN "village" varchar(120);
--> statement-breakpoint
ALTER TABLE "farmers" ADD COLUMN "district_or_city" varchar(120);
--> statement-breakpoint
UPDATE "farmers"
SET
  "village" = COALESCE("village", "farm_location"),
  "district_or_city" = COALESCE("district_or_city", "city");
--> statement-breakpoint
ALTER TABLE "farmers" DROP COLUMN "email";
--> statement-breakpoint
ALTER TABLE "farmers" DROP COLUMN "city";
--> statement-breakpoint
ALTER TABLE "farmers" DROP COLUMN "farm_location";
