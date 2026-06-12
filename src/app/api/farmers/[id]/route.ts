import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import { getMasterDetail, updateMaster } from "@/services/master-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const record = await getMasterDetail("farmers", id);

  if (!record) {
    return NextResponse.json({ error: "Farmer not found." }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = await request.json();
  const auth = await requirePermission("master.farmers");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const record = await updateMaster("farmers", id, payload, auth.session.sub);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update farmer." },
      { status: 400 },
    );
  }
}
