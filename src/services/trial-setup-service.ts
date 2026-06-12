import { hashSync } from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { controlDb } from "@/lib/platform/control-client";
import { appInstances, trialRequests } from "@/lib/platform/schema";
import {
  hashTrialSetupToken,
  markTrialSetupUsed,
  readTrialSetupMetadata,
} from "@/lib/platform/trial-setup";
import { resolveTenantContextByHost } from "@/lib/platform/tenant-resolver";

export async function completeTrialSetup(input: {
  host: string | null | undefined;
  token: string;
  password: string;
}) {
  const tenantContext = await resolveTenantContextByHost(input.host);

  if (tenantContext.kind !== "tenant" || !tenantContext.instance) {
    throw new Error("Link setup akun hanya berlaku untuk tenant trial yang valid.");
  }

  if (tenantContext.instance.status !== "ready") {
    throw new Error("Instance trial belum siap dipakai. Coba lagi setelah provisioning selesai.");
  }

  const setupMetadata = readTrialSetupMetadata(tenantContext.instance.metadata);
  if (!setupMetadata) {
    throw new Error("Token setup akun tidak tersedia atau sudah tidak berlaku.");
  }

  if (setupMetadata.usedAt) {
    throw new Error("Token setup akun ini sudah digunakan.");
  }

  const expiresAt = new Date(setupMetadata.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("Token setup akun sudah kedaluwarsa.");
  }

  if (hashTrialSetupToken(input.token) !== setupMetadata.tokenHash) {
    throw new Error("Token setup akun tidak valid.");
  }

  if (!tenantContext.instance.adminEmail) {
    throw new Error("Akun admin tenant tidak terdaftar.");
  }

  const db = await getDb(input.host);
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, tenantContext.instance.adminEmail),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (!user) {
    throw new Error("Akun admin tenant tidak ditemukan.");
  }

  await db
    .update(users)
    .set({
      passwordHash: hashSync(input.password, 10),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const nextMetadata = markTrialSetupUsed(tenantContext.instance.metadata);
  await controlDb
    .update(appInstances)
    .set({
      metadata: nextMetadata,
      updatedAt: new Date(),
    })
    .where(eq(appInstances.id, tenantContext.instance.id));

  if (tenantContext.instance.id) {
    const [instance] = await controlDb
      .select({ trialRequestId: appInstances.trialRequestId })
      .from(appInstances)
      .where(eq(appInstances.id, tenantContext.instance.id))
      .limit(1);

    if (instance?.trialRequestId) {
      const [request] = await controlDb
        .select({ metadata: trialRequests.metadata })
        .from(trialRequests)
        .where(eq(trialRequests.id, instance.trialRequestId))
        .limit(1);

      await controlDb
        .update(trialRequests)
        .set({
          metadata: markTrialSetupUsed(request?.metadata ?? null),
          updatedAt: new Date(),
        })
        .where(eq(trialRequests.id, instance.trialRequestId));
    }
  }

  return {
    ok: true,
    email: tenantContext.instance.adminEmail,
  };
}
