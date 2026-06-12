import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/api-guard";
import { changeProductPrice, getMasterDetail, getProductPriceHistoryList } from "@/services/master-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const [product, histories] = await Promise.all([
    getMasterDetail("products", id),
    getProductPriceHistoryList(id).catch(() => []),
  ]);

  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({
    product,
    histories,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = await request.json();
  const auth = await requirePermission("master.products");
  if (auth.response || !auth.session) {
    return auth.response;
  }

  try {
    const result = await changeProductPrice(id, payload, auth.session.sub);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui harga produk." },
      { status: 400 },
    );
  }
}
