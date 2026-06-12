import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { controlDb } from "@/lib/platform/control-client";
import { buildInstanceLoginUrl } from "@/lib/platform/instance-url";
import {
  buildTrialSetupUrl,
  generateTrialSetupToken,
  readTrialSetupMetadata,
  withTrialSetupMetadata,
} from "@/lib/platform/trial-setup";
import {
  appInstances,
  platformAdminEvents,
  platformNotifications,
  trialRequests,
} from "@/lib/platform/schema";
import type { ConvertTrialToPaidInput } from "@/lib/validation/platform";
import { sendTrialReadyNotification } from "@/services/platform-notification-service";

type PlatformTrialFilters = {
  q?: string;
  status?: string;
  instanceType?: string;
};

type ConvertInstanceActor = {
  actorUserId: string;
  actorName: string;
  actorEmail: string;
};

type PlatformActor = ConvertInstanceActor;

function readMetadataObject(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readObjectString(
  value: Record<string, unknown> | null,
  key: string,
) {
  if (!value) return null;
  const item = value[key];
  return typeof item === "string" ? item : null;
}

function readObjectNumber(
  value: Record<string, unknown> | null,
  key: string,
) {
  if (!value) return null;
  const item = value[key];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

async function recordPlatformAdminEvent(input: {
  trialRequestId?: string | null;
  instanceId?: string | null;
  action: string;
  actor: PlatformActor;
  payload?: Record<string, unknown>;
}) {
  await controlDb.insert(platformAdminEvents).values({
    trialRequestId: input.trialRequestId ?? null,
    instanceId: input.instanceId ?? null,
    action: input.action,
    actorUserId: input.actor.actorUserId,
    actorName: input.actor.actorName,
    actorEmail: input.actor.actorEmail,
    payload: input.payload ?? null,
  });
}

export async function listPlatformTrials(filters: PlatformTrialFilters = {}) {
  const conditions = [];

  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(appInstances.companyName, pattern),
        ilike(appInstances.subdomain, pattern),
        ilike(appInstances.adminEmail, pattern),
        ilike(trialRequests.fullName, pattern),
        ilike(trialRequests.phone, pattern),
      )!,
    );
  }

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(appInstances.status, filters.status as typeof appInstances.$inferSelect.status));
  }

  if (filters.instanceType && filters.instanceType !== "all") {
    conditions.push(
      eq(
        appInstances.instanceType,
        filters.instanceType as typeof appInstances.$inferSelect.instanceType,
      ),
    );
  }

  const rows = await controlDb
    .select({
      instanceId: appInstances.id,
      trialRequestId: appInstances.trialRequestId,
      companyName: appInstances.companyName,
      subdomain: appInstances.subdomain,
      instanceType: appInstances.instanceType,
      instanceStatus: appInstances.status,
      databaseName: appInstances.databaseName,
      adminEmail: appInstances.adminEmail,
      trialStartsAt: appInstances.trialStartsAt,
      trialEndsAt: appInstances.trialEndsAt,
      activatedAt: appInstances.activatedAt,
      notes: appInstances.notes,
      instanceMetadata: appInstances.metadata,
      requestStatus: trialRequests.status,
      fullName: trialRequests.fullName,
      email: trialRequests.email,
      phone: trialRequests.phone,
      city: trialRequests.city,
      createdAt: appInstances.createdAt,
    })
    .from(appInstances)
    .leftJoin(trialRequests, eq(appInstances.trialRequestId, trialRequests.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(appInstances.createdAt))
    .limit(300);

  const instanceIds = rows.map((row) => row.instanceId);
  const notifications = instanceIds.length
    ? await controlDb
        .select()
        .from(platformNotifications)
        .where(inArray(platformNotifications.instanceId, instanceIds))
        .orderBy(desc(platformNotifications.createdAt))
    : [];

  const latestNotifications = new Map<string, (typeof notifications)[number]>();
  for (const notification of notifications) {
    if (!notification.instanceId) continue;
    if (!latestNotifications.has(notification.instanceId)) {
      latestNotifications.set(notification.instanceId, notification);
    }
  }

  const items = rows.map((row) => {
    const latestNotification = latestNotifications.get(row.instanceId);
    const billingMetadata = readMetadataObject(row.instanceMetadata, "billing");
    const trialSetup = readTrialSetupMetadata(row.instanceMetadata);

    return {
      ...row,
      loginUrl: buildInstanceLoginUrl(row.subdomain),
      trialSetupStatus: trialSetup?.usedAt
        ? "used"
        : trialSetup
          ? "active"
          : "missing",
      trialSetupExpiresAt: trialSetup?.expiresAt ?? null,
      trialSetupUsedAt: trialSetup?.usedAt ?? null,
      billingPlanName: readObjectString(billingMetadata, "planName"),
      billingCycle: readObjectString(billingMetadata, "billingCycle"),
      billingCurrency: readObjectString(billingMetadata, "currency") ?? "IDR",
      billingAmount: readObjectNumber(billingMetadata, "contractAmount"),
      billingPaidUntil: readObjectString(billingMetadata, "paidUntil"),
      billingConvertedAt: readObjectString(billingMetadata, "convertedAt"),
      billingConvertedByName: readObjectString(billingMetadata, "convertedByName"),
      billingSalesNotes: readObjectString(billingMetadata, "salesNotes"),
      latestNotificationStatus: latestNotification?.status ?? null,
      latestNotificationChannel: latestNotification?.channel ?? null,
      latestNotificationSentAt: latestNotification?.sentAt ?? null,
      latestNotificationError: latestNotification?.lastError ?? null,
    };
  });

  return {
    items,
    summary: {
      total: items.length,
      ready: items.filter((item) => item.instanceStatus === "ready").length,
      trial: items.filter((item) => item.instanceType === "trial").length,
      paid: items.filter((item) => item.instanceType === "paid").length,
      failed: items.filter((item) => item.instanceStatus === "failed").length,
    },
  };
}

export async function listPlatformAdminEvents(limit = 20) {
  return controlDb
    .select({
      id: platformAdminEvents.id,
      action: platformAdminEvents.action,
      actorName: platformAdminEvents.actorName,
      actorEmail: platformAdminEvents.actorEmail,
      payload: platformAdminEvents.payload,
      createdAt: platformAdminEvents.createdAt,
      companyName: appInstances.companyName,
      subdomain: appInstances.subdomain,
    })
    .from(platformAdminEvents)
    .leftJoin(appInstances, eq(platformAdminEvents.instanceId, appInstances.id))
    .orderBy(desc(platformAdminEvents.createdAt))
    .limit(limit);
}

export async function listPlatformSupportClicks(limit = 30) {
  const rows = await controlDb
    .select({
      id: platformAdminEvents.id,
      actorName: platformAdminEvents.actorName,
      actorEmail: platformAdminEvents.actorEmail,
      payload: platformAdminEvents.payload,
      createdAt: platformAdminEvents.createdAt,
      companyName: appInstances.companyName,
      subdomain: appInstances.subdomain,
      instanceType: appInstances.instanceType,
    })
    .from(platformAdminEvents)
    .leftJoin(appInstances, eq(platformAdminEvents.instanceId, appInstances.id))
    .where(eq(platformAdminEvents.action, "support_whatsapp_click"))
    .orderBy(desc(platformAdminEvents.createdAt))
    .limit(limit);

  const sourceCount = new Map<string, number>();
  const items = rows.map((row) => {
    const payload =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null;
    const source = readObjectString(payload, "source") ?? "unknown";
    sourceCount.set(source, (sourceCount.get(source) ?? 0) + 1);

    return {
      ...row,
      source,
      pathname: readObjectString(payload, "pathname"),
      host: readObjectString(payload, "host"),
      label: readObjectString(payload, "label"),
      phone: readObjectString(payload, "phone"),
    };
  });

  const topSources = [...sourceCount.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  return {
    items,
    summary: {
      total: items.length,
      tenant: items.filter((item) => Boolean(item.subdomain)).length,
      baseDomain: items.filter((item) => !item.subdomain).length,
      topSources,
    },
  };
}

export async function convertInstanceToPaid(
  instanceId: string,
  input: ConvertTrialToPaidInput & ConvertInstanceActor,
) {
  const [instance] = await controlDb
    .select({
      id: appInstances.id,
      trialRequestId: appInstances.trialRequestId,
      status: appInstances.status,
      instanceType: appInstances.instanceType,
      metadata: appInstances.metadata,
    })
    .from(appInstances)
    .where(eq(appInstances.id, instanceId))
    .limit(1);

  if (!instance) {
    throw new Error("Instance not found.");
  }

  const now = new Date();
  const instanceMetadata =
    instance.metadata && typeof instance.metadata === "object" && !Array.isArray(instance.metadata)
      ? (instance.metadata as Record<string, unknown>)
      : {};

  await controlDb
    .update(appInstances)
    .set({
      instanceType: "paid",
      status: "ready",
      trialEndsAt: null,
      activatedAt: now,
      updatedAt: now,
      notes:
        instance.instanceType === "paid"
          ? "Instance sudah berada pada mode paid."
          : "Trial dikonversi menjadi instance paid.",
      metadata: {
        ...instanceMetadata,
        billing: {
          planName: input.planName,
          billingCycle: input.billingCycle,
          contractAmount: input.contractAmount ?? null,
          currency: input.currency,
          paidUntil: input.paidUntil ?? null,
          convertedAt: now.toISOString(),
          convertedByUserId: input.actorUserId,
          convertedByName: input.actorName,
          convertedByEmail: input.actorEmail,
          salesNotes: input.salesNotes ?? null,
        },
      },
    })
    .where(eq(appInstances.id, instanceId));

  if (instance.trialRequestId) {
    await controlDb
      .update(trialRequests)
      .set({
        status: "converted",
        trialEndsAt: null,
        updatedAt: now,
      })
      .where(eq(trialRequests.id, instance.trialRequestId));
  }

  await recordPlatformAdminEvent({
    trialRequestId: instance.trialRequestId,
    instanceId,
    action: "convert_to_paid",
    actor: input,
    payload: {
      planName: input.planName,
      billingCycle: input.billingCycle,
      contractAmount: input.contractAmount ?? null,
      currency: input.currency,
      paidUntil: input.paidUntil ?? null,
      salesNotes: input.salesNotes ?? null,
    },
  });

  return { ok: true };
}

export async function resendTrialReadyNotification(
  instanceId: string,
  actor: PlatformActor,
) {
  const [instance] = await controlDb
    .select({
      instanceId: appInstances.id,
      trialRequestId: appInstances.trialRequestId,
      companyName: appInstances.companyName,
      subdomain: appInstances.subdomain,
      adminEmail: appInstances.adminEmail,
      trialEndsAt: appInstances.trialEndsAt,
      instanceMetadata: appInstances.metadata,
      trialRequestMetadata: trialRequests.metadata,
      fullName: trialRequests.fullName,
      phone: trialRequests.phone,
    })
    .from(appInstances)
    .leftJoin(trialRequests, eq(appInstances.trialRequestId, trialRequests.id))
    .where(eq(appInstances.id, instanceId))
    .limit(1);

  if (!instance) {
    throw new Error("Instance not found.");
  }

  const setupToken = generateTrialSetupToken(instance.trialEndsAt ?? undefined);
  const nextMetadata = withTrialSetupMetadata(instance.instanceMetadata, setupToken.metadata);
  await controlDb
    .update(appInstances)
    .set({
      metadata: nextMetadata,
      updatedAt: new Date(),
    })
    .where(eq(appInstances.id, instanceId));

  if (instance.trialRequestId) {
    await controlDb
      .update(trialRequests)
      .set({
        metadata: withTrialSetupMetadata(instance.trialRequestMetadata, setupToken.metadata),
        updatedAt: new Date(),
      })
      .where(eq(trialRequests.id, instance.trialRequestId));
  }

  const notificationResult = await sendTrialReadyNotification({
    trialRequestId: instance.trialRequestId,
    instanceId: instance.instanceId,
    companyName: instance.companyName,
    subdomain: instance.subdomain,
    loginUrl: buildInstanceLoginUrl(instance.subdomain),
    setupUrl: buildTrialSetupUrl(instance.subdomain, setupToken.token),
    adminEmail: instance.adminEmail ?? "",
    adminPhone: instance.phone,
    trialEndsAt: instance.trialEndsAt,
  });

  await recordPlatformAdminEvent({
    trialRequestId: instance.trialRequestId,
    instanceId: instance.instanceId,
    action: "resend_trial_ready_notification",
    actor,
    payload: {
      notificationStatus: notificationResult.status,
      emailStatus: notificationResult.emailStatus ?? null,
      webhookStatus: notificationResult.webhookStatus ?? null,
      adminEmail: instance.adminEmail ?? null,
      adminPhone: instance.phone ?? null,
    },
  });

  return notificationResult;
}
