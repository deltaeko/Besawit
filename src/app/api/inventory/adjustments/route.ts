import { NextResponse } from "next/server";

import {
  createManualStockAdjustment,
  getStockAdjustmentList,
} from "@/services/inventory-service";

export async function GET() {
  const adjustments = await getStockAdjustmentList();
  return NextResponse.json(adjustments);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const adjustment = await createManualStockAdjustment(payload);
    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stock adjustment." },
      { status: 400 },
    );
  }
}
