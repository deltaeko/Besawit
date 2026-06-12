import { eq } from "drizzle-orm";

import { env } from "@/lib/env";
import { controlDb } from "@/lib/platform/control-client";
import { platformAdminEvents, platformSmtpSettings } from "@/lib/platform/schema";
import { decryptPlatformSecret, encryptPlatformSecret } from "@/lib/platform/smtp-crypto";
import {
  platformSmtpSettingsSchema,
  platformSmtpTestSchema,
  type PlatformSmtpSettingsInput,
} from "@/lib/validation/platform-smtp";
import {
  readEnvSmtpConfig,
  sendEmail,
  type EmailSendResult,
  type SmtpDeliveryConfig,
} from "@/services/email-service";

const DEFAULT_SCOPE = "default";

type PlatformActor = {
  actorUserId: string;
  actorName: string;
  actorEmail: string;
};

export type PlatformSmtpSettingsView = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  leadInboxEmail: string;
  hasPassword: boolean;
  source: "database" | "environment" | "none";
  isConfigured: boolean;
  lastTestStatus: "never" | "success" | "failed";
  lastTestError: string | null;
  lastTestAt: string | null;
};

function buildRuntimeConfigFromEnv(): SmtpDeliveryConfig | null {
  return readEnvSmtpConfig();
}

function mapRecordToView(
  record: typeof platformSmtpSettings.$inferSelect | null,
): PlatformSmtpSettingsView {
  if (record) {
    return {
      host: record.host,
      port: record.port,
      secure: record.secure,
      username: record.username,
      fromEmail: record.fromEmail,
      fromName: record.fromName,
      leadInboxEmail: record.leadInboxEmail ?? "",
      hasPassword: Boolean(record.passwordEncrypted),
      source: "database",
      isConfigured: true,
      lastTestStatus: record.lastTestStatus,
      lastTestError: record.lastTestError ?? null,
      lastTestAt: record.lastTestAt?.toISOString() ?? null,
    };
  }

  const envConfig = buildRuntimeConfigFromEnv();
  if (envConfig) {
    return {
      host: envConfig.host,
      port: envConfig.port,
      secure: envConfig.secure,
      username: envConfig.user,
      fromEmail: envConfig.fromEmail,
      fromName: envConfig.fromName,
      leadInboxEmail: "",
      hasPassword: true,
      source: "environment",
      isConfigured: true,
      lastTestStatus: "never",
      lastTestError: null,
      lastTestAt: null,
    };
  }

  return {
    host: "",
    port: 587,
    secure: false,
    username: "",
    fromEmail: "",
    fromName: env.APP_NAME,
    leadInboxEmail: "",
    hasPassword: false,
    source: "none",
    isConfigured: false,
    lastTestStatus: "never",
    lastTestError: null,
    lastTestAt: null,
  };
}

async function getStoredPlatformSmtpSettings() {
  const [record] = await controlDb
    .select()
    .from(platformSmtpSettings)
    .where(eq(platformSmtpSettings.scope, DEFAULT_SCOPE))
    .limit(1);

  return record ?? null;
}

async function recordPlatformEvent(action: string, actor: PlatformActor, payload?: Record<string, unknown>) {
  await controlDb.insert(platformAdminEvents).values({
    action,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    actorEmail: actor.actorEmail,
    payload: payload ?? null,
  });
}

export async function getPlatformSmtpSettingsView() {
  const record = await getStoredPlatformSmtpSettings();
  return mapRecordToView(record);
}

export async function resolvePlatformSmtpConfigForDelivery(): Promise<SmtpDeliveryConfig | null> {
  const record = await getStoredPlatformSmtpSettings();

  if (record) {
    try {
      return {
        host: record.host,
        port: record.port,
        secure: record.secure,
        user: record.username,
        password: decryptPlatformSecret(record.passwordEncrypted),
        fromEmail: record.fromEmail,
        fromName: record.fromName,
      };
    } catch {
      return buildRuntimeConfigFromEnv();
    }
  }

  return buildRuntimeConfigFromEnv();
}

export async function savePlatformSmtpSettings(payload: unknown, actor: PlatformActor) {
  const parsed = platformSmtpSettingsSchema.parse(payload) satisfies PlatformSmtpSettingsInput;
  const existing = await getStoredPlatformSmtpSettings();
  const nextPassword = parsed.password.trim();

  if (!existing && !nextPassword) {
    throw new Error("Password SMTP wajib diisi saat setup pertama.");
  }

  const passwordEncrypted = nextPassword
    ? encryptPlatformSecret(nextPassword)
    : existing?.passwordEncrypted;

  if (!passwordEncrypted) {
    throw new Error("Password SMTP tidak tersedia.");
  }

  const values = {
    scope: DEFAULT_SCOPE,
    host: parsed.host.trim(),
    port: parsed.port,
    secure: parsed.secure,
    username: parsed.username.trim(),
    passwordEncrypted,
    fromEmail: parsed.fromEmail.trim(),
    fromName: parsed.fromName.trim(),
    leadInboxEmail: parsed.leadInboxEmail.trim() || null,
    updatedAt: new Date(),
  };

  const [saved] = existing
    ? await controlDb
        .update(platformSmtpSettings)
        .set(values)
        .where(eq(platformSmtpSettings.id, existing.id))
        .returning()
    : await controlDb.insert(platformSmtpSettings).values(values).returning();

  await recordPlatformEvent("save_platform_smtp_settings", actor, {
    source: "platform-ui",
    host: saved.host,
    port: saved.port,
    secure: saved.secure,
    username: saved.username,
    fromEmail: saved.fromEmail,
    fromName: saved.fromName,
    leadInboxEmail: saved.leadInboxEmail ?? null,
    passwordUpdated: Boolean(nextPassword),
  });

  return mapRecordToView(saved);
}

async function persistPlatformSmtpTestResult(
  recordId: string,
  result: EmailSendResult,
) {
  const status = result.status === "sent" ? "success" : "failed";
  await controlDb
    .update(platformSmtpSettings)
    .set({
      lastTestStatus: status,
      lastTestError:
        result.status === "failed"
          ? result.error
          : result.status === "skipped"
            ? result.reason
            : null,
      lastTestAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(platformSmtpSettings.id, recordId));
}

export async function sendPlatformSmtpTestEmail(payload: unknown, actor: PlatformActor) {
  const parsed = platformSmtpTestSchema.parse(payload);
  const record = await getStoredPlatformSmtpSettings();

  if (!record) {
    throw new Error("SMTP belum disimpan di Platform.");
  }

  const smtpConfig: SmtpDeliveryConfig = {
    host: record.host,
    port: record.port,
    secure: record.secure,
    user: record.username,
    password: decryptPlatformSecret(record.passwordEncrypted),
    fromEmail: record.fromEmail,
    fromName: record.fromName,
  };

  const result = await sendEmail(
    {
      to: parsed.toEmail,
      subject: "Test SMTP Besawit",
      text: [
        "Ini adalah email test dari Platform SMTP Besawit.",
        "",
        `Host: ${record.host}`,
        `Port: ${record.port}`,
        `Secure: ${record.secure ? "Ya" : "Tidak"}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Test SMTP Besawit</h2>
          <p>Konfigurasi SMTP dari Platform berhasil dipakai untuk mengirim email test.</p>
          <ul>
            <li><strong>Host:</strong> ${record.host}</li>
            <li><strong>Port:</strong> ${record.port}</li>
            <li><strong>Secure:</strong> ${record.secure ? "Ya" : "Tidak"}</li>
          </ul>
        </div>
      `.trim(),
    },
    smtpConfig,
  );

  await persistPlatformSmtpTestResult(record.id, result);
  await recordPlatformEvent("test_platform_smtp_settings", actor, {
    toEmail: parsed.toEmail,
    result: result.status,
  });

  if (result.status !== "sent") {
    throw new Error(result.status === "failed" ? result.error : result.reason);
  }

  return {
    ok: true,
    messageId: result.messageId,
  };
}

export async function getPlatformLeadInboxEmail() {
  const record = await getStoredPlatformSmtpSettings();
  return record?.leadInboxEmail?.trim() || null;
}
