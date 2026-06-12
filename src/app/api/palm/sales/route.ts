import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import { createPalmSale, getPalmSaleList } from "@/services/palm-service";

export async function GET() {
  const sales = await getPalmSaleList();
  return NextResponse.json(sales);
}

export async function POST(request: Request) {
  const auth = await requirePermission("palm.sales");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const payload = await request.json();
    const sale = await createPalmSale(payload, auth.session.sub);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sale." },
      { status: 400 },
    );
  }
}
