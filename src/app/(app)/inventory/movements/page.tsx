import { ArrowRightLeft, Filter, PackageSearch } from "lucide-react";
import Link from "next/link";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { getInventoryStockFilterOptions, getStockMovementPage } from "@/services/inventory-service";

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

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const productId = typeof query.productId === "string" ? query.productId : "";
  const warehouseId = typeof query.warehouseId === "string" ? query.warehouseId : "";
  const reason = typeof query.reason === "string" ? query.reason : "";
  const dateFrom = typeof query.dateFrom === "string" ? query.dateFrom : "";
  const dateTo = typeof query.dateTo === "string" ? query.dateTo : "";
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  const pageSize = typeof query.pageSize === "string" ? Number(query.pageSize) : 20;

  const [movementsResult, filterOptions] = await Promise.all([
    getStockMovementPage(page, pageSize, {
      productId: productId || undefined,
      warehouseId: warehouseId || undefined,
      reason: (reason || undefined) as
        | "correction"
        | "damaged"
        | "lost"
        | "transfer"
        | "stock_take"
        | "other"
        | undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).catch(() => ({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    })),
    getInventoryStockFilterOptions().catch(() => ({
      products: [],
      warehouses: [],
      tbsPoolProductId: "",
    })),
  ]);
  const products = filterOptions.products;
  const warehouses = filterOptions.warehouses;
  const tbsPoolProductId = filterOptions.tbsPoolProductId;
  const movements = movementsResult.items;

  const rows = movements.map((item) => ({
    id: item.id,
    product: item.productId === tbsPoolProductId ? "TBS Pool (Sistem)" : item.productName ?? item.productCode ?? "-",
    warehouse: item.warehouseName ?? "-",
    movementType: getMovementLabel(String(item.movementType)),
    reason: getReasonLabel(String(item.reason)),
    beforeQuantity: Number(item.beforeQuantity),
    quantity: Number(item.quantity),
    afterQuantity: Number(item.afterQuantity),
    totalValue: Number(item.totalValue),
    movementDate: formatDateTime(item.movementDate),
  }));
  const paginationQuery = new URLSearchParams();
  paginationQuery.set("productId", productId);
  paginationQuery.set("warehouseId", warehouseId);
  paginationQuery.set("reason", reason);
  paginationQuery.set("dateFrom", dateFrom);
  paginationQuery.set("dateTo", dateTo);
  paginationQuery.set("pageSize", String(movementsResult.meta.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Histori Mutasi Stok"
        description="Semua perubahan stok tercatat dengan alasan, saldo sebelum, dan saldo sesudah. Gunakan filter untuk melihat histori per produk."
      />

      <FilterBar
        left={
          <form className="grid flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(170px,0.8fr)_minmax(170px,0.8fr)_auto] xl:items-end">
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium">Produk</label>
              <Select defaultValue={productId} name="productId" placeholder="Semua produk">
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium">Gudang</label>
              <Select defaultValue={warehouseId} name="warehouseId" placeholder="Semua gudang">
                {warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium">Alasan Mutasi</label>
              <Select defaultValue={reason} name="reason" placeholder="Semua alasan">
                <option value="correction">Koreksi</option>
                <option value="damaged">Rusak</option>
                <option value="lost">Hilang</option>
                <option value="transfer">Transfer</option>
                <option value="stock_take">Opname</option>
                <option value="other">Lainnya</option>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium">Dari Tanggal</label>
              <Input defaultValue={dateFrom} name="dateFrom" type="date" />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium">Sampai Tanggal</label>
              <Input defaultValue={dateTo} name="dateTo" type="date" />
            </div>
            <input name="pageSize" type="hidden" value={movementsResult.meta.pageSize} />
            <div className="flex items-end gap-2 xl:justify-end">
              <Button type="submit">
                <Filter className="size-4" />
                Terapkan
              </Button>
            </div>
          </form>
        }
        right={
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className="h-auto rounded-xl px-3 py-2"
              variant={productId === tbsPoolProductId ? "default" : "outline"}
            >
              <Link
                href={{
                  pathname: "/inventory/movements",
                  query: {
                    ...(warehouseId ? { warehouseId } : {}),
                    ...(reason ? { reason } : {}),
                    ...(dateFrom ? { dateFrom } : {}),
                    ...(dateTo ? { dateTo } : {}),
                    ...(movementsResult.meta.pageSize ? { pageSize: String(movementsResult.meta.pageSize) } : {}),
                    productId: tbsPoolProductId,
                  },
                }}
              >
                TBS Pool
              </Link>
            </Button>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <ArrowRightLeft className="size-4" />
              {movementsResult.meta.total} mutasi
            </div>
            {dateFrom || dateTo || reason ? (
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                <Filter className="size-4" />
                {reason ? `Alasan ${getReasonLabel(reason)}.` : "Filter tanggal aktif."}
              </div>
            ) : null}
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <PackageSearch className="size-4" />
              Histori siap audit
            </div>
          </div>
        }
      />

      <SimpleTable
        cellRenderers={{
          movementType: (value) => <Badge variant="neutral">{String(value ?? "-")}</Badge>,
          reason: (value) => <Badge variant="neutral">{String(value ?? "-")}</Badge>,
          beforeQuantity: (value) => formatNumber(Number(value ?? 0)),
          quantity: (value) => formatNumber(Number(value ?? 0)),
          afterQuantity: (value) => formatNumber(Number(value ?? 0)),
          totalValue: (value) => formatCurrency(Number(value ?? 0)),
        }}
        columnLabels={{
          product: "Produk",
          warehouse: "Gudang",
          movementType: "Jenis Mutasi",
          reason: "Alasan",
          beforeQuantity: "Saldo Sebelum",
          quantity: "Qty Mutasi",
          afterQuantity: "Saldo Sesudah",
          totalValue: "Nilai",
          movementDate: "Waktu",
        }}
        columns={[
          "product",
          "warehouse",
          "movementType",
          "reason",
          "beforeQuantity",
          "quantity",
          "afterQuantity",
          "totalValue",
          "movementDate",
        ]}
        getHref={(row) => `/inventory/movements/${String(row.id)}`}
        linkColumn="product"
        numericColumns={["beforeQuantity", "quantity", "afterQuantity", "totalValue"]}
        rows={rows}
      />

      <MasterPagination
        basePath="/inventory/movements"
        page={movementsResult.meta.page}
        query={paginationQuery}
        totalPages={movementsResult.meta.totalPages}
      />
    </div>
  );
}
