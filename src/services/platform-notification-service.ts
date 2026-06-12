import { desc, eq } from "drizzle-orm";

import { env } from "@/lib/env";
import { controlDb } from "@/lib/platform/control-client";
import { platformNotifications } from "@/lib/platform/schema";
import { sendEmail } from "@/services/email-service";
import { resolvePlatformSmtpConfigForDelivery } from "@/services/platform-smtp-service";
import { buildTrialReadyEmail } from "@/services/trial-ready-email";

type TrialReadyNotificationInput = {
  trialRequestId?: string | null;
  instanceId?: string | null;
  companyName: string;
  subdomain: string;
  loginUrl: string;
  setupUrl: string;
  adminEmail: string;
  adminPhone?: string | null;
  trialEndsAt?: Date | null;
};

function resolveNotificationStatus(
  emailStatus: "sent" | "skipped" | "failed",
  webhookStatus: "sent" | "skipped" | "failed",
) {
  if (emailStatus === "sent" || webhookStatus === "sent") {
    return "sent" as const;
  }

  if (emailStatus === "failed" || webhookStatus === "failed") {
    return "failed" as const;
  }

  return "skipped" as const;
}

export async function sendTrialReadyNotification(
  input: TrialReadyNotificationInput,
) {
  const payload = {
    event: "trial_ready",
    companyName: input.companyName,
    subdomain: input.subdomain,
    loginUrl: input.loginUrl,
    setupUrl: input.setupUrl,
    adminEmail: input.adminEmail,
    adminPhone: input.adminPhone ?? null,
    trialEndsAt: input.trialEndsAt?.toISOString() ?? null,
  };

  const emailPayload = buildTrialReadyEmail({
    companyName: input.companyName,
    subdomain: input.subdomain,
    loginUrl: input.loginUrl,
    setupUrl: input.setupUrl,
    adminEmail: input.adminEmail,
    trialEndsAt: input.trialEndsAt,
  });
  const smtpConfig = await resolvePlatformSmtpConfigForDelivery();
  const emailResult = input.adminEmail
    ? await sendEmail({
        to: input.adminEmail,
        subject: emailPayload.subject,
        text: emailPayload.text,
        html: emailPayload.html,
      }, smtpConfig)
    : {
        status: "skipped" as const,
        reason: "Admin email is empty.",
      };

  const [notification] = await controlDb
    .insert(platformNotifications)
    .values({
      trialRequestId: input.trialRequestId ?? null,
      instanceId: input.instanceId ?? null,
      notificationType: "trial_ready",
      channel: "webhook",
      status: "queued",
      recipientEmail: input.adminEmail,
      recipientPhone: input.adminPhone ?? null,
      payload,
    })
    .returning({
      id: platformNotifications.id,
    });

  if (!env.TRIAL_READY_WEBHOOK_URL) {
    await controlDb
      .update(platformNotifications)
      .set({
        status: "skipped",
        lastError: "TRIAL_READY_WEBHOOK_URL is not configured.",
        updatedAt: new Date(),
      })
      .where(eq(platformNotifications.id, notification.id));

    return {
      id: notification.id,
      status: resolveNotificationStatus(emailResult.status, "skipped"),
      emailStatus: emailResult.status,
      webhookStatus: "skipped" as const,
    };
  }

  try {
    const response = await fetch(env.TRIAL_READY_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const responsePayload = responseText
      ? {
          status: response.status,
          body: responseText,
        }
      : {
          status: response.status,
        };

    if (!response.ok) {
      await controlDb
        .update(platformNotifications)
        .set({
          status: "failed",
          responsePayload,
          lastError: `Webhook returned HTTP ${response.status}.`,
          updatedAt: new Date(),
        })
        .where(eq(platformNotifications.id, notification.id));

      return {
        id: notification.id,
        status: resolveNotificationStatus(emailResult.status, "failed"),
        emailStatus: emailResult.status,
        webhookStatus: "failed" as const,
      };
    }

    await controlDb
      .update(platformNotifications)
      .set({
        status: "sent",
        responsePayload,
        sentAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(platformNotifications.id, notification.id));

    return {
      id: notification.id,
      status: resolveNotificationStatus(emailResult.status, "sent"),
      emailStatus: emailResult.status,
      webhookStatus: "sent" as const,
    };
  } catch (error) {
    await controlDb
      .update(platformNotifications)
      .set({
        status: "failed",
        lastError:
          error instanceof Error
            ? error.message
            : "Unexpected notification delivery error.",
        updatedAt: new Date(),
      })
      .where(eq(platformNotifications.id, notification.id));

    return {
      id: notification.id,
      status: resolveNotificationStatus(emailResult.status, "failed"),
      emailStatus: emailResult.status,
      webhookStatus: "failed" as const,
    };
  }
}

export async function listLatestPlatformNotifications(limit = 50) {
  return controlDb
    .select()
    .from(platformNotifications)
    .orderBy(desc(platformNotifications.createdAt))
    .limit(limit);
}
