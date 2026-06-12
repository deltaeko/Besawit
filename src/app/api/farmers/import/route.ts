import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import {
  applyFarmerImport,
  previewFarmerImport,
} from "@/services/farmer-import-service";

type ImportAction = "preview" | "apply";
type DuplicateStrategy = "update_existing" | "skip_existing";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let action: ImportAction = "preview";
  let duplicateStrategy: DuplicateStrategy = "update_existing";
  let source:
    | { csvText: string }
    | { fileName: string; fileBuffer: ArrayBuffer }
    | null = null;

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as {
      csvText?: string;
      action?: ImportAction;
      duplicateStrategy?: DuplicateStrategy;
    };

    action = payload.action ?? "preview";
    duplicateStrategy = payload.duplicateStrategy ?? "update_existing";

    if (payload.csvText?.trim()) {
      source = { csvText: payload.csvText.trim() };
    }
  } else {
    const formData = await request.formData();
    const file = formData.get("file");
    action = (formData.get("action") as ImportAction | null) ?? "preview";
    duplicateStrategy =
      (formData.get("duplicateStrategy") as DuplicateStrategy | null) ?? "update_existing";

    if (file instanceof File) {
      source = {
        fileName: file.name,
        fileBuffer: await file.arrayBuffer(),
      };
    }
  }

  if (!source) {
    return NextResponse.json(
      { error: "File import belum dipilih atau masih kosong." },
      { status: 400 },
    );
  }

  try {
    if (action === "apply") {
      const auth = await requirePermission("master.farmers");
      if (auth.response || !auth.session) {
        return auth.response;
      }
      const result = await applyFarmerImport(
        source,
        duplicateStrategy,
        auth.session.sub,
      );

      return NextResponse.json(result);
    }

    const result = await previewFarmerImport(source, duplicateStrategy);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses import petani.",
      },
      { status: 400 },
    );
  }
}
