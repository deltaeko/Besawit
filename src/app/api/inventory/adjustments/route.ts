import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import {
  createManualStockAdjustment,
  getStockAdjustmentList,
} from "@/services/inventory-service";

export async function GET() {
  const adjustments = await getStockAdjustmentList();
  return NextResponse.json(adjustments);
}

export async function POST(request: Request) {
  const auth = await requirePermission("inventory.adjustments");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const payload = await request.json();
    const adjustment = await createManualStockAdjustment(payload, auth.session.sub);
    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stock adjustment." },
      { status: 400 },
    );
  }
}
