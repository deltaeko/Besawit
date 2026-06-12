import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { convertTrialToPaidSchema } from "@/lib/validation/platform";
import { convertInstanceToPaid } from "@/services/platform-service";

export async function POST(
  request: Request,
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
    const json = await request.json();
    const parsed = convertTrialToPaidSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data billing belum lengkap atau formatnya tidak valid." },
        { status: 400 },
      );
    }

    const { instanceId } = await context.params;
    await convertInstanceToPaid(instanceId, {
      ...parsed.data,
      actorUserId: session.sub,
      actorName: session.name,
      actorEmail: session.email,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Convert to paid gagal.",
      },
      { status: 400 },
    );
  }
}
