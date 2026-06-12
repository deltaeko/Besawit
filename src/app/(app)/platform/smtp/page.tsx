import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getSession } from "@/lib/auth/session";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { PlatformSmtpForm } from "@/modules/platform/platform-smtp-form";
import { getPlatformSmtpSettingsView } from "@/services/platform-smtp-service";

export default async function PlatformSmtpPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "owner") {
    redirect("/dashboard");
  }

  const tenantContext = await resolveTenantContextFromRequest();
  if (tenantContext.kind === "tenant") {
    return (
      <EmptyState
        title="SMTP platform hanya tersedia di console utama"
        description="Buka halaman ini dari base domain utama Besawit untuk mengatur email calon customer."
      />
    );
  }

  const settings = await getPlatformSmtpSettingsView();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="SMTP Email"
        description="Atur email global untuk notifikasi calon customer dari console utama Besawit."
      />
      <PlatformSmtpForm initialValues={settings} />
    </div>
  );
}
