import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/header";
import { AppSidebar } from "@/components/layout/sidebar";
import { SupportWhatsappButton } from "@/components/shared/support-whatsapp-button";
import type { RolePermissionMap } from "@/lib/auth/permissions";
import type { ResolvedBrandingSettings } from "@/services/branding-service";
import type { AppRole } from "@/types/domain";

export function AppShell({
  branding,
  children,
  user,
}: {
  branding: ResolvedBrandingSettings;
  children: ReactNode;
  user: {
    fullName: string;
    role: AppRole;
    permissions: RolePermissionMap;
  };
}) {
  return (
    <div className="flex min-h-screen bg-background print:block print:bg-white">
      <div className="print:hidden">
        <AppSidebar
          branding={branding}
          permissions={user.permissions}
          role={user.role}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <AppHeader
            branding={branding}
            permissions={user.permissions}
            userName={user.fullName}
            role={user.role}
          />
        </div>
        <main className="app-grid min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 print:px-0 print:py-0">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 xl:gap-7 print:max-w-none print:gap-4">
            {children}
          </div>
        </main>
      </div>
      <SupportWhatsappButton
        float
        label="Butuh Bantuan?"
        message={`Halo, saya butuh bantuan menggunakan ${branding.appDisplayName}. Mohon bantu arahan setup atau troubleshooting.`}
        phone={branding.supportPhone}
        showAvailability
        source="app-shell"
      />
    </div>
  );
}
