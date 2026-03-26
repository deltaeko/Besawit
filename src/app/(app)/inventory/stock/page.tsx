import { AlertTriangle, Boxes, PackageSearch } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { getMasterList } from "@/services/master-service";
import { getStockBalancePage } from "@/services/inventory-service";

export default async function InventoryStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  const pageSize = typeof query.pageSize === "string" ? Number(query.pageSize) : 20;
  const productId = typeof query.productId === "string" ? query.productId : "";
  const warehouseId = typeof query.warehouseId === "string" ? query.warehouseId : "";
  const lowStockOnly = typeof query.lowStock === "string" ? query.lowStock === "1" : false;

  const [balancesResult, products, warehouses] = await Promise.all([
    getStockBalancePage(page, pageSize, {
      productId: productId || undefined,
      warehouseId: warehouseId || undefined,
      lowStockOnly,
    }).catch(() => ({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    })),
    getMasterList("products", { status: "active", pageSize: 50 }).then((result) => result.items).catch(() => []),
    getMasterList("warehouses", { status: "active", pageSize: 50 }).then((result) => result.items).catch(() => []),
  ]);

  const balances = balancesResult.items;

  const rows = balances.map((item) => ({
    product: item.productName ?? item.productCode ?? "-",
    warehouse: item.warehouseName ?? item.warehouseCode ?? "-",
    quantityValue: Number(item.quantity),
    quantity: `${formatNumber(item.quantity)} ${item.unit ?? ""}`.trim(),
    minStockValue: Number(item.minStock ?? 0),
    minStock: `${formatNumber(item.minStock ?? 0)} ${item.unit ?? ""}`.trim(),
    averageCost: Number(item.averageCost),
    updatedAt: formatDateTime(item.updatedAt),
    productId: item.productId,
  }));

  const criticalCount = rows.filter((row) => row.quantityValue <= row.minStockValue).length;
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantityValue, 0);
  const paginationQuery = new URLSearchParams();
  paginationQuery.set("productId", productId);
  paginationQuery.set("warehouseId", warehouseId);
  paginationQuery.set("pageSize", String(balancesResult.meta.pageSize));
  if (lowStockOnly) paginationQuery.set("lowStock", "1");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Saldo Stok"
        description="Posisi stok per produk dan per gudang. Klik produk untuk melihat histori mutasi terkait."
      />

      <FilterBar
        left={
          <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-[220px] space-y-2">
              <label className="text-sm font-medium">Produk</label>
              <Select defaultValue={productId} name="productId" placeholder="Semua produk">
                {products.map((item) => (
                  <option key={String((item as { id: string }).id)} value={String((item as { id: string }).id)}>
                    {String((item as { name: string }).name)}
                  </option>
                ))}
              </Select>
            </div>
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
            <div className="min-w-[180px] space-y-2">
              <label className="text-sm font-medium">Tampilan</label>
              <Select defaultValue={lowStockOnly ? "1" : ""} name="lowStock" placeholder="Semua saldo">
                <option value="1">Hanya stok kritis</option>
              </Select>
            </div>
            <input name="pageSize" type="hidden" value={balancesResult.meta.pageSize} />
            <div className="flex items-end gap-2">
              <Button type="submit">Terapkan</Button>
            </div>
          </form>
        }
        right={
          <>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <Boxes className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Produk Di Stok
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">{rows.length} baris saldo</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <PackageSearch className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Total Kuantitas
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">{formatNumber(totalQuantity)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <AlertTriangle className="size-4" />
              Stok kritis: {criticalCount} item
            </div>
          </>
        }
      />

      <SimpleTable
        cellRenderers={{
          averageCost: (value) => formatCurrency(Number(value ?? 0)),
          quantity: (value, row) => {
            const isCritical = Number(row.quantityValue ?? 0) <= Number(row.minStockValue ?? 0);
            return (
              <div className="flex items-center justify-end gap-2">
                <span>{String(value ?? "-")}</span>
                {isCritical ? <Badge variant="warning">Kritis</Badge> : null}
              </div>
            );
          },
        }}
        columnLabels={{
          product: "Produk",
          warehouse: "Gudang",
          quantity: "Saldo Saat Ini",
          minStock: "Stok Minimum",
          averageCost: "Avg Cost",
          updatedAt: "Terakhir Update",
        }}
        columns={["product", "warehouse", "quantity", "minStock", "averageCost", "updatedAt"]}
        getHref={(row) => `/inventory/movements?productId=${row.productId}`}
        linkColumn="product"
        numericColumns={["quantity", "minStock", "averageCost"]}
        rows={rows}
      />

      <MasterPagination
        basePath="/inventory/stock"
        page={balancesResult.meta.page}
        query={paginationQuery}
        totalPages={balancesResult.meta.totalPages}
      />
    </div>
  );
}
