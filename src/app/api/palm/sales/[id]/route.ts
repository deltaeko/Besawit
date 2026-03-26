import { NextResponse } from "next/server";

import { getPalmSale } from "@/services/palm-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sale = await getPalmSale(id);

  if (!sale) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  return NextResponse.json(sale);
}
