import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/header";
import { AppSidebar } from "@/components/layout/sidebar";
import type { RolePermissionMap } from "@/lib/auth/permissions";
import type { AppRole } from "@/types/domain";

export function AppShell({
  children,
  user,
}: {
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
        <AppSidebar permissions={user.permissions} role={user.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <AppHeader permissions={user.permissions} userName={user.fullName} role={user.role} />
        </div>
        <main className="app-grid min-w-0 flex-1 px-4 py-4 md:px-6 lg:px-8 lg:py-6 print:px-0 print:py-0">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 print:max-w-none print:gap-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
