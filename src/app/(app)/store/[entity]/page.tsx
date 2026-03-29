import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, Database, ReceiptText, ShoppingBasket } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { isStoreEntity } from "@/modules/store/helpers";
import { MasterPagination } from "@/modules/master/master-pagination";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { getStorePurchasePage, getStoreSalePage } from "@/services/store-service";

function formatSaleType(value: unknown) {
  return String(value) === "credit" ? "Kredit" : "Tunai";
}

export default async function StoreEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entity } = await params;
  const filters = await searchParams;
  if (!isStoreEntity(entity)) notFound();

  const isPurchase = entity === "purchases";
  const page = typeof filters.page === "string" ? Number(filters.page) : 1;
  const pageSize = typeof filters.pageSize === "string" ? Number(filters.pageSize) : 20;
  const q = typeof filters.q === "string" ? filters.q : "";
  const paymentStatus = typeof filters.paymentStatus === "string" ? filters.paymentStatus : "all";
  const saleType = typeof filters.saleType === "string" ? filters.saleType : "all";
  const dateFrom = typeof filters.dateFrom === "string" ? filters.dateFrom : "";
  const dateTo = typeof filters.dateTo === "string" ? filters.dateTo : "";
  const result = isPurchase
    ? await getStorePurchasePage(page, pageSize, {
        q,
        paymentStatus,
        dateFrom,
        dateTo,
      }).catch(() => ({
        items: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      }))
    : await getStoreSalePage(page, pageSize, {
        q,
        paymentStatus,
        saleType,
        dateFrom,
        dateTo,
      }).catch(() => ({
        items: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      }));
  const list = result.items;

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
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("paymentStatus", paymentStatus);
  if (!isPurchase && saleType !== "all") query.set("saleType", saleType);
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  query.set("pageSize", String(result.meta.pageSize));

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
                  Total Dokumen
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {result.meta.total} transaksi
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                {isPurchase ? <ShoppingBasket className="size-4" /> : <ReceiptText className="size-4" />}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Nilai Halaman
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(totalValue)}
                </div>
              </div>
            </div>
          </>
        }
        right={
          <>
            <form className="grid w-full gap-3 xl:grid-cols-[minmax(220px,1.2fr)_180px_minmax(0,160px)_180px_180px_120px_auto] xl:items-end">
              <Input defaultValue={q} name="q" placeholder={isPurchase ? "Cari kode, supplier, invoice" : "Cari kode, pelanggan, invoice"} />
              <Select defaultValue={paymentStatus} name="paymentStatus">
                <option value="all">Semua status</option>
                <option value="unpaid">Belum Dibayar</option>
                <option value="partial">Sebagian</option>
                <option value="paid">Lunas</option>
                <option value="overdue">Lewat Jatuh Tempo</option>
                <option value="cancelled">Dibatalkan</option>
              </Select>
              {!isPurchase ? (
                <Select defaultValue={saleType} name="saleType">
                  <option value="all">Semua jenis</option>
                  <option value="cash">Tunai</option>
                  <option value="credit">Kredit</option>
                </Select>
              ) : (
                <input name="saleType" type="hidden" value="all" />
              )}
              <Input defaultValue={dateFrom} name="dateFrom" type="date" />
              <Input defaultValue={dateTo} name="dateTo" type="date" />
              <Select defaultValue={String(result.meta.pageSize)} name="pageSize">
                <option value="10">10 / halaman</option>
                <option value="20">20 / halaman</option>
                <option value="50">50 / halaman</option>
              </Select>
              <Button type="submit">Terapkan</Button>
            </form>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <CreditCard className="size-4" />
              Halaman {result.meta.page} dari {result.meta.totalPages}
            </div>
          </>
        }
      />

      {rows.length ? (
        <>
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
                      const paymentStatusValue = String(row.paymentStatus ?? "unpaid");
                      const status = String(row.status ?? "active");
                      const canReturn = status === "active" && paymentStatusValue === "unpaid";

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
          <MasterPagination
            basePath={`/store/${entity}`}
            page={result.meta.page}
            query={query}
            totalPages={result.meta.totalPages}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada transaksi toko"
          description="Transaksi toko akan otomatis menghasilkan stock movement dan hutang atau piutang sesuai jenis transaksi."
        />
      )}
    </div>
  );
}
