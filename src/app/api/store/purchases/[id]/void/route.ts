import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { voidStorePurchase } from "@/services/store-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const result = await voidStorePurchase(id, session?.sub ?? null);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membatalkan transaksi pembelian barang.",
      },
      { status: 400 },
    );
  }
}
