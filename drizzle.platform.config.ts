import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/platform/schema.ts",
  out: "./drizzle-platform",
  dbCredentials: {
    url:
      process.env.CONTROL_DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/besawit_control",
  },
  verbose: true,
  strict: true,
});
