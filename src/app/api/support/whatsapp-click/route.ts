import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth/api-guard";
import { logSupportWhatsappClick } from "@/services/support-service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      href?: string;
      label?: string;
      message?: string;
      phone?: string;
      source?: string;
      pathname?: string;
      host?: string;
    };
    const auth = await requireSessionUser();
    if (auth.response || !auth.session) {
      return auth.response;
    }

    if (!payload.href || !payload.label || !payload.message || !payload.phone) {
      return NextResponse.json({ error: "Invalid support click payload." }, { status: 400 });
    }

    await logSupportWhatsappClick({
      actorId: auth.session.sub,
      actorName: auth.session.name,
      actorEmail: auth.session.email,
      href: payload.href,
      label: payload.label,
      message: payload.message,
      phone: payload.phone,
      source: payload.source ?? null,
      pathname: payload.pathname ?? null,
      host: payload.host ?? null,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log support click." },
      { status: 400 },
    );
  }
}
