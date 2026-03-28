import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
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
