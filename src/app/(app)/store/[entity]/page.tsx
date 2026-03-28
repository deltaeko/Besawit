import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, Database, ReceiptText, ShoppingBasket } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { isStoreEntity } from "@/modules/store/helpers";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { getStorePurchaseList, getStoreSaleList } from "@/services/store-service";

function formatSaleType(value: unknown) {
  return String(value) === "credit" ? "Kredit" : "Tunai";
}

export default async function StoreEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (!isStoreEntity(entity)) notFound();

  const isPurchase = entity === "purchases";
  const list = isPurchase
    ? await getStorePurchaseList().catch(() => [])
    : await getStoreSaleList().catch(() => []);

  const rows = list.map((item) => {
    const row = item as Record<string, unknown>;
    return isPurchase
      ? {
          id: row.id,
          code: row.code,
          transactionDate: formatDate(String(row.transactionDate)),
          totalAmount: String(row.totalAmount ?? 0),
          paymentStatus: String(row.paymentStatus ?? "unpaid"),
          status: String(row.status ?? "active"),
        }
      : {
          id: row.id,
          code: row.code,
          transactionDate: formatDate(String(row.transactionDate)),
          saleType: String(row.saleType ?? "cash"),
          totalAmount: String(row.totalAmount ?? 0),
          paymentStatus: String(row.paymentStatus ?? "unpaid"),
        };
  });

  const totalValue = list.reduce(
    (sum, row) => sum + Number((row as Record<string, unknown>).totalAmount ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaksi Toko"
        title={isPurchase ? "Pembelian Barang Toko" : "Penjualan Barang Toko"}
        description={
          isPurchase
            ? "Kelola pembelian barang dari supplier untuk stok masuk, hutang supplier, dan nilai persediaan."
            : "Kelola penjualan barang toko ke pelanggan toko, baik tunai maupun kredit. Jika pelanggan toko terhubung ke petani, piutang dapat dipotong dari hasil TBS."
        }
        action={
          <Button asChild>
            <Link href={`/store/${entity}/new`}>Tambah Transaksi</Link>
          </Button>
        }
      />

      <FilterBar
        left={
          <>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <Database className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Transaksi Ditampilkan
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">{rows.length} dokumen terbaru</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                {isPurchase ? <ShoppingBasket className="size-4" /> : <ReceiptText className="size-4" />}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Nilai Total
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(totalValue)}
                </div>
              </div>
            </div>
          </>
        }
        right={
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <CreditCard className="size-4" />
            Data diambil dari transaksi aktif yang sudah tersimpan.
          </div>
        }
      />

      {rows.length ? (
        <SimpleTable
          cellRenderers={
            isPurchase
              ? {
                  totalAmount: (value) => formatCurrency(Number(value ?? 0)),
                  paymentStatus: (value) => (
                    <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "unpaid"))}>
                      {formatPalmStatusLabel(String(value ?? "unpaid"))}
                    </Badge>
                  ),
                  actions: (_, row) => {
                    const paymentStatus = String(row.paymentStatus ?? "unpaid");
                    const status = String(row.status ?? "active");
                    const canReturn = status === "active" && paymentStatus === "unpaid";

                    return (
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/store/purchases/${String(row.id)}`}>Lihat</Link>
                        </Button>
                        {canReturn ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/store/purchases/${String(row.id)}/returns/new`}>Retur</Link>
                          </Button>
                        ) : (
                          <Button
                            disabled
                            size="sm"
                            title="Retur hanya tersedia untuk pembelian aktif yang belum memiliki pembayaran."
                            variant="outline"
                          >
                            Retur
                          </Button>
                        )}
                      </div>
                    );
                  },
                }
              : {
                  totalAmount: (value) => formatCurrency(Number(value ?? 0)),
                  saleType: (value) => (
                    <Badge variant={String(value) === "credit" ? "warning" : "neutral"}>
                      {formatSaleType(value)}
                    </Badge>
                  ),
                  paymentStatus: (value) => (
                    <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "unpaid"))}>
                      {formatPalmStatusLabel(String(value ?? "unpaid"))}
                    </Badge>
                  ),
                }
          }
          columns={Object.keys(rows[0]).filter((column) => column !== "id")}
          columnLabels={
            isPurchase
              ? {
                  code: "Kode",
                  transactionDate: "Tanggal",
                  totalAmount: "Total Transaksi",
                  paymentStatus: "Status Pembayaran",
                  actions: "Aksi",
                }
              : {
                  code: "Kode",
                  transactionDate: "Tanggal",
                  saleType: "Jenis Penjualan",
                  totalAmount: "Total Transaksi",
                  paymentStatus: "Status Pembayaran",
                }
          }
          getHref={(row) => `/store/${entity}/${String(row.id)}`}
          linkColumn="code"
          numericColumns={["totalAmount"]}
          rows={rows}
        />
      ) : (
        <EmptyState
          title="Belum ada transaksi toko"
          description="Transaksi toko akan otomatis menghasilkan stock movement dan hutang atau piutang sesuai jenis transaksi."
        />
      )}
    </div>
  );
}
