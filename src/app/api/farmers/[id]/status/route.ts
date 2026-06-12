import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import { changeMasterStatus } from "@/services/master-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { isActive } = (await request.json()) as { isActive?: boolean };
  const auth = await requirePermission("master.farmers");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const record = await changeMasterStatus("farmers", id, Boolean(isActive), auth.session.sub);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update farmer status." },
      { status: 400 },
    );
  }
}
