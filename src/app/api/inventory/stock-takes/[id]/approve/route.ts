import { NextResponse } from "next/server";

import { approveStockTake } from "@/services/inventory-service";

export async function POST(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const result = await approveStockTake(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve stock take." },
      { status: 400 },
    );
  }
}
