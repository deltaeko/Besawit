CREATE TABLE "platform_admin_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trial_request_id" uuid,
	"instance_id" uuid,
	"action" varchar(80) NOT NULL,
	"actor_user_id" uuid,
	"actor_name" varchar(150) NOT NULL,
	"actor_email" varchar(150) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_admin_events" ADD CONSTRAINT "platform_admin_events_trial_request_id_trial_requests_id_fk" FOREIGN KEY ("trial_request_id") REFERENCES "public"."trial_requests"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_admin_events" ADD CONSTRAINT "platform_admin_events_instance_id_app_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."app_instances"("id") ON DELETE set null ON UPDATE no action;
