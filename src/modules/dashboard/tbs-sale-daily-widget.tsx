import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  DashboardMetricCard,
  formatWeight,
} from "@/modules/dashboard/metric-card";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";
import type { getTbsSaleDailySummary } from "@/services/dashboard-service";

type TbsSaleDailySummary = Awaited<ReturnType<typeof getTbsSaleDailySummary>>;

export function TbsSaleDailyWidget({
  summary,
}: {
  summary: TbsSaleDailySummary;
}) {
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
                Ringkasan Harian Penjualan
              </div>
              <CardTitle className="mt-2">Penjualan TBS ke Pabrik</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Pantau volume netto jual, nilai penjualan, retur, dan potongan pabrik untuk{" "}
                {summary.selectedDateLabel.toLowerCase()}.
              </CardDescription>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/30 px-4 py-3 text-sm">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Pembanding
              </div>
              <div className="mt-1 font-medium">{summary.previousDateLabel}</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <DashboardMetricCard
              label="Total Transaksi"
              value={summary.metrics.transactionCount}
              previousValue={summary.previousMetrics.transactionCount}
              formatter={(value) => `${formatNumber(value, 0)} trx`}
            />
            <DashboardMetricCard
              label="Netto Jual"
              value={summary.metrics.netWeightFinal}
              previousValue={summary.previousMetrics.netWeightFinal}
              formatter={formatWeight}
            />
            <DashboardMetricCard
              label="Nilai Penjualan"
              value={summary.metrics.totalSales}
              previousValue={summary.previousMetrics.totalSales}
              formatter={(value) => formatCurrency(value)}
            />
            <DashboardMetricCard
              label="Retur Buah"
              value={summary.metrics.returnWeight}
              previousValue={summary.previousMetrics.returnWeight}
              formatter={formatWeight}
            />
            <DashboardMetricCard
              label="Potongan Pabrik"
              value={summary.metrics.totalDeduction}
              previousValue={summary.previousMetrics.totalDeduction}
              formatter={formatWeight}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <Card className="border-border/70 bg-background/45 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Transaksi Penjualan ke Pabrik</CardTitle>
                <CardDescription>
                  Digunakan untuk verifikasi cepat bahwa KPI penjualan sinkron dengan transaksi sale.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                {summary.sales.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Pabrik</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Netto Jual</TableHead>
                        <TableHead className="text-right">Potongan</TableHead>
                        <TableHead className="text-right">Retur</TableHead>
                        <TableHead className="text-right">Nilai</TableHead>
                        <TableHead>Status Bayar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.sales.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/palm/sales/${row.id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {row.code}
                            </Link>
                          </TableCell>
                          <TableCell>{row.factoryName}</TableCell>
                          <TableCell>{formatDate(row.saleDate)}</TableCell>
                          <TableCell className="text-right">{formatWeight(row.netWeightFinal)}</TableCell>
                          <TableCell className="text-right">{formatWeight(row.totalDeduction)}</TableCell>
                          <TableCell className="text-right">{formatWeight(row.returnWeight)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.totalSales)}</TableCell>
                          <TableCell>
                            <Badge variant={resolvePalmStatusBadgeVariant(row.paymentStatus)}>
                              {formatPalmStatusLabel(row.paymentStatus)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
                    Belum ada transaksi penjualan TBS ke pabrik pada tanggal terpilih.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/45 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Top 5 Pabrik Berdasarkan Nilai</CardTitle>
                <CardDescription>
                  Peringkat berdasarkan total nilai penjualan pada tanggal terpilih.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {summary.topFactories.length ? (
                  <div className="space-y-3">
                    {summary.topFactories.map((row, index) => (
                      <div
                        key={`${row.factoryId}-${index}`}
                        className="rounded-2xl border border-border/70 bg-card/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                              Peringkat {index + 1}
                            </div>
                            <div className="mt-1 truncate font-semibold">{row.factoryName}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {formatNumber(row.transactionCount, 0)} transaksi
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(row.totalSales)}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {formatWeight(row.netWeightFinal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
                    Belum ada transaksi penjualan yang bisa dirangking pada tanggal terpilih.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
