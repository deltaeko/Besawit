import { NextResponse } from "next/server";

import { requireDocumentPermission } from "@/lib/auth/api-guard";
import { logDocumentPrint } from "@/services/document-service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Parameters<typeof logDocumentPrint>[0];
    const auth =
      payload.referenceType === "manual"
        ? await requireDocumentPermission({
            referenceType: payload.referenceType,
            documentType: payload.documentType,
          })
        : await requireDocumentPermission({
            referenceType: payload.referenceType,
          });
    if (auth.response) {
      return auth.response;
    }
    const result = await logDocumentPrint(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log document." },
      { status: 400 },
    );
  }
}
