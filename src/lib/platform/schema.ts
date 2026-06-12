import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const trialRequestStatusEnum = pgEnum("trial_request_status", [
  "submitted",
  "queued",
  "provisioning",
  "ready",
  "expired",
  "converted",
  "rejected",
  "failed",
]);

export const appInstanceTypeEnum = pgEnum("app_instance_type", [
  "trial",
  "paid",
  "internal",
]);

export const appInstanceStatusEnum = pgEnum("app_instance_status", [
  "queued",
  "provisioning",
  "ready",
  "expired",
  "suspended",
  "archived",
  "failed",
]);

export const provisionJobStatusEnum = pgEnum("provision_job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);
export const platformNotificationStatusEnum = pgEnum(
  "platform_notification_status",
  ["queued", "sent", "failed", "skipped"],
);
export const platformNotificationChannelEnum = pgEnum(
  "platform_notification_channel",
  ["webhook"],
);
export const platformSmtpTestStatusEnum = pgEnum("platform_smtp_test_status", [
  "never",
  "success",
  "failed",
]);

export const trialRequests = pgTable(
  "trial_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    companyName: varchar("company_name", { length: 150 }).notNull(),
    email: varchar("email", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    city: varchar("city", { length: 120 }),
    notes: text("notes"),
    requestedSubdomain: varchar("requested_subdomain", { length: 120 }),
    assignedSubdomain: varchar("assigned_subdomain", { length: 120 }),
    trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    status: trialRequestStatusEnum("status").default("queued").notNull(),
    contactSent: boolean("contact_sent").default(false).notNull(),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("trial_requests_email_company_idx").on(table.email, table.companyName),
  ],
);

export const appInstances = pgTable(
  "app_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trialRequestId: uuid("trial_request_id").references(() => trialRequests.id, {
      onDelete: "set null",
    }),
    companyName: varchar("company_name", { length: 150 }).notNull(),
    subdomain: varchar("subdomain", { length: 120 }).notNull(),
    instanceType: appInstanceTypeEnum("instance_type").default("trial").notNull(),
    status: appInstanceStatusEnum("status").default("queued").notNull(),
    databaseName: varchar("database_name", { length: 150 }),
    databaseUrl: text("database_url"),
    adminEmail: varchar("admin_email", { length: 150 }),
    trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (table) => [uniqueIndex("app_instances_subdomain_idx").on(table.subdomain)],
);

export const provisionJobs = pgTable("provision_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  trialRequestId: uuid("trial_request_id").references(() => trialRequests.id, {
    onDelete: "set null",
  }),
  instanceId: uuid("instance_id").references(() => appInstances.id, {
    onDelete: "set null",
  }),
  jobType: varchar("job_type", { length: 80 }).notNull(),
  status: provisionJobStatusEnum("status").default("queued").notNull(),
  payload: jsonb("payload"),
  attempts: integer("attempts").default(0).notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
});

export const platformNotifications = pgTable("platform_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  trialRequestId: uuid("trial_request_id").references(() => trialRequests.id, {
    onDelete: "set null",
  }),
  instanceId: uuid("instance_id").references(() => appInstances.id, {
    onDelete: "set null",
  }),
  notificationType: varchar("notification_type", { length: 80 }).notNull(),
  channel: platformNotificationChannelEnum("channel").default("webhook").notNull(),
  status: platformNotificationStatusEnum("status").default("queued").notNull(),
  recipientEmail: varchar("recipient_email", { length: 150 }),
  recipientPhone: varchar("recipient_phone", { length: 30 }),
  payload: jsonb("payload"),
  responsePayload: jsonb("response_payload"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
});

export const platformAdminEvents = pgTable("platform_admin_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  trialRequestId: uuid("trial_request_id").references(() => trialRequests.id, {
    onDelete: "set null",
  }),
  instanceId: uuid("instance_id").references(() => appInstances.id, {
    onDelete: "set null",
  }),
  action: varchar("action", { length: 80 }).notNull(),
  actorUserId: uuid("actor_user_id"),
  actorName: varchar("actor_name", { length: 150 }).notNull(),
  actorEmail: varchar("actor_email", { length: 150 }).notNull(),
  payload: jsonb("payload"),
  ...timestamps,
});

export const platformSmtpSettings = pgTable(
  "platform_smtp_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: varchar("scope", { length: 32 }).default("default").notNull(),
    host: varchar("host", { length: 255 }).notNull(),
    port: integer("port").notNull(),
    secure: boolean("secure").default(false).notNull(),
    username: varchar("username", { length: 255 }).notNull(),
    passwordEncrypted: text("password_encrypted").notNull(),
    fromEmail: varchar("from_email", { length: 255 }).notNull(),
    fromName: varchar("from_name", { length: 150 }).notNull(),
    leadInboxEmail: varchar("lead_inbox_email", { length: 255 }),
    lastTestStatus: platformSmtpTestStatusEnum("last_test_status")
      .default("never")
      .notNull(),
    lastTestError: text("last_test_error"),
    lastTestAt: timestamp("last_test_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("platform_smtp_settings_scope_idx").on(table.scope)],
);

export type TrialRequest = typeof trialRequests.$inferSelect;
export type AppInstance = typeof appInstances.$inferSelect;
export type ProvisionJob = typeof provisionJobs.$inferSelect;
export type PlatformNotification = typeof platformNotifications.$inferSelect;
export type PlatformAdminEvent = typeof platformAdminEvents.$inferSelect;
export type PlatformSmtpSetting = typeof platformSmtpSettings.$inferSelect;
