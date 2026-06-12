import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import { getStockTakeList, submitStockTake } from "@/services/inventory-service";

export async function GET() {
  const stockTakes = await getStockTakeList();
  return NextResponse.json(stockTakes);
}

export async function POST(request: Request) {
  const auth = await requirePermission("inventory.stock_takes");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const payload = await request.json();
    const stockTake = await submitStockTake(payload, auth.session.sub);
    return NextResponse.json(stockTake, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stock take." },
      { status: 400 },
    );
  }
}
