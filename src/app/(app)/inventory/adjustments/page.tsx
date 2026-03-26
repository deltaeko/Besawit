import { ClipboardList, FileStack, PackagePlus } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { ApproveAdjustmentButton } from "@/modules/inventory/approve-adjustment-button";
import { StockAdjustmentForm } from "@/modules/inventory/stock-adjustment-form";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import {
  getInventoryAdjustmentFormOptions,
  getStockAdjustmentPage,
} from "@/services/inventory-service";

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

export default async function InventoryAdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const warehouseId = typeof query.warehouseId === "string" ? query.warehouseId : "";
  const status = typeof query.status === "string" ? query.status : "";
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  const pageSize = typeof query.pageSize === "string" ? Number(query.pageSize) : 20;

  const [adjustmentsResult, options] = await Promise.all([
    getStockAdjustmentPage(page, pageSize, {
      warehouseId: warehouseId || undefined,
      status: (status || undefined) as "pending" | "approved" | "cancelled" | undefined,
    }).catch(() => ({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    })),
    getInventoryAdjustmentFormOptions().catch(() => ({
      warehouses: [],
      products: [],
      balances: [],
      reasons: [],
    })),
  ]);

  const adjustments = adjustmentsResult.items;
  const rows = adjustments.map((item) => ({
    id: item.id,
    code: item.code,
    warehouse: item.warehouseName ?? "-",
    reason: getReasonLabel(String(item.reason)),
    status: String(item.status),
    totalVarianceValue: Number(item.totalVarianceValue),
    createdAt: formatDateTime(item.createdAt),
  }));

  const approvedCount = rows.filter((item) => item.status === "approved").length;
  const pendingCount = rows.filter((item) => item.status === "pending").length;
  const totalValue = rows.reduce((sum, row) => sum + row.totalVarianceValue, 0);

  const paginationQuery = new URLSearchParams();
  paginationQuery.set("warehouseId", warehouseId);
  paginationQuery.set("status", status);
  paginationQuery.set("pageSize", String(adjustmentsResult.meta.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Mutasi & Adjustment Stok"
        description="Catat adjustment masuk atau keluar, transfer gudang, dan histori mutasi operasional dengan alasan yang jelas."
      />

      <FilterBar
        left={
          <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-[220px] space-y-2">
              <label className="text-sm font-medium">Gudang</label>
              <Select defaultValue={warehouseId} name="warehouseId" placeholder="Semua gudang">
                {options.warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[200px] space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select defaultValue={status} name="status" placeholder="Semua status">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="cancelled">Dibatalkan</option>
              </Select>
            </div>
            <input name="pageSize" type="hidden" value={adjustmentsResult.meta.pageSize} />
            <div className="flex items-end gap-2">
              <Button type="submit">Terapkan</Button>
            </div>
          </form>
        }
        right={
          <>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <ClipboardList className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Dokumen Adjustment
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatNumber(adjustmentsResult.meta.total, 0)} dokumen
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <PackagePlus className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Approved
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">{approvedCount} adjustment</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <FileStack className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Pending
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">{pendingCount} adjustment</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <FileStack className="size-4" />
              Nilai mutasi {formatCurrency(totalValue)}
            </div>
          </>
        }
      />

      <StockAdjustmentForm
        products={options.products}
        reasons={options.reasons}
        balances={options.balances}
        warehouses={options.warehouses}
      />

      <SimpleTable
        cellRenderers={{
          reason: (value) => <Badge variant="neutral">{String(value ?? "-")}</Badge>,
          status: (value) => (
            <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "pending"))}>
              {formatPalmStatusLabel(String(value ?? "pending"))}
            </Badge>
          ),
          totalVarianceValue: (value) => formatCurrency(Number(value ?? 0)),
          actions: (_, row) =>
            row.status === "pending" ? (
              <ApproveAdjustmentButton adjustmentId={String(row.id)} />
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            ),
        }}
        columnLabels={{
          code: "Kode",
          warehouse: "Gudang",
          reason: "Alasan",
          status: "Status",
          totalVarianceValue: "Nilai Mutasi",
          createdAt: "Dicatat Pada",
          actions: "Aksi",
        }}
        columns={["code", "warehouse", "reason", "status", "totalVarianceValue", "createdAt", "actions"]}
        getHref={(row) => `/inventory/adjustments/${String(row.id)}`}
        linkColumn="code"
        numericColumns={["totalVarianceValue"]}
        rows={rows}
      />

      <MasterPagination
        basePath="/inventory/adjustments"
        page={adjustmentsResult.meta.page}
        query={paginationQuery}
        totalPages={adjustmentsResult.meta.totalPages}
      />
    </div>
  );
}
