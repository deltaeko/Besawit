import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { resendTrialReadyNotification } from "@/services/platform-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ instanceId: string }> },
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { instanceId } = await context.params;
    await resendTrialReadyNotification(instanceId, {
      actorUserId: session.sub,
      actorName: session.name,
      actorEmail: session.email,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Resend notification gagal.",
      },
      { status: 400 },
    );
  }
}
