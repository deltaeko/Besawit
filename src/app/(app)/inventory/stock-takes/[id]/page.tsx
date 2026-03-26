import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, PackageSearch } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { getStockAdjustmentByStockTake, getStockTakeDetail } from "@/services/inventory-service";

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
          ? "rounded-2xl border border-primary/20 bg-primary/10 p-4"
          : "rounded-2xl border border-border/80 bg-muted/20 p-4"
      }
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={emphasis ? "mt-2 text-2xl font-semibold tracking-tight" : "mt-2 text-base font-semibold"}>
        {value}
      </div>
    </div>
  );
}

export default async function StockTakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stockTake = await getStockTakeDetail(id).catch(() => null);

  if (!stockTake) notFound();

  const adjustment =
    stockTake.status === "approved" && stockTake.id
      ? await getStockAdjustmentByStockTake(String(stockTake.id)).catch(() => null)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Detail Stock Take"
        description="Approval stock take akan membentuk adjustment yang jelas dan histori mutasi stok yang bisa diaudit."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/inventory/stock-takes">
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </Button>
            {stockTake.status === "submitted" ? (
              <form action={`/api/inventory/stock-takes/${id}/approve`} method="post">
                <Button type="submit">
                  <ClipboardCheck className="size-4" />
                  Approve
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Inventory</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Kode Stock Take
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{stockTake.code}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={resolvePalmStatusBadgeVariant(String(stockTake.status))}>
                {formatPalmStatusLabel(String(stockTake.status))}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Tanggal opname {formatDateTime(stockTake.stockDate)}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <SectionCard title="Ringkasan Stock Take" description="Status dokumen, nilai variance, dan catatan opname.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Status" value={formatPalmStatusLabel(String(stockTake.status))} />
            <MetricCard label="Tanggal" value={formatDateTime(stockTake.stockDate)} />
            <MetricCard emphasis label="Nilai Variance" value={formatCurrency(stockTake.varianceValue)} />
            <MetricCard label="Catatan" value={stockTake.notes?.trim() || "Tidak ada catatan"} />
          </div>
        </SectionCard>

        {adjustment ? (
          <SectionCard
            title="Adjustment Hasil Opname"
            description="Adjustment ini terbentuk otomatis dari approval stock take dan menjadi sumber movement log resmi."
          >
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <PackageSearch className="size-4" />
              {adjustment.items.length} item adjustment terbentuk dari dokumen ini.
            </div>
            <SimpleTable
              cellRenderers={{
                beforeQty: (value) => formatNumber(Number(value ?? 0)),
                adjustmentQty: (value) => formatNumber(Number(value ?? 0)),
                afterQty: (value) => formatNumber(Number(value ?? 0)),
                varianceValue: (value) => formatCurrency(Number(value ?? 0)),
                reason: (value) => <Badge variant="neutral">{String(value ?? "-")}</Badge>,
              }}
              columnLabels={{
                productCode: "Produk",
                reason: "Alasan",
                beforeQty: "Saldo Sebelum",
                adjustmentQty: "Qty Adjustment",
                afterQty: "Saldo Sesudah",
                varianceValue: "Nilai",
              }}
              columns={["productCode", "reason", "beforeQty", "adjustmentQty", "afterQty", "varianceValue"]}
              numericColumns={["beforeQty", "adjustmentQty", "afterQty", "varianceValue"]}
              rows={adjustment.items.map((item) => ({
                productCode: item.productName ?? item.productCode ?? "-",
                reason: "Opname",
                beforeQty: Number(item.beforeQty),
                adjustmentQty: Number(item.adjustmentQty),
                afterQty: Number(item.afterQty),
                varianceValue: Number(item.varianceValue),
              }))}
            />
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
