import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_NAME: z.string().default("Besawit"),
  APP_URL: z.url().default("http://localhost:3000"),
  APP_BASE_DOMAIN: z.string().default("localhost"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/besawit"),
  CONTROL_DATABASE_URL: z
    .string()
    .min(1)
    .optional(),
  TENANT_DATABASE_ADMIN_URL: z
    .string()
    .min(1)
    .optional(),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("change-this-secret-before-production"),
  ALLOW_NEGATIVE_STOCK: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DEFAULT_CURRENCY: z.string().default("IDR"),
  TRIAL_DURATION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  TRIAL_CONTACT_WHATSAPP: z.string().default("081278572233"),
  SUPPORT_WHATSAPP_HOURS: z.string().default("08.00 - 20.00 WIB"),
  TRIAL_DATABASE_PREFIX: z.string().default("besawit_trial"),
  PROVISION_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(10000),
  TRIAL_READY_WEBHOOK_URL: z.string().url().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.email().optional(),
  SMTP_FROM_NAME: z.string().min(1).optional(),
  BRANDING_UPLOAD_DIR: z.string().optional(),
  BRANDING_MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(10).default(4),
});

const parsedEnv = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL,
  APP_BASE_DOMAIN: process.env.APP_BASE_DOMAIN,
  DATABASE_URL: process.env.DATABASE_URL,
  CONTROL_DATABASE_URL: process.env.CONTROL_DATABASE_URL,
  TENANT_DATABASE_ADMIN_URL: process.env.TENANT_DATABASE_ADMIN_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  ALLOW_NEGATIVE_STOCK: process.env.ALLOW_NEGATIVE_STOCK,
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY,
  TRIAL_DURATION_DAYS: process.env.TRIAL_DURATION_DAYS,
  TRIAL_CONTACT_WHATSAPP: process.env.TRIAL_CONTACT_WHATSAPP,
  SUPPORT_WHATSAPP_HOURS: process.env.SUPPORT_WHATSAPP_HOURS,
  TRIAL_DATABASE_PREFIX: process.env.TRIAL_DATABASE_PREFIX,
  PROVISION_POLL_INTERVAL_MS: process.env.PROVISION_POLL_INTERVAL_MS,
  TRIAL_READY_WEBHOOK_URL: process.env.TRIAL_READY_WEBHOOK_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
  BRANDING_UPLOAD_DIR: process.env.BRANDING_UPLOAD_DIR,
  BRANDING_MAX_UPLOAD_MB: process.env.BRANDING_MAX_UPLOAD_MB,
});

export const env = {
  ...parsedEnv,
  CONTROL_DATABASE_URL: parsedEnv.CONTROL_DATABASE_URL ?? parsedEnv.DATABASE_URL,
  TENANT_DATABASE_ADMIN_URL:
    parsedEnv.TENANT_DATABASE_ADMIN_URL ?? parsedEnv.DATABASE_URL,
};
