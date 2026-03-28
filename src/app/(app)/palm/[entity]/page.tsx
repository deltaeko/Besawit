import Link from "next/link";
import { notFound } from "next/navigation";
import { Database, Factory, Scale, Wallet } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { isPalmEntity } from "@/modules/palm/helpers";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { getPalmPurchasePage, getPalmSalePage } from "@/services/palm-service";

export default async function PalmEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entity } = await params;
  const filters = await searchParams;
  if (!isPalmEntity(entity)) notFound();

  const isPurchase = entity === "purchases";
  const page = typeof filters.page === "string" ? Number(filters.page) : 1;
  const result = isPurchase
    ? await getPalmPurchasePage(page, 20).catch(() => ({
        items: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      }))
    : await getPalmSalePage(page, 20).catch(() => ({
        items: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      }));

  const rows = result.items.map((item) => {
    const row = item as Record<string, unknown>;

    return isPurchase
      ? {
          id: row.id,
          code: row.code,
          farmerName: row.farmerName,
          purchaseDate: formatDate(String(row.purchaseDate)),
          netWeight: `${formatNumber(String(row.netWeight))} kg`,
          totalPurchase: String(row.totalPurchase ?? 0),
          paymentStatus: String(row.paymentStatus ?? "unpaid"),
        }
      : {
          id: row.id,
          code: row.code,
          factoryName: row.factoryName || "-",
          saleDate: formatDate(String(row.saleDate)),
          netWeightFinal: `${formatNumber(String(row.netWeightFinal))} kg`,
          totalSales: String(row.totalSales ?? 0),
          margin: String(row.margin ?? 0),
          paymentStatus: String(row.paymentStatus ?? "unpaid"),
        };
  });

  const title = isPurchase ? "Pembelian TBS dari Petani" : "Penjualan TBS ke Pabrik";
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string") {
      query.set(key, value);
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaksi"
        title={title}
        description={
          isPurchase
            ? "Pantau transaksi pembelian TBS, timbangan, hutang petani, dan status pembayaran dalam satu daftar kerja."
            : "Pantau penjualan TBS ke pabrik, nilai settlement, dan margin secara ringkas serta siap audit."
        }
        action={
          <Button asChild>
            <Link href={`/palm/${entity}/new`}>Tambah Transaksi</Link>
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
                  {formatNumber(result.meta.total, 0)} transaksi
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                {isPurchase ? <Scale className="size-4" /> : <Factory className="size-4" />}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Fokus Data
                </div>
                <div className="mt-1 text-sm text-foreground">
                  {isPurchase ? "Petani, timbangan, dan hutang" : "Pabrik, netto final, dan margin"}
                </div>
              </div>
            </div>
          </>
        }
        right={
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <Wallet className="size-4" />
              Halaman {result.meta.page} dari {result.meta.totalPages}
            </div>
          </div>
        }
      />

      {rows.length ? (
        <>
          <SimpleTable
            cellRenderers={
              isPurchase
                ? {
                    totalPurchase: (value) => formatCurrency(Number(value ?? 0)),
                    paymentStatus: (value) => (
                      <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "unpaid"))}>
                        {formatPalmStatusLabel(String(value ?? "unpaid"))}
                      </Badge>
                    ),
                  }
                : {
                    totalSales: (value) => formatCurrency(Number(value ?? 0)),
                    margin: (value) => formatCurrency(Number(value ?? 0)),
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
                    farmerName: "Petani",
                    purchaseDate: "Tanggal",
                    netWeight: "Berat Bersih",
                    totalPurchase: "Total Pembelian",
                    paymentStatus: "Status Pembayaran",
                  }
                : {
                    code: "Kode",
                    factoryName: "Pabrik",
                    saleDate: "Tanggal",
                    netWeightFinal: "Berat Bersih Final",
                    totalSales: "Total Penjualan",
                    margin: "Margin",
                    paymentStatus: "Status Pembayaran",
                  }
            }
            getHref={(row) => `/palm/${entity}/${String(row.id)}`}
            linkColumn="code"
            numericColumns={isPurchase ? ["totalPurchase"] : ["totalSales", "margin"]}
            rows={rows}
          />
          <MasterPagination
            basePath={`/palm/${entity}`}
            page={result.meta.page}
            query={query}
            totalPages={result.meta.totalPages}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada transaksi"
          description="Mulai dari transaksi baru untuk membangun hutang, piutang, dan margin."
        />
      )}
    </div>
  );
}
