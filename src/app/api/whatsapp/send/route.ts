import { NextResponse } from "next/server";

import { sendManualWhatsapp } from "@/services/whatsapp-service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Parameters<typeof sendManualWhatsapp>[0];
    const result = await sendManualWhatsapp(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log WhatsApp send." },
      { status: 400 },
    );
  }
}
