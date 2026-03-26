import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, FileText, PackageSearch, Warehouse } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { getStockMovementDetail } from "@/services/inventory-service";

function getMovementLabel(value: string) {
  const labels: Record<string, string> = {
    opening_balance: "Saldo Awal",
    purchase_in: "Pembelian Masuk",
    sales_out: "Penjualan Keluar",
    adjustment_in: "Adjustment Masuk",
    adjustment_out: "Adjustment Keluar",
    transfer_in: "Transfer Masuk",
    transfer_out: "Transfer Keluar",
  };

  return labels[value] ?? value;
}

function getReasonLabel(value: string) {
  const labels: Record<string, string> = {
    correction: "Koreksi",
    damaged: "Rusak",
    lost: "Hilang",
    transfer: "Transfer",
    stock_take: "Opname",
    other: "Lainnya",
  };

  return labels[value] ?? value;
}

function getReferenceLabel(value: string) {
  const labels: Record<string, string> = {
    store_purchase: "Pembelian Toko",
    store_sale: "Penjualan Toko",
    stock_take: "Stock Take",
    stock_adjustment: "Adjustment Stok",
    manual: "Manual",
    tbs_purchase: "Pembelian TBS",
    tbs_sale: "Penjualan TBS",
    payment: "Pembayaran",
  };

  return labels[value] ?? value;
}

function getReferenceHref(referenceType?: string | null, referenceId?: string | null) {
  if (!referenceType || !referenceId) return null;

  const mapping: Record<string, string> = {
    stock_adjustment: `/inventory/adjustments/${referenceId}`,
    stock_take: `/inventory/stock-takes/${referenceId}`,
    store_purchase: `/store/purchases/${referenceId}`,
    store_sale: `/store/sales/${referenceId}`,
    tbs_purchase: `/palm/purchases/${referenceId}`,
    tbs_sale: `/palm/sales/${referenceId}`,
  };

  return mapping[referenceType] ?? null;
}

function SummaryCard({
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
          ? "rounded-2xl border border-primary/20 bg-primary/10 p-4"
          : "rounded-2xl border border-border/70 bg-muted/20 p-4"
      }
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={emphasis ? "mt-2 text-2xl font-semibold tracking-tight" : "mt-2 text-base font-semibold"}>
        {value}
      </div>
    </div>
  );
}

function InfoList({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/10">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`grid gap-2 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-4 ${
            index < items.length - 1 ? "border-b border-border/70" : ""
          }`}
        >
          <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
          <div className="text-sm font-semibold text-foreground">{item.value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

export default async function InventoryMovementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movement = await getStockMovementDetail(id).catch(() => null);

  if (!movement) notFound();

  const referenceHref = getReferenceHref(movement.referenceType, movement.referenceId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Detail Mutasi Stok"
        description="Ringkasan perubahan stok per dokumen untuk verifikasi saldo, nilai mutasi, dan referensi transaksi sumber."
        action={
          <Button asChild variant="outline">
            <Link href="/inventory/movements">
              <ArrowLeft className="size-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Inventory</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">ID Mutasi</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{movement.id}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">{getMovementLabel(String(movement.movementType))}</Badge>
              <Badge variant="neutral">{getReasonLabel(String(movement.reason))}</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Dicatat {formatDateTime(movement.movementDate)}
          </div>
        </div>
      </div>

      <SectionCard
        title="Ringkasan Mutasi"
        description="Snapshot nilai, qty mutasi, dan posisi saldo sebelum serta sesudah pergerakan stok."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Produk" value={movement.productName ?? movement.productCode ?? "-"} />
          <SummaryCard label="Gudang" value={movement.warehouseName ?? movement.warehouseCode ?? "-"} />
          <SummaryCard emphasis label="Qty Mutasi" value={formatNumber(movement.quantity)} />
          <SummaryCard label="Nilai Mutasi" value={formatCurrency(movement.totalValue)} />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SectionCard
          title="Informasi Mutasi"
          description="Data operasional utama yang menjadi dasar perubahan stok."
        >
          <InfoList
            items={[
              {
                label: "Produk",
                value: movement.productName ?? movement.productCode ?? "-",
              },
              {
                label: "Gudang",
                value: movement.warehouseName ?? movement.warehouseCode ?? "-",
              },
              {
                label: "Jenis Mutasi",
                value: getMovementLabel(String(movement.movementType)),
              },
              {
                label: "Alasan",
                value: getReasonLabel(String(movement.reason)),
              },
              {
                label: "Dicatat Oleh",
                value: movement.createdByName ?? "Sistem",
              },
              {
                label: "Catatan",
                value: movement.notes?.trim() || "Tidak ada catatan",
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Saldo & Nilai"
          description="Perubahan saldo stok dan nilai unit yang tercatat pada dokumen ini."
        >
          <InfoList
            items={[
              {
                label: "Saldo Sebelum",
                value: `${formatNumber(movement.beforeQuantity)} unit`,
              },
              {
                label: "Qty Mutasi",
                value: `${formatNumber(movement.quantity)} unit`,
              },
              {
                label: "Saldo Sesudah",
                value: `${formatNumber(movement.afterQuantity)} unit`,
              },
              {
                label: "Nilai per Unit",
                value: formatCurrency(movement.unitCost),
              },
              {
                label: "Nilai Total",
                value: formatCurrency(movement.totalValue),
              },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Referensi Dokumen"
        description="Tautan ke dokumen sumber agar mutasi stok mudah ditelusuri kembali."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" />
              Tipe Referensi
            </div>
            <div className="mt-2 text-base font-semibold">
              {getReferenceLabel(String(movement.referenceType))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowRightLeft className="size-4" />
              ID Referensi
            </div>
            <div className="mt-2 break-all text-sm font-semibold">{movement.referenceId ?? "-"}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Warehouse className="size-4" />
              Counterparty Gudang
            </div>
            <div className="mt-2 text-base font-semibold">
              {movement.counterpartyWarehouseName ??
                movement.counterpartyWarehouseCode ??
                movement.counterpartyWarehouseId ??
                "-"}
            </div>
          </div>
        </div>
        {referenceHref ? (
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href={referenceHref}>Buka Dokumen Sumber</Link>
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Posisi Audit"
        description="Ringkasan cepat untuk verifikasi mutasi saat pemeriksaan stok dan rekonsiliasi dokumen."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PackageSearch className="size-4" />
              Qty Mutasi
            </div>
            <div className="mt-2 text-xl font-semibold">{formatNumber(movement.quantity)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowRightLeft className="size-4" />
              Saldo Akhir
            </div>
            <div className="mt-2 text-xl font-semibold">{formatNumber(movement.afterQuantity)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" />
              Nilai
            </div>
            <div className="mt-2 text-xl font-semibold">{formatCurrency(movement.totalValue)}</div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
