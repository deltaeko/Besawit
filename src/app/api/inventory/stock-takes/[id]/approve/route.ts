import { NextResponse } from "next/server";

import { requireActionPermission } from "@/lib/auth/action-guard";
import { approveStockTake } from "@/services/inventory-service";

export async function POST(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireActionPermission("inventory.stock_takes.approve");
  if (auth.response) return auth.response;

  const { id } = await context.params;

  try {
    const result = await approveStockTake(id, auth.session?.sub ?? null);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve stock take." },
      { status: 400 },
    );
  }
}
