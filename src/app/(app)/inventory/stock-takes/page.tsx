import Link from "next/link";
import { ClipboardCheck, FileSpreadsheet, PackageSearch } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { getMasterList } from "@/services/master-service";
import { getStockTakePage } from "@/services/inventory-service";

export default async function StockTakesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const warehouseId = typeof query.warehouseId === "string" ? query.warehouseId : "";
  const status = typeof query.status === "string" ? query.status : "";
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  const pageSize = typeof query.pageSize === "string" ? Number(query.pageSize) : 20;

  const [stockTakesResult, warehouses] = await Promise.all([
    getStockTakePage(page, pageSize, {
      warehouseId: warehouseId || undefined,
      status: (status || undefined) as
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "cancelled"
        | undefined,
    }).catch(() => ({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    })),
    getMasterList("warehouses", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
  ]);

  const stockTakes = stockTakesResult.items;
  const rows = stockTakes.map((item) => ({
    id: item.id,
    code: item.code,
    stockDate: formatDate(item.stockDate),
    warehouse: item.warehouseName ?? item.warehouseCode ?? "-",
    status: String(item.status),
    varianceValue: Number(item.varianceValue),
  }));

  const approvedCount = rows.filter((row) => row.status === "approved").length;
  const totalVariance = rows.reduce((sum, row) => sum + row.varianceValue, 0);

  const paginationQuery = new URLSearchParams();
  paginationQuery.set("warehouseId", warehouseId);
  paginationQuery.set("status", status);
  paginationQuery.set("pageSize", String(stockTakesResult.meta.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Stock Take"
        description="Kelola dokumen stock take dengan approval workflow dan adjustment otomatis."
        action={
          <Button asChild>
            <Link href="/inventory/stock-takes/new">Buat Stock Take</Link>
          </Button>
        }
      />

      <FilterBar
        left={
          <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-[220px] space-y-2">
              <label className="text-sm font-medium">Gudang</label>
              <Select defaultValue={warehouseId} name="warehouseId" placeholder="Semua gudang">
                {warehouses.map((item) => (
                  <option key={String((item as { id: string }).id)} value={String((item as { id: string }).id)}>
                    {String((item as { name: string }).name)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[200px] space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select defaultValue={status} name="status" placeholder="Semua status">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Dibatalkan</option>
              </Select>
            </div>
            <input name="pageSize" type="hidden" value={stockTakesResult.meta.pageSize} />
            <div className="flex items-end gap-2">
              <Button type="submit">Terapkan</Button>
            </div>
          </form>
        }
        right={
          <>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <FileSpreadsheet className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Dokumen</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatNumber(stockTakesResult.meta.total, 0)} stock take
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <ClipboardCheck className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Approved</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{approvedCount} dokumen</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <PackageSearch className="size-4" />
              Total nilai variance {formatCurrency(totalVariance)}
            </div>
          </>
        }
      />

      <SimpleTable
        cellRenderers={{
          status: (value) => (
            <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "pending"))}>
              {formatPalmStatusLabel(String(value ?? "pending"))}
            </Badge>
          ),
          varianceValue: (value) => formatCurrency(Number(value ?? 0)),
        }}
        columnLabels={{
          code: "Kode",
          stockDate: "Tanggal",
          warehouse: "Gudang",
          status: "Status",
          varianceValue: "Nilai Variance",
        }}
        columns={["code", "stockDate", "warehouse", "status", "varianceValue"]}
        getHref={(row) => `/inventory/stock-takes/${String(row.id)}`}
        linkColumn="code"
        numericColumns={["varianceValue"]}
        rows={rows}
      />

      <MasterPagination
        basePath="/inventory/stock-takes"
        page={stockTakesResult.meta.page}
        query={paginationQuery}
        totalPages={stockTakesResult.meta.totalPages}
      />
    </div>
  );
}
