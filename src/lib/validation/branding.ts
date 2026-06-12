import { z } from "zod";

const urlOrBlank = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value.length === 0 || /^https?:\/\/.+/i.test(value) || value.startsWith("/"), {
    message: "Gunakan URL http://, https://, atau path internal aplikasi yang valid.",
  });

const colorOrBlank = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value.length === 0 || /^#[0-9A-Fa-f]{6}$/.test(value), {
    message: "Gunakan format warna hex, misalnya #1f3b23.",
  });

export const brandingSettingsSchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  appDisplayName: z.string().trim().max(150).optional().default(""),
  tagline: z.string().trim().max(240).optional().default(""),
  logoUrl: urlOrBlank.optional().default(""),
  logoSquareUrl: urlOrBlank.optional().default(""),
  faviconUrl: urlOrBlank.optional().default(""),
  primaryColor: colorOrBlank.optional().default(""),
  accentColor: colorOrBlank.optional().default(""),
  supportEmail: z.email().or(z.literal("")).optional().default(""),
  supportPhone: z.string().trim().max(30).optional().default(""),
});

export type BrandingSettingsFormValues = z.input<typeof brandingSettingsSchema>;
export type BrandingSettingsInput = z.output<typeof brandingSettingsSchema>;
