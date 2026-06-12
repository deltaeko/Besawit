import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { getPlatformSmtpSettingsView, savePlatformSmtpSettings } from "@/services/platform-smtp-service";

function forbidden(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status });
}

async function requirePlatformOwner() {
  const session = await getSession();

  if (!session) {
    return forbidden("Unauthorized.", 401);
  }

  const tenantContext = await resolveTenantContextFromRequest();
  if (tenantContext.kind === "tenant") {
    return forbidden("SMTP platform hanya tersedia di console utama.");
  }

  if (session.role !== "owner") {
    return forbidden("Forbidden.");
  }

  return session;
}

export async function GET() {
  const session = await requirePlatformOwner();
  if (session instanceof NextResponse) {
    return session;
  }

  const item = await getPlatformSmtpSettingsView();
  return NextResponse.json({ item });
}

export async function PUT(request: Request) {
  const session = await requirePlatformOwner();
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const payload = await request.json();
    const item = await savePlatformSmtpSettings(payload, {
      actorUserId: session.sub,
      actorName: session.name,
      actorEmail: session.email,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menyimpan SMTP platform.",
      },
      { status: 400 },
    );
  }
}
