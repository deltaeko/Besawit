import { eq } from "drizzle-orm";

import { brandingSettings } from "@/lib/db/schema";
import { getDb } from "@/lib/db/client";
import { appBrand, deriveBrandMark } from "@/lib/brand";
import { brandingSettingsSchema, type BrandingSettingsInput } from "@/lib/validation/branding";
import { logAudit } from "@/services/audit-service";

const defaultScope = "default";
const defaultPrimaryColor = "#1f3b23";
const defaultAccentColor = "#e0f46e";

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

export type ResolvedBrandingSettings = {
  companyName: string;
  appDisplayName: string;
  tagline: string;
  logoUrl: string | null;
  logoSquareUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  mark: string;
  updatedAt: Date | null;
};

export async function getBrandingSettings() {
  try {
    const db = await getDb();
    const [settings] = await db
      .select()
      .from(brandingSettings)
      .where(eq(brandingSettings.scope, defaultScope))
      .limit(1);

    return settings ?? null;
  } catch {
    return null;
  }
}

export async function getResolvedBrandingSettings(): Promise<ResolvedBrandingSettings> {
  const settings = await getBrandingSettings();
  const companyName = settings?.companyName?.trim() || appBrand.name;
  const appDisplayName =
    settings?.appDisplayName?.trim() || companyName || appBrand.name;
  const tagline = settings?.tagline?.trim() || appBrand.tagline;

  return {
    companyName,
    appDisplayName,
    tagline,
    logoUrl: settings?.logoUrl ?? null,
    logoSquareUrl: settings?.logoSquareUrl ?? settings?.logoUrl ?? null,
    faviconUrl: settings?.faviconUrl ?? settings?.logoSquareUrl ?? settings?.logoUrl ?? null,
    primaryColor: settings?.primaryColor ?? defaultPrimaryColor,
    accentColor: settings?.accentColor ?? defaultAccentColor,
    supportEmail: settings?.supportEmail ?? null,
    supportPhone: settings?.supportPhone ?? null,
    mark: deriveBrandMark(appDisplayName || companyName || appBrand.name),
    updatedAt: settings?.updatedAt ?? null,
  };
}

export async function saveBrandingSettings(payload: unknown, actorId?: string | null) {
  const db = await getDb();
  const existing = await getBrandingSettings();
  const parsed = brandingSettingsSchema.parse(payload) satisfies BrandingSettingsInput;

  const values = {
    scope: defaultScope,
    companyName: parsed.companyName.trim(),
    appDisplayName: normalizeOptional(parsed.appDisplayName),
    tagline: normalizeOptional(parsed.tagline),
    logoUrl: normalizeOptional(parsed.logoUrl),
    logoSquareUrl: normalizeOptional(parsed.logoSquareUrl),
    faviconUrl: normalizeOptional(parsed.faviconUrl),
    primaryColor: normalizeOptional(parsed.primaryColor) ?? defaultPrimaryColor,
    accentColor: normalizeOptional(parsed.accentColor) ?? defaultAccentColor,
    supportEmail: normalizeOptional(parsed.supportEmail),
    supportPhone: normalizeOptional(parsed.supportPhone),
    updatedAt: new Date(),
  };

  const [saved] = existing
    ? await db
        .update(brandingSettings)
        .set(values)
        .where(eq(brandingSettings.id, existing.id))
        .returning()
    : await db
        .insert(brandingSettings)
        .values(values)
        .returning();

  await logAudit({
    entityType: "branding_settings",
    entityId: saved.id,
    action: existing ? "update" : "create",
    actorId,
    before: existing,
    after: saved,
  });

  return saved;
}
