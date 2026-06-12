import { NextResponse } from "next/server";

import { requireDocumentPermission } from "@/lib/auth/api-guard";
import { sendManualWhatsapp } from "@/services/whatsapp-service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Parameters<typeof sendManualWhatsapp>[0] & {
      documentType?: "payable_statement" | "receivable_statement" | "payment_receipt" | "store_invoice" | "stock_take_report";
    };
    const manualDocumentType = payload.documentType;
    if (payload.referenceType === "manual" && !manualDocumentType) {
      return NextResponse.json(
        { error: "documentType wajib diisi untuk referensi manual." },
        { status: 400 },
      );
    }
    const auth =
      payload.referenceType === "manual"
        ? await requireDocumentPermission({
            referenceType: payload.referenceType,
            documentType: manualDocumentType!,
          })
        : await requireDocumentPermission({
            referenceType: payload.referenceType,
          });
    if (auth.response || !auth.session) {
      return auth.response;
    }
    const result = await sendManualWhatsapp({
      ...payload,
      sentBy: payload.sentBy ?? auth.session.sub,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log WhatsApp send." },
      { status: 400 },
    );
  }
}
