import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import { getPalmPurchase, updatePalmPurchase } from "@/services/palm-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const purchase = await getPalmPurchase(id);

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }

  return NextResponse.json(purchase);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("palm.purchases");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const payload = await request.json();
    const purchase = await updatePalmPurchase(id, payload, auth.session.sub);
    return NextResponse.json(purchase);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update purchase.",
      },
      { status: 400 },
    );
  }
}
