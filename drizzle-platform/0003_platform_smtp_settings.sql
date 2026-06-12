CREATE TYPE "public"."platform_smtp_test_status" AS ENUM('never', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "platform_smtp_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(32) DEFAULT 'default' NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer NOT NULL,
	"secure" boolean DEFAULT false NOT NULL,
	"username" varchar(255) NOT NULL,
	"password_encrypted" text NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"from_name" varchar(150) NOT NULL,
	"last_test_status" "platform_smtp_test_status" DEFAULT 'never' NOT NULL,
	"last_test_error" text,
	"last_test_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_smtp_settings_scope_idx" ON "platform_smtp_settings" USING btree ("scope");
