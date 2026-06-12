import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { trialRequestSchema } from "@/lib/validation/trial";
import { createTrialRequest } from "@/services/trial-service";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = trialRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data trial belum lengkap atau formatnya tidak valid." },
      { status: 400 },
    );
  }

  try {
    const result = await createTrialRequest(parsed.data);

    return NextResponse.json({
      ok: true,
      mode: result.mode,
      requestId: result.requestId,
      subdomain: result.subdomain,
      loginUrl: result.loginUrl,
      setupUrl: result.setupUrl ?? null,
      trialEndsAt: result.trialEndsAt,
      contactWhatsapp: env.TRIAL_CONTACT_WHATSAPP || null,
    });
  } catch (error) {
    console.error("Failed to create trial request", error);

    return NextResponse.json(
      {
        error:
          "Permintaan trial belum berhasil diproses. Silakan coba lagi atau hubungi kami.",
      },
      { status: 500 },
    );
  }
}
