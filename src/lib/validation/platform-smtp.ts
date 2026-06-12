import { z } from "zod";

export const platformSmtpSettingsSchema = z.object({
  host: z.string().trim().min(1, "SMTP host wajib diisi."),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().min(1, "Username SMTP wajib diisi."),
  password: z.string().trim().optional().default(""),
  fromEmail: z.email("From email tidak valid."),
  fromName: z.string().trim().min(1, "From name wajib diisi."),
  leadInboxEmail: z.email("Email inbox lead tidak valid.").or(z.literal("")).default(""),
});

export const platformSmtpTestSchema = z.object({
  toEmail: z.email("Email tujuan test tidak valid."),
});

export type PlatformSmtpSettingsInput = z.infer<typeof platformSmtpSettingsSchema>;
export type PlatformSmtpTestInput = z.infer<typeof platformSmtpTestSchema>;
