import { connection } from "next/server";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  PackageSearch,
  Wallet,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { DashboardDateFilter } from "@/modules/dashboard/dashboard-date-filter";
import { FinanceInventoryWidget } from "@/modules/dashboard/finance-inventory-widget";
import { TbsPurchaseDailyWidget } from "@/modules/dashboard/tbs-purchase-daily-widget";
import { TbsSaleDailyWidget } from "@/modules/dashboard/tbs-sale-daily-widget";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import {
  getDashboardSummary,
  getFinanceInventorySummary,
  getTbsPurchaseDailySummary,
  getTbsSaleDailySummary,
} from "@/services/dashboard-service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  const filters = await searchParams;
  const selectedDate = typeof filters.date === "string" ? filters.date : undefined;

  const [purchaseDailySummary, saleDailySummary, financeInventorySummary, snapshot] =
    await Promise.all([
      getTbsPurchaseDailySummary(selectedDate),
      getTbsSaleDailySummary(selectedDate),
      getFinanceInventorySummary(),
      getDashboardSummary(selectedDate).catch(() => ({
        stockTakeVariance: 0,
        recentTransactions: [],
      })),
    ]);

  const quickKpis = [
    {
      label: "Pembelian TBS Hari Ini",
      value: purchaseDailySummary.metrics.totalPurchase,
      currency: true,
    },
    {
      label: "Penjualan Pabrik Hari Ini",
      value: saleDailySummary.metrics.totalSales,
      currency: true,
    },
    {
      label: "Margin Hari Ini",
      value: saleDailySummary.metrics.margin,
      currency: true,
    },
    {
      label: "Piutang Aktif",
      value: financeInventorySummary.metrics.activeReceivables,
      currency: true,
    },
    {
      label: "Hutang Aktif",
      value: financeInventorySummary.metrics.activePayables,
      currency: true,
    },
    {
      label: "Stok Kritis",
      value: financeInventorySummary.metrics.criticalStockCount,
      currency: false,
    },
  ];

  const dueItems = [
    ...financeInventorySummary.nearestReceivables.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.partyLabel,
      dueDate: item.dueDate,
      amount: item.outstandingAmount,
      href: `/finance/receivables/${item.id}`,
      type: "Piutang",
    })),
    ...financeInventorySummary.nearestSupplierPayables.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.supplierName,
      dueDate: item.dueDate,
      amount: item.outstandingAmount,
      href: `/finance/payables/${item.id}`,
      type: "Hutang",
    })),
  ]
    .sort((left, right) => {
      const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Ringkasan Operasional"
        description="Pantau pembelian TBS, penjualan pabrik, keuangan, dan stok dari satu tampilan kerja yang ringkas."
      />

      <FilterBar
        left={
          <>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Tanggal Operasional
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {purchaseDailySummary.selectedDateLabel}
              </div>
            </div>
            <div className="hidden h-8 w-px bg-border md:block" />
            <div className="text-sm text-muted-foreground">
              Dibandingkan dengan {purchaseDailySummary.previousDateLabel.toLowerCase()}.
            </div>
          </>
        }
        right={<DashboardDateFilter selectedDate={purchaseDailySummary.selectedDate} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {quickKpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            currency={kpi.currency}
            label={kpi.label}
            value={Number(kpi.value)}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Transaksi Terbaru</CardTitle>
                <CardDescription className="mt-1">
                  Ringkasan transaksi terakhir untuk pengecekan cepat owner dan admin.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/reports/transactions">
                  Buka Laporan
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {snapshot.recentTransactions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.recentTransactions.map((row, index) => {
                    const record = row as Record<string, unknown>;
                    const code = String(record.code ?? "-");
                    const status = String(record.paymentStatus ?? "-");
                    const value = Number(
                      record.totalSales ?? record.totalAmount ?? record.totalPurchase ?? 0,
                    );
                    const date =
                      record.saleDate ?? record.transactionDate ?? record.purchaseDate ?? null;

                    return (
                      <TableRow key={`${code}-${index}`}>
                        <TableCell className="font-medium">{code}</TableCell>
                        <TableCell>{formatDate(String(date ?? ""))}</TableCell>
                        <TableCell>
                          <Badge variant={resolvePalmStatusBadgeVariant(status)}>
                            {formatPalmStatusLabel(status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(value)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="Belum ada transaksi"
                  description="Jalankan seed dan mulai input transaksi untuk menampilkan ringkasan dashboard."
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                <CardTitle>Jatuh Tempo Terdekat</CardTitle>
              </div>
              <CardDescription>
                Dokumen hutang dan piutang yang paling dekat jatuh tempo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dueItems.length ? (
                dueItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="block rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors hover:bg-muted/35"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                          {item.type}
                        </div>
                        <div className="mt-1 font-semibold text-foreground">{item.code}</div>
                        <div className="mt-1 truncate text-sm text-muted-foreground">
                          {item.label}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(item.amount)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDate(item.dueDate)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-4 text-sm text-muted-foreground">
                  Tidak ada dokumen jatuh tempo terdekat untuk dipantau saat ini.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center gap-2">
                <PackageSearch className="size-4 text-primary" />
                <CardTitle>Peringatan Operasional</CardTitle>
              </div>
              <CardDescription>
                Fokus cepat untuk tindak lanjut stok dan kontrol transaksi.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 size-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Stok kritis aktif</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {formatNumber(financeInventorySummary.metrics.criticalStockCount, 0)} item
                      perlu dicek. Gunakan modul stok untuk melihat detail item yang mendekati atau
                      melewati batas minimum.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Kontrol keuangan</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Posisi piutang {formatCurrency(financeInventorySummary.metrics.activeReceivables)} dan
                      hutang {formatCurrency(financeInventorySummary.metrics.activePayables)} sudah
                      sinkron dengan ledger aktif.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline">
                  <Link href="/inventory/stock">Cek Stok</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/finance/payables">Cek Hutang</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/finance/receivables">Cek Piutang</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Widget Operasional Harian</h2>
          <p className="text-sm text-muted-foreground">
            Detail pembelian TBS, penjualan ke pabrik, keuangan, dan stok untuk audit operasional.
          </p>
        </div>
        <div className="space-y-6">
          <TbsPurchaseDailyWidget summary={purchaseDailySummary} />
          <TbsSaleDailyWidget summary={saleDailySummary} />
          <FinanceInventoryWidget summary={financeInventorySummary} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">KPI Tambahan</h2>
          <p className="text-sm text-muted-foreground">
            Metrik tambahan yang belum tercakup pada widget harian utama.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            currency
            label="Selisih Stok Opname"
            value={Number(snapshot.stockTakeVariance)}
          />
        </div>
      </section>
    </div>
  );
}
