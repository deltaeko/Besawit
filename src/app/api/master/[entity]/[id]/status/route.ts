import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { isMasterEntity } from "@/modules/master/helpers";
import { changeMasterStatus } from "@/services/master-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await context.params;

  if (!isMasterEntity(entity)) {
    return NextResponse.json({ error: "Unknown entity." }, { status: 404 });
  }

  const { isActive } = (await request.json()) as { isActive?: boolean };
  const session = await getSession();

  try {
    const record = await changeMasterStatus(entity, id, Boolean(isActive), session?.sub);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update status." },
      { status: 400 },
    );
  }
}
