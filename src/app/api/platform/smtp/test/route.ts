import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { sendPlatformSmtpTestEmail } from "@/services/platform-smtp-service";

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

export async function POST(request: Request) {
  const session = await requirePlatformOwner();
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const payload = await request.json();
    const result = await sendPlatformSmtpTestEmail(payload, {
      actorUserId: session.sub,
      actorName: session.name,
      actorEmail: session.email,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Test SMTP platform gagal.",
      },
      { status: 400 },
    );
  }
}
