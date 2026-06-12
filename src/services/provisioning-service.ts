import path from "node:path";
import { randomBytes } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDb, createPool } from "@/lib/db/client";
import { seedTenantDatabase } from "@/lib/db/tenant-seed";
import { env } from "@/lib/env";
import { controlDb } from "@/lib/platform/control-client";
import { buildInstanceLoginUrl } from "@/lib/platform/instance-url";
import {
  buildTrialSetupUrl,
  generateTrialSetupToken,
  withTrialSetupMetadata,
} from "@/lib/platform/trial-setup";
import { appInstances, provisionJobs, trialRequests } from "@/lib/platform/schema";
import { sendTrialReadyNotification } from "@/services/platform-notification-service";
import { toSlug } from "@/lib/utils";

type ClaimedProvisionJob = {
  id: string;
  trialRequestId: string | null;
  instanceId: string | null;
  jobType: string;
  payload: unknown;
  attempts: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeDatabaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildTenantDatabaseName(subdomain: string) {
  const prefix = sanitizeDatabaseName(env.TRIAL_DATABASE_PREFIX);
  const slug = sanitizeDatabaseName(toSlug(subdomain).replace(/-/g, "_"));
  const combined = `${prefix}_${slug}`.replace(/_+/g, "_");
  return combined.slice(0, 63).replace(/_+$/g, "");
}

function withDatabaseName(connectionString: string, databaseName: string) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function buildMaintenanceDatabaseUrl(connectionString: string) {
  return withDatabaseName(connectionString, "postgres");
}

function escapeIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

function readJobPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Provision job payload is invalid.");
  }

  const data = payload as Record<string, unknown>;
  const companyName = typeof data.companyName === "string" ? data.companyName : "";
  const fullName = typeof data.fullName === "string" ? data.fullName : "";
  const adminEmail = typeof data.adminEmail === "string" ? data.adminEmail : "";
  const adminPhone =
    typeof data.adminPhone === "string" ? data.adminPhone : null;
  const subdomain = typeof data.subdomain === "string" ? data.subdomain : "";

  if (!companyName || !adminEmail || !subdomain) {
    throw new Error("Provision job payload is incomplete.");
  }

  return {
    companyName,
    fullName,
    adminEmail,
    adminPhone,
    subdomain,
  };
}

async function ensureTenantDatabase(databaseName: string) {
  const maintenancePool = createPool(
    buildMaintenanceDatabaseUrl(env.TENANT_DATABASE_ADMIN_URL),
  );

  try {
    const client = await maintenancePool.connect();
    try {
      const existing = await client.query(
        "select 1 from pg_database where datname = $1 limit 1",
        [databaseName],
      );

      if (existing.rowCount) {
        return;
      }

      await client.query(`create database ${escapeIdentifier(databaseName)}`);
    } finally {
      client.release();
    }
  } finally {
    await maintenancePool.end();
  }
}

async function provisionTenantDatabase(
  databaseUrl: string,
  input: {
    companyName: string;
    ownerEmail: string;
    ownerFullName: string;
    ownerPassword: string;
  },
) {
  const pool = createPool(databaseUrl);
  const db = createDb(pool);

  try {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });

    await seedTenantDatabase(db, input);
  } finally {
    await pool.end();
  }
}

async function claimNextProvisionJob(): Promise<ClaimedProvisionJob | null> {
  const [job] = await controlDb
    .select({
      id: provisionJobs.id,
      trialRequestId: provisionJobs.trialRequestId,
      instanceId: provisionJobs.instanceId,
      jobType: provisionJobs.jobType,
      payload: provisionJobs.payload,
      attempts: provisionJobs.attempts,
    })
    .from(provisionJobs)
    .where(eq(provisionJobs.status, "queued"))
    .orderBy(asc(provisionJobs.createdAt))
    .limit(1);

  if (!job) {
    return null;
  }

  const [claimed] = await controlDb
    .update(provisionJobs)
    .set({
      status: "processing",
      lockedAt: new Date(),
      startedAt: new Date(),
      attempts: job.attempts + 1,
      updatedAt: new Date(),
    })
    .where(
      and(eq(provisionJobs.id, job.id), eq(provisionJobs.status, "queued")),
    )
    .returning({
      id: provisionJobs.id,
      trialRequestId: provisionJobs.trialRequestId,
      instanceId: provisionJobs.instanceId,
      jobType: provisionJobs.jobType,
      payload: provisionJobs.payload,
      attempts: provisionJobs.attempts,
    });

  return claimed ?? null;
}

async function markProvisioningState(job: ClaimedProvisionJob) {
  if (job.trialRequestId) {
    await controlDb
      .update(trialRequests)
      .set({
        status: "provisioning",
        updatedAt: new Date(),
      })
      .where(eq(trialRequests.id, job.trialRequestId));
  }

  if (job.instanceId) {
    await controlDb
      .update(appInstances)
      .set({
        status: "provisioning",
        updatedAt: new Date(),
      })
      .where(eq(appInstances.id, job.instanceId));
  }
}

async function markProvisioningFailed(job: ClaimedProvisionJob, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Provisioning failed unexpectedly.";

  await controlDb
    .update(provisionJobs)
    .set({
      status: "failed",
      completedAt: new Date(),
      lastError: message,
      updatedAt: new Date(),
    })
    .where(eq(provisionJobs.id, job.id));

  if (job.trialRequestId) {
    await controlDb
      .update(trialRequests)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(trialRequests.id, job.trialRequestId));
  }

  if (job.instanceId) {
    await controlDb
      .update(appInstances)
      .set({
        status: "failed",
        notes: message,
        updatedAt: new Date(),
      })
      .where(eq(appInstances.id, job.instanceId));
  }
}

async function markProvisioningCompleted(
  job: ClaimedProvisionJob,
  payload: ReturnType<typeof readJobPayload>,
  databaseName: string,
  databaseUrl: string,
) {
  const loginUrl = buildInstanceLoginUrl(payload.subdomain);
  const now = new Date();
  const [trialRequestRow] = job.trialRequestId
    ? await controlDb
        .select({ metadata: trialRequests.metadata, trialEndsAt: trialRequests.trialEndsAt })
        .from(trialRequests)
        .where(eq(trialRequests.id, job.trialRequestId))
        .limit(1)
    : [null];
  const [instanceRow] = job.instanceId
    ? await controlDb
        .select({ metadata: appInstances.metadata, trialEndsAt: appInstances.trialEndsAt })
        .from(appInstances)
        .where(eq(appInstances.id, job.instanceId))
        .limit(1)
    : [null];
  const setupToken = generateTrialSetupToken(
    instanceRow?.trialEndsAt ?? trialRequestRow?.trialEndsAt ?? undefined,
  );
  const setupUrl = buildTrialSetupUrl(payload.subdomain, setupToken.token);
  const trialMetadata = withTrialSetupMetadata(
    {
      ...(trialRequestRow?.metadata && typeof trialRequestRow.metadata === "object" && !Array.isArray(trialRequestRow.metadata)
        ? trialRequestRow.metadata
        : {}),
      source: "website",
      baseDomain: env.APP_BASE_DOMAIN,
      loginUrl,
    },
    setupToken.metadata,
  );
  const instanceMetadata = withTrialSetupMetadata(
    {
      ...(instanceRow?.metadata && typeof instanceRow.metadata === "object" && !Array.isArray(instanceRow.metadata)
        ? instanceRow.metadata
        : {}),
      loginUrl,
    },
    setupToken.metadata,
  );

  await controlDb
    .update(provisionJobs)
    .set({
      status: "completed",
      completedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .where(eq(provisionJobs.id, job.id));

  if (job.trialRequestId) {
    await controlDb
      .update(trialRequests)
      .set({
        status: "ready",
        updatedAt: now,
        metadata: trialMetadata,
      })
      .where(eq(trialRequests.id, job.trialRequestId));
  }

  if (job.instanceId) {
    await controlDb
      .update(appInstances)
      .set({
        status: "ready",
        databaseName,
        databaseUrl,
        activatedAt: now,
        updatedAt: now,
        metadata: instanceMetadata,
      })
      .where(eq(appInstances.id, job.instanceId));
  }

  await sendTrialReadyNotification({
    trialRequestId: job.trialRequestId,
    instanceId: job.instanceId,
    companyName: payload.companyName,
    subdomain: payload.subdomain,
    loginUrl,
    setupUrl,
    adminEmail: payload.adminEmail,
    adminPhone: payload.adminPhone,
    trialEndsAt: null,
  });
}

export async function processNextProvisionJob() {
  const job = await claimNextProvisionJob();
  if (!job) {
    return false;
  }

  try {
    await markProvisioningState(job);

    if (job.jobType !== "trial_provision") {
      throw new Error(`Unsupported provision job type: ${job.jobType}`);
    }

    const payload = readJobPayload(job.payload);
    const databaseName = buildTenantDatabaseName(payload.subdomain);
    const databaseUrl = withDatabaseName(env.DATABASE_URL, databaseName);
    const bootstrapPassword = `Bootstrap-${randomBytes(24).toString("hex")}`;

    await ensureTenantDatabase(databaseName);
    await provisionTenantDatabase(databaseUrl, {
      companyName: payload.companyName,
      ownerEmail: payload.adminEmail,
      ownerFullName: payload.fullName || `${payload.companyName} Owner`,
      ownerPassword: bootstrapPassword,
    });

    await markProvisioningCompleted(job, payload, databaseName, databaseUrl);
    return true;
  } catch (error) {
    await markProvisioningFailed(job, error);
    console.error("Provisioning job failed", error);
    return true;
  }
}

export async function runProvisionWorker(options?: {
  once?: boolean;
  intervalMs?: number;
}) {
  const once = options?.once ?? false;
  const intervalMs = options?.intervalMs ?? env.PROVISION_POLL_INTERVAL_MS;

  do {
    const processed = await processNextProvisionJob();

    if (once) {
      return;
    }

    if (!processed) {
      await sleep(intervalMs);
    }
  } while (true);
}
