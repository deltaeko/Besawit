import nodemailer from "nodemailer";

import { env } from "@/lib/env";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string | null;
};

export type SmtpDeliveryConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

export type EmailSendResult =
  | { status: "sent"; messageId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

const transporterCache = new Map<string, Promise<nodemailer.Transporter>>();

export function readEnvSmtpConfig(): SmtpDeliveryConfig | null {
  if (
    !env.SMTP_HOST ||
    !env.SMTP_PORT ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD ||
    !env.SMTP_FROM_EMAIL
  ) {
    return null;
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromEmail: env.SMTP_FROM_EMAIL,
    fromName: env.SMTP_FROM_NAME ?? env.APP_NAME,
  };
}

async function getTransporter(config: SmtpDeliveryConfig) {
  const cacheKey = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromEmail: config.fromEmail,
  });

  if (!transporterCache.has(cacheKey)) {
    transporterCache.set(
      cacheKey,
      Promise.resolve(
        nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: {
            user: config.user,
            pass: config.password,
          },
        }),
      ),
    );
  }

  return transporterCache.get(cacheKey)!;
}

export function isSmtpConfigured() {
  return Boolean(readEnvSmtpConfig());
}

export async function sendEmail(
  input: EmailInput,
  configOverride?: SmtpDeliveryConfig | null,
): Promise<EmailSendResult> {
  const config = configOverride ?? readEnvSmtpConfig();
  if (!config) {
    return {
      status: "skipped",
      reason: "SMTP is not configured.",
    };
  }

  try {
    const transporter = await getTransporter(config);
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo ?? undefined,
    });

    return {
      status: "sent",
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      status: "failed",
      error:
        error instanceof Error ? error.message : "Unexpected SMTP delivery error.",
    };
  }
}
