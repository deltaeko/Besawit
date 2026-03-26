import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { isMasterEntity } from "@/modules/master/helpers";
import {
  createMaster,
  getMasterList,
  recordInitialProductPriceHistory,
} from "@/services/master-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;

  if (!isMasterEntity(entity)) {
    return NextResponse.json({ error: "Unknown entity." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);

  const records = await getMasterList(entity, {
    q: searchParams.get("q") ?? "",
    status: (searchParams.get("status") as "all" | "active" | "inactive" | null) ?? "all",
    sort:
      (searchParams.get("sort") as "latest" | "oldest" | "code_asc" | "name_asc" | null) ??
      "latest",
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 10),
  });
  return NextResponse.json(records);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;

  if (!isMasterEntity(entity)) {
    return NextResponse.json({ error: "Unknown entity." }, { status: 404 });
  }

  const payload = await request.json();
  const session = await getSession();

  try {
    const record = await createMaster(entity, payload, session?.sub);
    if (entity === "products") {
      await recordInitialProductPriceHistory(record.id, payload, session?.sub);
    }
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create record." },
      { status: 400 },
    );
  }
}
