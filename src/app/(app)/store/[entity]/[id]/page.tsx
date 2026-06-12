import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt, Warehouse } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { canPerformAction } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PalmTransactionDetailActions } from "@/modules/palm/transaction-detail-actions";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { isStoreEntity } from "@/modules/store/helpers";
import { getPayableByReference, getReceivableByReference } from "@/services/finance-service";
import { getReferenceStockReversalStatus } from "@/services/inventory-service";
import {
  getStorePurchase,
  getStorePurchaseInvoice,
  getStorePurchaseReturnFormData,
  getStoreSale,
  getStoreSaleInvoice,
} from "@/services/store-service";

function MetricCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-[1.35rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(72,115,74,0.12),rgba(72,115,74,0.06))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
          : "rounded-[1.35rem] border border-border/80 bg-card/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
      }
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={emphasis ? "mt-2 text-2xl font-semibold tracking-tight" : "mt-2 text-base font-semibold"}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function StoreItemTable({
  rows,
}: {
  rows: Array<{
    id: string;
    productCode?: string | null;
    productName?: string | null;
    productUnit?: string | null;
    quantity: string | number;
    unitCost?: string | number;
    unitPrice?: string | number;
    lineTotal: string | number;
  }>;
}) {
  return (
    <SimpleTable
      cellRenderers={{
        unitCost: (value) => formatCurrency(Number(value ?? 0)),
        unitPrice: (value) => formatCurrency(Number(value ?? 0)),
        lineTotal: (value) => formatCurrency(Number(value ?? 0)),
      }}
      columnLabels={{
        productCode: "Kode",
        productName: "Produk",
        productUnit: "Unit",
        quantity: "Qty",
        unitCost: "Harga Beli",
        unitPrice: "Harga Jual",
        lineTotal: "Total",
      }}
      columns={
        rows[0]
          ? Object.keys(rows[0]).filter((key) => key !== "id")
          : ["productCode", "productName", "productUnit", "quantity", "unitPrice", "lineTotal"]
      }
      numericColumns={["quantity", "unitCost", "unitPrice", "lineTotal"]}
      rows={rows.map((item) => ({
        id: item.id,
        productCode: item.productCode ?? "-",
        productName: item.productName ?? "-",
        productUnit: item.productUnit ?? "-",
        quantity: Number(item.quantity ?? 0),
        unitCost: item.unitCost != null ? Number(item.unitCost) : undefined,
        unitPrice: item.unitPrice != null ? Number(item.unitPrice) : undefined,
        lineTotal: Number(item.lineTotal ?? 0),
      }))}
    />
  );
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!isStoreEntity(entity)) notFound();
  const session = await getSession();
  const canManagePayments = Boolean(
    session && canPerformAction(session.role, session.permissions, "finance.payments.manage"),
  );
  const canReturnStorePurchase = Boolean(
    session && canPerformAction(session.role, session.permissions, "store.purchases.return"),
  );
  const canVoidStorePurchase = Boolean(
    session && canPerformAction(session.role, session.permissions, "store.purchases.void"),
  );

  const data =
    entity === "purchases"
      ? await getStorePurchase(id).catch(() => null)
      : await getStoreSale(id).catch(() => null);

  if (!data) notFound();

  const isPurchase = entity === "purchases";
  const paymentStatus = String(data.paymentStatus ?? "unpaid");
  const transactionStatus = String(data.status ?? "active");
  const financeReference = isPurchase
    ? await getPayableByReference("store_purchase", id).catch(() => null)
    : await getReceivableByReference("store_sale", id).catch(() => null);
  const document = isPurchase
    ? await getStorePurchaseInvoice(id).catch(() => null)
    : await getStoreSaleInvoice(id).catch(() => null);
  const purchaseReturnContext = isPurchase
    ? await getStorePurchaseReturnFormData(id).catch(() => null)
    : null;
  const purchaseReversalStatus = isPurchase
    ? await getReferenceStockReversalStatus("store_purchase", id).catch(() => ({
        canReverse: true,
        blockers: [],
        movementCount: 0,
      }))
    : null;
  const returnTo = `/store/${entity}/${id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        stackAction
        eyebrow="Transaksi Toko"
        title={isPurchase ? "Detail Pembelian Barang" : "Detail Penjualan Toko"}
        action={
          <PalmTransactionDetailActions
            backHref={`/store/${entity}`}
            documentHref={isPurchase ? `/store/purchases/${id}/invoice` : `/store/sales/${id}/invoice`}
            documentLabel={isPurchase ? "Preview Slip Pembelian" : "Preview Nota"}
            editDisabledReason={
              isPurchase
                ? "Transaksi pembelian toko belum mendukung ubah langsung."
                : "Transaksi penjualan toko belum mendukung ubah langsung."
            }
            paymentDisabledReason={
              canManagePayments
                ? null
                : isPurchase
                  ? "Anda tidak memiliki hak akses untuk mencatat pembayaran."
                  : "Anda tidak memiliki hak akses untuk mencatat penerimaan."
            }
            paymentHref={
              isPurchase
                ? `/finance/payments?payableId=${financeReference?.id}&returnTo=${returnTo}`
                : `/finance/payments?receivableId=${financeReference?.id}&returnTo=${returnTo}`
            }
            paymentLabel={isPurchase ? "Catat Pembayaran" : "Catat Penerimaan"}
            paymentStatus={paymentStatus}
            transactionStatus={transactionStatus}
            extraAction={
              isPurchase
                ? {
                    href: `/store/purchases/${id}/returns/new`,
                    label: "Retur Pembelian",
                    disabledReason:
                      transactionStatus !== "active"
                        ? "Hanya pembelian aktif yang bisa diretur."
                        : !canReturnStorePurchase
                          ? "Anda tidak memiliki hak akses untuk retur pembelian."
                        : Number(financeReference?.paidAmount ?? 0) > 0
                          ? "Retur pembelian saat ini hanya didukung sebelum ada pembayaran supplier."
                          : purchaseReturnContext && !purchaseReturnContext.summary.hasReturnableItems
                            ? "Semua item pembelian ini sudah diretur penuh."
                            : null,
                  }
                : undefined
            }
            voidAction={
              isPurchase
                ? {
                    apiPath: `/api/store/purchases/${id}/void`,
                    disabledReason:
                      transactionStatus !== "active"
                        ? "Hanya transaksi aktif yang bisa dibatalkan."
                        : !canVoidStorePurchase
                          ? "Anda tidak memiliki hak akses untuk void pembelian barang."
                        : paymentStatus === "partial" || paymentStatus === "paid"
                          ? "Pembelian yang sudah memiliki pembayaran tidak bisa dibatalkan otomatis."
                          : purchaseReversalStatus && !purchaseReversalStatus.canReverse
                            ? `Saldo stok ${purchaseReversalStatus.blockers[0]?.productName ?? "produk"} di ${purchaseReversalStatus.blockers[0]?.warehouseName ?? "gudang"} tidak cukup untuk reversal.`
                          : null,
                    label: "Void Pembelian",
                  }
                : undefined
            }
          />
        }
      />

      <div className="overflow-hidden rounded-[1.8rem] border border-white/90 bg-[radial-gradient(circle_at_top_left,rgba(97,143,96,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,244,0.94))] p-5 shadow-[0_26px_72px_-42px_rgba(20,37,24,0.28)] ring-1 ring-black/[0.02]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Store</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Kode Transaksi
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{data.code}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={resolvePalmStatusBadgeVariant(transactionStatus)}>
                {formatPalmStatusLabel(transactionStatus)}
              </Badge>
              <Badge variant={resolvePalmStatusBadgeVariant(paymentStatus)}>
                {formatPalmStatusLabel(paymentStatus)}
              </Badge>
              {!isPurchase ? (
                <Badge variant={String((data as { saleType?: string }).saleType) === "credit" ? "warning" : "neutral"}>
                  {String((data as { saleType?: string }).saleType) === "credit" ? "Kredit" : "Tunai"}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="rounded-[1.2rem] border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
            Tanggal transaksi {formatDate(String(data.transactionDate))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard title="Informasi Umum" description="Rincian pihak transaksi, gudang, dan referensi invoice.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Tanggal" value={formatDate(String(data.transactionDate))} />
              <MetricCard
                label={isPurchase ? "Supplier" : "Pelanggan Toko"}
                value={String(
                  isPurchase
                    ? (data as Record<string, unknown>).supplierName ?? "-"
                    : (data as Record<string, unknown>).customerName ?? "-",
                )}
              />
              <MetricCard
                label="Gudang"
                value={String((data as Record<string, unknown>).warehouseName ?? "-")}
              />
            </div>
            <div className="mt-4 rounded-[1.35rem] border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Warehouse className="size-4 text-primary" />
                Nomor Referensi
              </div>
              {String(data.invoiceNumber ?? "-")}
            </div>
          </SectionCard>

          <SectionCard title="Ringkasan Nilai" description="Komponen nilai transaksi yang tersimpan pada dokumen toko.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Subtotal" value={formatCurrency(Number(data.subtotal))} />
              <MetricCard label="Diskon" value={formatCurrency(Number(data.discount))} />
              <MetricCard label="Pajak" value={formatCurrency(Number(data.tax))} />
              <MetricCard emphasis label="Total Transaksi" value={formatCurrency(Number(data.totalAmount))} />
            </div>
          </SectionCard>

          <SectionCard
            title={isPurchase ? "Item Pembelian" : "Item Penjualan"}
            description={
              isPurchase
                ? "Daftar barang yang dibeli dari supplier pada dokumen ini."
                : "Daftar barang yang dijual pada dokumen ini."
            }
          >
            <StoreItemTable rows={document?.items ?? []} />
          </SectionCard>

          {isPurchase ? (
            <SectionCard
              title="Ringkasan Retur"
              description="Pantau nilai retur pembelian barang yang sudah dicatat dan sisa item yang masih bisa diretur."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Total Retur"
                  value={formatCurrency(Number(purchaseReturnContext?.summary.totalReturnedAmount ?? 0))}
                />
                <MetricCard
                  label="Dokumen Retur"
                  value={String(purchaseReturnContext?.summary.returnCount ?? 0)}
                />
                <MetricCard
                  emphasis
                  label="Sisa Hutang"
                  value={formatCurrency(Number(financeReference?.outstandingAmount ?? data.totalAmount ?? 0))}
                />
              </div>
              <div className="mt-4 space-y-2 rounded-[1.35rem] border border-border/80 bg-muted/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                {(purchaseReturnContext?.returns ?? []).length ? (
                  purchaseReturnContext!.returns.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 text-sm last:border-b-0 last:pb-0"
                    >
                      <div>
                        <Link
                          className="font-semibold text-primary hover:underline"
                          href={`/store/purchase-returns/${item.id}`}
                        >
                          {item.code}
                        </Link>
                        <div className="text-muted-foreground">{formatDate(String(item.returnDate))}</div>
                      </div>
                      <div className="font-semibold text-foreground">
                        {formatCurrency(Number(item.totalReturnAmount))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Belum ada retur pembelian yang dicatat untuk transaksi ini.
                  </div>
                )}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Catatan" description="Catatan tambahan transaksi untuk audit dan tindak lanjut operasional.">
            <div className="rounded-[1.35rem] border border-border/80 bg-muted/20 p-4 text-sm leading-7 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
              {String(data.notes ?? "").trim() || "Tidak ada catatan."}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Status Dokumen" description="Status transaksi dan pembayaran yang aktif saat ini.">
          <div className="space-y-1">
            <DetailRow label="Status Transaksi" value={formatPalmStatusLabel(transactionStatus)} />
            <DetailRow label="Status Pembayaran" value={formatPalmStatusLabel(paymentStatus)} />
            {!isPurchase ? (
              <DetailRow
                label="Jenis Penjualan"
                value={String((data as { saleType?: string }).saleType) === "credit" ? "Kredit" : "Tunai"}
              />
            ) : null}
            <DetailRow label="Kode" value={data.code} />
            <DetailRow label="Tanggal Dibuat" value={formatDate(String(data.createdAt))} />
          </div>
          <div className="mt-4 rounded-[1.35rem] border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <Receipt className="size-4 text-primary" />
              Catatan operasional
            </div>
            {isPurchase
              ? "Pembelian toko memengaruhi stok masuk dan hutang supplier."
              : "Penjualan toko memengaruhi stok keluar dan piutang pelanggan toko bila transaksi kredit."}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
