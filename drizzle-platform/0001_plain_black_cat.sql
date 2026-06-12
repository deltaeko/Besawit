CREATE TYPE "public"."platform_notification_channel" AS ENUM('webhook');--> statement-breakpoint
CREATE TYPE "public"."platform_notification_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "platform_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trial_request_id" uuid,
	"instance_id" uuid,
	"notification_type" varchar(80) NOT NULL,
	"channel" "platform_notification_channel" DEFAULT 'webhook' NOT NULL,
	"status" "platform_notification_status" DEFAULT 'queued' NOT NULL,
	"recipient_email" varchar(150),
	"recipient_phone" varchar(30),
	"payload" jsonb,
	"response_payload" jsonb,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_trial_request_id_trial_requests_id_fk" FOREIGN KEY ("trial_request_id") REFERENCES "public"."trial_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_instance_id_app_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."app_instances"("id") ON DELETE set null ON UPDATE no action;