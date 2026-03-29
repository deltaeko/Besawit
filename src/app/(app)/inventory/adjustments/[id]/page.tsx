import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, FileStack, PackageSearch, Warehouse } from "lucide-react";

import { AuditLogPanel } from "@/components/shared/audit-log-panel";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canPerformAction } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { getAuditLogsByEntity } from "@/services/audit-service";
import { getInventoryAdjustmentFormOptions, getStockAdjustmentDetail } from "@/services/inventory-service";

function getReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    correction: "Koreksi",
    damaged: "Rusak",
    lost: "Hilang",
    transfer: "Transfer",
    stock_take: "Opname",
    other: "Lainnya",
  };

  return labels[reason] ?? reason;
}

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
  items: Array<{ label: string; value: string }>;
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

export default async function InventoryAdjustmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const canApproveAdjustment = Boolean(
    session && canPerformAction(session.role, session.permissions, "inventory.adjustments.approve"),
  );
  const [detail, options, auditLogs] = await Promise.all([
    getStockAdjustmentDetail(id).catch(() => null),
    getInventoryAdjustmentFormOptions().catch(() => ({
      warehouses: [],
      products: [],
      balances: [],
      reasons: [],
    })),
    getAuditLogsByEntity("stock_adjustments", id, 20).catch(() => []),
  ]);

  if (!detail) notFound();

  const warehouseById = new Map(options.warehouses.map((item) => [item.id, item.name]));
  const adjustment = detail.adjustment;
  const items = detail.items;
  const totalQty = items.reduce((sum, item) => sum + Math.abs(Number(item.adjustmentQty)), 0);
  const approvalLog = auditLogs.find((item) => item.action === "approve_manual_adjustment");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Detail Adjustment Stok"
        description="Dokumen mutasi stok ini menyimpan alasan, saldo sebelum dan sesudah, serta jejak approval untuk audit persediaan."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/inventory/adjustments">
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </Button>
            {adjustment.status === "pending" && canApproveAdjustment ? (
              <form action={`/api/inventory/adjustments/${id}/approve`} method="post">
                <Button type="submit">
                  <ClipboardCheck className="size-4" />
                  Approve
                </Button>
              </form>
            ) : adjustment.status === "pending" ? (
              <Button
                disabled
                title="Anda tidak memiliki hak akses untuk approve adjustment."
                type="button"
              >
                <ClipboardCheck className="size-4" />
                Approve
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Inventory</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Kode Adjustment</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{adjustment.code}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={resolvePalmStatusBadgeVariant(String(adjustment.status))}>
                {formatPalmStatusLabel(String(adjustment.status))}
              </Badge>
              <Badge variant="neutral">{getReasonLabel(String(adjustment.reason))}</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Dicatat {formatDateTime(adjustment.createdAt)}
          </div>
        </div>
      </div>

      <SectionCard
        title="Ringkasan Adjustment"
        description="Status dokumen, nilai mutasi, dan volume item yang terbentuk dari adjustment ini."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard emphasis label="Nilai Mutasi" value={formatCurrency(adjustment.totalVarianceValue)} />
          <SummaryCard label="Jumlah Item" value={`${items.length} produk`} />
          <SummaryCard label="Total Qty Mutasi" value={formatNumber(totalQty)} />
          <SummaryCard label="Status" value={formatPalmStatusLabel(String(adjustment.status))} />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SectionCard
          title="Informasi Dokumen"
          description="Gudang, alasan mutasi, referensi stock take, dan catatan operasional."
        >
          <InfoList
            items={[
              {
                label: "Gudang Asal",
                value: adjustment.warehouseName ?? warehouseById.get(String(adjustment.warehouseId)) ?? "-",
              },
              {
                label: "Gudang Tujuan",
                value: adjustment.targetWarehouseId
                  ? warehouseById.get(String(adjustment.targetWarehouseId)) ?? "-"
                  : "-",
              },
              {
                label: "Alasan Mutasi",
                value: getReasonLabel(String(adjustment.reason)),
              },
              {
                label: "Referensi Stock Take",
                value: adjustment.stockTakeId ? String(adjustment.stockTakeId) : "-",
              },
              {
                label: "Catatan",
                value: adjustment.notes?.trim() || "Tidak ada catatan",
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Approval & Metadata"
          description="Informasi administratif untuk penelusuran dokumen dan approval."
        >
          <InfoList
            items={[
              {
                label: "Dibuat Oleh",
                value: adjustment.createdByName ?? "Sistem",
              },
              {
                label: "Dibuat Pada",
                value: formatDateTime(adjustment.createdAt),
              },
              {
                label: "Disetujui Oleh",
                value: approvalLog?.actorName ?? approvalLog?.actorEmail ?? "-",
              },
              {
                label: "Disetujui Pada",
                value: formatDateTime(adjustment.approvedAt),
              },
              {
                label: "ID Dokumen",
                value: String(adjustment.id),
              },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Item Mutasi"
        description="Rincian saldo sebelum, qty mutasi, saldo sesudah, dan nilai perubahan persediaan per produk."
      >
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Warehouse className="size-4" />
          {items.length} baris item mutasi tercatat untuk dokumen ini.
        </div>
        <SimpleTable
          density="compact"
          cellRenderers={{
            adjustmentType: (value) => <Badge variant="neutral">{getMovementLabel(String(value ?? "-"))}</Badge>,
            reason: (value) => <Badge variant="neutral">{getReasonLabel(String(value ?? "-"))}</Badge>,
            systemQty: (value) => formatNumber(Number(value ?? 0)),
            beforeQty: (value) => formatNumber(Number(value ?? 0)),
            adjustmentQty: (value) => formatNumber(Number(value ?? 0)),
            afterQty: (value) => formatNumber(Number(value ?? 0)),
            unitCost: (value) => formatCurrency(Number(value ?? 0)),
            varianceValue: (value) => formatCurrency(Number(value ?? 0)),
          }}
          columnLabels={{
            product: "Produk",
            adjustmentType: "Jenis Mutasi",
            reason: "Alasan",
            beforeQty: "Saldo Sebelum",
            adjustmentQty: "Qty Mutasi",
            afterQty: "Saldo Sesudah",
            unitCost: "Nilai/Unit",
            varianceValue: "Nilai",
          }}
          columns={[
            "product",
            "adjustmentType",
            "reason",
            "beforeQty",
            "adjustmentQty",
            "afterQty",
            "unitCost",
            "varianceValue",
          ]}
          numericColumns={["beforeQty", "adjustmentQty", "afterQty", "unitCost", "varianceValue"]}
          rows={items.map((item) => ({
            product: item.productName ?? item.productCode ?? "-",
            adjustmentType: String(item.adjustmentType),
            reason: String(item.reason),
            beforeQty: Number(item.beforeQty),
            adjustmentQty: Number(item.adjustmentQty),
            afterQty: Number(item.afterQty),
            unitCost: Number(item.unitCost),
            varianceValue: Number(item.varianceValue),
          }))}
        />
      </SectionCard>

      <SectionCard
        title="Posisi Audit"
        description="Snapshot singkat jumlah item, nilai mutasi, dan status dokumen untuk pengecekan cepat."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PackageSearch className="size-4" />
              Baris item
            </div>
            <div className="mt-2 text-xl font-semibold">{items.length}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileStack className="size-4" />
              Nilai dokumen
            </div>
            <div className="mt-2 text-xl font-semibold">{formatCurrency(adjustment.totalVarianceValue)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClipboardCheck className="size-4" />
              Status
            </div>
            <div className="mt-2 text-xl font-semibold">{formatPalmStatusLabel(String(adjustment.status))}</div>
          </div>
        </div>
      </SectionCard>

      <AuditLogPanel items={auditLogs} />
    </div>
  );
}
