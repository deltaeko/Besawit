import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createMaster, getMasterList } from "@/services/master-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await getMasterList("farmers", {
    q: searchParams.get("q") ?? "",
    status: (searchParams.get("status") as "all" | "active" | "inactive" | null) ?? "all",
    sort:
      (searchParams.get("sort") as "latest" | "oldest" | "code_asc" | "name_asc" | null) ??
      "latest",
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 10),
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const payload = await request.json();
  const session = await getSession();

  try {
    const record = await createMaster("farmers", payload, session?.sub);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create farmer." },
      { status: 400 },
    );
  }
}
