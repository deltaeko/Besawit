import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { canAccessPermission } from "@/lib/auth/permissions";
import { saveBrandingSettings } from "@/services/branding-service";

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessPermission(session.role, session.permissions, "settings.branding")) {
    return NextResponse.json(
      { error: "Anda tidak memiliki hak akses ke branding settings." },
      { status: 403 },
    );
  }

  try {
    const payload = await request.json();
    const saved = await saveBrandingSettings(payload, session.sub);

    return NextResponse.json({
      item: saved,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan branding settings.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

