import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";
import * as platformSchema from "@/lib/platform/schema";

const globalForControlDb = globalThis as unknown as {
  controlPool?: Pool;
};

const controlPool =
  globalForControlDb.controlPool ??
  new Pool({
    connectionString: env.CONTROL_DATABASE_URL,
  });

if (env.NODE_ENV !== "production") {
  globalForControlDb.controlPool = controlPool;
}

export const controlDb = drizzle(controlPool, { schema: platformSchema });
export { controlPool };
