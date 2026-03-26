import { NextResponse } from "next/server";

import { getStorePurchase } from "@/services/store-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const purchase = await getStorePurchase(id);

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }

  return NextResponse.json(purchase);
}
