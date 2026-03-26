import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { changeMasterStatus } from "@/services/master-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { isActive } = (await request.json()) as { isActive?: boolean };
  const session = await getSession();

  try {
    const record = await changeMasterStatus("farmers", id, Boolean(isActive), session?.sub);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update farmer status." },
      { status: 400 },
    );
  }
}
