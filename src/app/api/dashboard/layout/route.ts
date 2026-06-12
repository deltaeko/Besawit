import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import { saveDashboardLayout } from "@/services/dashboard-layout-service";

export async function PUT(request: Request) {
  const auth = await requirePermission("dashboard.view");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const payload = await request.json();
    const saved = await saveDashboardLayout(
      payload,
      auth.session.sub,
      auth.session.role,
      auth.session.permissions,
    );

    return NextResponse.json(saved);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan layout dashboard.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
