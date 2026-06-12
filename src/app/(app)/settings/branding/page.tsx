import { redirect } from "next/navigation";

import { BrandingSettingsForm } from "@/modules/settings/branding-settings-form";
import { canAccessPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBrandingSettings, getResolvedBrandingSettings } from "@/services/branding-service";

export default async function BrandingSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!canAccessPermission(currentUser.role, currentUser.permissions, "settings.branding")) {
    redirect("/dashboard");
  }

  const [settings, resolved] = await Promise.all([
    getBrandingSettings(),
    getResolvedBrandingSettings(),
  ]);

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
        Atur logo tenant, favicon browser, nama tampil aplikasi, dan warna dasar brand
        agar pengalaman trial dan customer terlihat lebih proper.
      </p>

      <BrandingSettingsForm
        initialValues={{
          companyName: settings?.companyName ?? resolved.companyName,
          appDisplayName: settings?.appDisplayName ?? resolved.appDisplayName,
          tagline: settings?.tagline ?? resolved.tagline,
          logoUrl: settings?.logoUrl ?? "",
          logoSquareUrl: settings?.logoSquareUrl ?? "",
          faviconUrl: settings?.faviconUrl ?? "",
          primaryColor: settings?.primaryColor ?? resolved.primaryColor,
          accentColor: settings?.accentColor ?? resolved.accentColor,
          supportEmail: settings?.supportEmail ?? "",
          supportPhone: settings?.supportPhone ?? "",
        }}
      />
    </div>
  );
}
