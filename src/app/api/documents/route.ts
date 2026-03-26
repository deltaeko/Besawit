import { NextResponse } from "next/server";

import { logDocumentPrint } from "@/services/document-service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Parameters<typeof logDocumentPrint>[0];
    const result = await logDocumentPrint(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log document." },
      { status: 400 },
    );
  }
}
