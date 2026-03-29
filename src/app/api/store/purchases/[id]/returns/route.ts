import { NextResponse } from "next/server";

import { requireActionPermission } from "@/lib/auth/action-guard";
import { createStorePurchaseReturnTx } from "@/services/store-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireActionPermission("store.purchases.return");
  if (auth.response) return auth.response;

  const { id } = await context.params;

  try {
    const payload = await request.json();
    const result = await createStorePurchaseReturnTx(id, payload, auth.session?.sub ?? null);
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
