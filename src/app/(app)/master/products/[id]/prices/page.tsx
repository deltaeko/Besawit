import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ProductPriceChangeForm } from "@/modules/master/product-price-change-form";
import { ProductPriceHistoryPanel } from "@/modules/master/product-price-history-panel";
import { getMasterDetail, getProductPriceHistoryList } from "@/services/master-service";

export default async function ProductPriceManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, histories] = await Promise.all([
    getMasterDetail("products", id).catch(() => null),
    getProductPriceHistoryList(id).catch(() => []),
  ]);

  if (!product) notFound();

  const productView = product as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master Data Produk"
        title="Kelola Harga Produk"
        description={`Perbarui harga beli dan harga jual untuk ${String(productView.name ?? "produk ini")} tanpa mencampur perubahan harga dengan edit data umum. Kode produk ${String(productView.code ?? "-")}.`}
        action={
          <Button asChild variant="outline">
            <Link href={`/master/products/${id}`}>Kembali ke Detail Produk</Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border bg-muted/30 p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Produk</div>
              <div className="mt-2 text-xl font-semibold">{String(productView.name ?? "-")}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {String(productView.unit ?? "-")} {productView.categoryName ? `- ${String(productView.categoryName)}` : ""}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kode Produk</div>
              <div className="mt-2 text-sm font-semibold">{String(productView.code ?? "-")}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Histori Tersimpan</div>
              <div className="mt-2 text-lg font-semibold">{histories.length}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status Harga</div>
              <div className="mt-2 text-sm font-semibold">Aktif dan Siap Dipakai Transaksi</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4 md:p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Harga Beli Aktif</div>
          <div className="mt-2 text-lg font-semibold">{formatCurrency(Number(productView.purchasePrice ?? 0))}</div>
          <div className="mt-1 text-sm text-muted-foreground">Harga beli default yang dipakai saat transaksi pembelian toko.</div>
        </div>

        <div className="rounded-2xl border bg-primary/10 p-4 md:p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Harga Jual Aktif</div>
          <div className="mt-2 text-xl font-semibold">{formatCurrency(Number(productView.sellingPrice ?? 0))}</div>
          <div className="mt-1 text-sm text-muted-foreground">Harga jual default yang muncul saat penjualan toko dibuat.</div>
        </div>
      </div>

      <ProductPriceChangeForm
        backHref={`/master/products/${id}`}
        currentPurchasePrice={Number(productView.purchasePrice ?? 0)}
        currentSellingPrice={Number(productView.sellingPrice ?? 0)}
        productId={id}
      />

      <ProductPriceHistoryPanel histories={histories} />
    </div>
  );
}
