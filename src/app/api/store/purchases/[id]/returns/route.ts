import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createStorePurchaseReturnTx } from "@/services/store-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  try {
    const payload = await request.json();
    const result = await createStorePurchaseReturnTx(id, payload, session?.sub ?? null);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create store purchase return.",
      },
      { status: 400 },
    );
  }
}
