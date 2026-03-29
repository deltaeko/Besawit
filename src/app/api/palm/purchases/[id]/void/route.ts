import { NextResponse } from "next/server";

import { requireActionPermission } from "@/lib/auth/action-guard";
import { voidPalmPurchase } from "@/services/palm-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireActionPermission("palm.purchases.void");
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const result = await voidPalmPurchase(id, auth.session?.sub ?? null);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membatalkan transaksi pembelian TBS.",
      },
      { status: 400 },
    );
  }
}
