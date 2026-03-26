import { NextResponse } from "next/server";

import { approveManualStockAdjustment } from "@/services/inventory-service";

export async function POST(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const adjustment = await approveManualStockAdjustment(id);
    return NextResponse.json(adjustment);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to approve stock adjustment.",
      },
      { status: 400 },
    );
  }
}
