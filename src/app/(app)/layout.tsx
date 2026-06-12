import { redirect } from "next/navigation";

import { TenantInstanceState } from "@/components/shared/tenant-instance-state";
import { AppShell } from "@/components/layout/app-shell";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { getSession } from "@/lib/auth/session";
import { getResolvedBrandingSettings } from "@/services/branding-service";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantContext = await resolveTenantContextFromRequest();

  if (tenantContext.kind === "tenant" && tenantContext.instance?.status !== "ready") {
    return <TenantInstanceState context={tenantContext} />;
  }

  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const branding = await getResolvedBrandingSettings();

  return (
    <AppShell
      branding={branding}
      user={{
        fullName: session.name,
        permissions: session.permissions,
        role: session.role,
      }}
    >
      {children}
    </AppShell>
  );
}
