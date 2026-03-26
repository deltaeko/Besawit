import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_NAME: z.string().default("Besawit"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/besawit"),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("change-this-secret-before-production"),
  ALLOW_NEGATIVE_STOCK: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DEFAULT_CURRENCY: z.string().default("IDR"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  ALLOW_NEGATIVE_STOCK: process.env.ALLOW_NEGATIVE_STOCK,
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY,
});
