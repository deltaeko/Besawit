import { NextResponse } from "next/server";

import { requireActionPermission } from "@/lib/auth/action-guard";
import { approveManualStockAdjustment } from "@/services/inventory-service";

export async function POST(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireActionPermission("inventory.adjustments.approve");
  if (auth.response) return auth.response;

  const { id } = await context.params;

  try {
    const adjustment = await approveManualStockAdjustment(id, auth.session?.sub ?? null);
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
