import { NextResponse } from "next/server";

import { createStoreSaleTx, getStoreSaleList } from "@/services/store-service";

export async function GET() {
  const sales = await getStoreSaleList();
  return NextResponse.json(sales);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const sale = await createStoreSaleTx(payload);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sale." },
      { status: 400 },
    );
  }
}
