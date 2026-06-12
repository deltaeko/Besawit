CREATE TYPE "public"."app_instance_status" AS ENUM('queued', 'provisioning', 'ready', 'expired', 'suspended', 'archived', 'failed');--> statement-breakpoint
CREATE TYPE "public"."app_instance_type" AS ENUM('trial', 'paid', 'internal');--> statement-breakpoint
CREATE TYPE "public"."provision_job_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."trial_request_status" AS ENUM('submitted', 'queued', 'provisioning', 'ready', 'expired', 'converted', 'rejected', 'failed');--> statement-breakpoint
CREATE TABLE "app_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trial_request_id" uuid,
	"company_name" varchar(150) NOT NULL,
	"subdomain" varchar(120) NOT NULL,
	"instance_type" "app_instance_type" DEFAULT 'trial' NOT NULL,
	"status" "app_instance_status" DEFAULT 'queued' NOT NULL,
	"database_name" varchar(150),
	"database_url" text,
	"admin_email" varchar(150),
	"trial_starts_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provision_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trial_request_id" uuid,
	"instance_id" uuid,
	"job_type" varchar(80) NOT NULL,
	"status" "provision_job_status" DEFAULT 'queued' NOT NULL,
	"payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trial_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"company_name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"city" varchar(120),
	"notes" text,
	"requested_subdomain" varchar(120),
	"assigned_subdomain" varchar(120),
	"trial_starts_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"status" "trial_request_status" DEFAULT 'queued' NOT NULL,
	"contact_sent" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_instances" ADD CONSTRAINT "app_instances_trial_request_id_trial_requests_id_fk" FOREIGN KEY ("trial_request_id") REFERENCES "public"."trial_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provision_jobs" ADD CONSTRAINT "provision_jobs_trial_request_id_trial_requests_id_fk" FOREIGN KEY ("trial_request_id") REFERENCES "public"."trial_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provision_jobs" ADD CONSTRAINT "provision_jobs_instance_id_app_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."app_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_instances_subdomain_idx" ON "app_instances" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "trial_requests_email_company_idx" ON "trial_requests" USING btree ("email","company_name");