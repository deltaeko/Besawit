import { NextResponse } from "next/server";

import { getPaymentList, postPayment } from "@/services/finance-service";

export async function GET() {
  const payments = await getPaymentList();
  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const payment = await postPayment(payload);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post payment." },
      { status: 400 },
    );
  }
}
