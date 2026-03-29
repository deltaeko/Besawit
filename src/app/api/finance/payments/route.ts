import { NextResponse } from "next/server";

import { requireActionPermission } from "@/lib/auth/action-guard";
import { getPaymentList, postPayment } from "@/services/finance-service";

export async function GET() {
  const payments = await getPaymentList();
  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  const auth = await requireActionPermission("finance.payments.manage");
  if (auth.response) return auth.response;

  try {
    const payload = await request.json();
    const payment = await postPayment(payload, auth.session?.sub ?? null);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post payment." },
      { status: 400 },
    );
  }
}
