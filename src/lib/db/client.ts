import { AsyncLocalStorage } from "node:async_hooks";

import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";
import { resolveTenantContextByHost, resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";

const globalForDb = globalThis as unknown as {
  pool?: Pool;
  poolsByConnectionString?: Map<string, Pool>;
};
const dbContext = new AsyncLocalStorage<NodePgDatabase<typeof schema>>();

export function createPool(connectionString: string) {
  return new Pool({
    connectionString,
  });
}

export function createDb(poolInstance: Pool): NodePgDatabase<typeof schema> {
  return drizzle(poolInstance, { schema });
}

const pool = globalForDb.pool ?? createPool(env.DATABASE_URL);
const poolsByConnectionString =
  globalForDb.poolsByConnectionString ?? new Map<string, Pool>();

globalForDb.pool = pool;
globalForDb.poolsByConnectionString = poolsByConnectionString;

export const db = createDb(pool);

function getOrCreatePool(connectionString: string) {
  if (connectionString === env.DATABASE_URL) {
    return pool;
  }

  const existing = poolsByConnectionString.get(connectionString);
  if (existing) {
    return existing;
  }

  const tenantPool = createPool(connectionString);

  poolsByConnectionString.set(connectionString, tenantPool);

  return tenantPool;
}

export async function getDb(host?: string | null) {
  const activeDb = dbContext.getStore();
  if (activeDb) {
    return activeDb;
  }

  const context = host
    ? await resolveTenantContextByHost(host)
    : await resolveTenantContextFromRequest();

  if (context.kind !== "tenant") {
    return db;
  }

  if (!context.instance) {
    throw new Error(`Tenant subdomain "${context.subdomain}" is not registered.`);
  }

  if (context.instance.status !== "ready") {
    throw new Error(
      `Tenant subdomain "${context.subdomain}" is not ready. Current status: ${context.instance.status}.`,
    );
  }

  if (!context.instance.databaseUrl) {
    throw new Error(`Tenant subdomain "${context.subdomain}" does not have a database URL.`);
  }

  return createDb(getOrCreatePool(context.instance.databaseUrl));
}

export async function runInDbTransaction<T>(
  work: () => Promise<T>,
  host?: string | null,
) {
  const activeDb = dbContext.getStore();
  if (activeDb) {
    return work();
  }

  const database = await getDb(host);
  return database.transaction(async (tx) => dbContext.run(tx, work));
}

export { pool };
