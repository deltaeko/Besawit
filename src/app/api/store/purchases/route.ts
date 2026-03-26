import { NextResponse } from "next/server";

import { createStorePurchaseTx, getStorePurchaseList } from "@/services/store-service";

export async function GET() {
  const purchases = await getStorePurchaseList();
  return NextResponse.json(purchases);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const purchase = await createStorePurchaseTx(payload);
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create purchase." },
      { status: 400 },
    );
  }
}
