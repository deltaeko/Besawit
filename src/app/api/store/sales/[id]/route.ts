import { NextResponse } from "next/server";

import { getStoreSale } from "@/services/store-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sale = await getStoreSale(id);

  if (!sale) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  return NextResponse.json(sale);
}
