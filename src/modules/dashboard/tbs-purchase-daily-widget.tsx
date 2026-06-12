import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  DashboardMetricCard,
  formatWeight,
} from "@/modules/dashboard/metric-card";
import { RankedBarList } from "@/modules/dashboard/ranked-bar-list";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";
import type { getTbsPurchaseDailySummary } from "@/services/dashboard-service";

type TbsPurchaseDailySummary = Awaited<ReturnType<typeof getTbsPurchaseDailySummary>>;

export function TbsPurchaseDailyWidget({
  summary,
}: {
  summary: TbsPurchaseDailySummary;
}) {
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
                Ringkasan Harian TBS
              </div>
              <CardTitle className="mt-2">Pembelian TBS Harian</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Pantau transaksi, tonase, nilai pembelian, dan potongan kualitas untuk{" "}
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <DashboardMetricCard
              label="Total Transaksi"
              value={summary.metrics.transactionCount}
              previousValue={summary.previousMetrics.transactionCount}
              formatter={(value) => `${formatNumber(value, 0)} trx`}
            />
            <DashboardMetricCard
              label="Berat Bruto"
              value={summary.metrics.grossWeight}
              previousValue={summary.previousMetrics.grossWeight}
              formatter={formatWeight}
            />
            <DashboardMetricCard
              label="Berat Tara"
              value={summary.metrics.tareWeight}
              previousValue={summary.previousMetrics.tareWeight}
              formatter={formatWeight}
            />
            <DashboardMetricCard
              label="Berat Netto"
              value={summary.metrics.netWeight}
              previousValue={summary.previousMetrics.netWeight}
              formatter={formatWeight}
            />
            <DashboardMetricCard
              label="Nilai Pembelian"
              value={summary.metrics.totalPurchase}
              previousValue={summary.previousMetrics.totalPurchase}
              formatter={(value) => formatCurrency(value)}
            />
            <DashboardMetricCard
              label="Potongan Kualitas"
              value={summary.metrics.totalDeduction}
              previousValue={summary.previousMetrics.totalDeduction}
              formatter={formatWeight}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <Card className="border-border/70 bg-background/45 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Transaksi Pembelian TBS</CardTitle>
                <CardDescription>
                  Angka di kartu KPI di atas harus sinkron dengan daftar transaksi pada tanggal terpilih.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                {summary.purchases.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Petani</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Bruto</TableHead>
                        <TableHead className="text-right">Tara</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Nilai</TableHead>
                        <TableHead>Status Bayar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.purchases.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/palm/purchases/${row.id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {row.code}
                            </Link>
                          </TableCell>
                          <TableCell>{row.farmerName}</TableCell>
                          <TableCell>{formatDate(row.purchaseDate)}</TableCell>
                          <TableCell className="text-right">{formatWeight(row.grossWeight)}</TableCell>
                          <TableCell className="text-right">{formatWeight(row.tareWeight)}</TableCell>
                          <TableCell className="text-right">{formatWeight(row.netWeight)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.totalPurchase)}</TableCell>
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
                    Belum ada transaksi pembelian TBS pada tanggal terpilih.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/45 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Top 5 Petani Volume Terbesar</CardTitle>
                <CardDescription>
                  Peringkat berdasarkan total berat netto pembelian pada tanggal terpilih.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <RankedBarList
                  emptyMessage="Belum ada volume pembelian yang bisa dirangking pada tanggal terpilih."
                  items={summary.topFarmers.map((row, index) => ({
                    id: `${row.farmerId}-${index}`,
                    label: row.farmerName,
                    secondary: `${formatNumber(row.transactionCount, 0)} transaksi`,
                    value: row.netWeight,
                    valueLabel: formatWeight(row.netWeight),
                    helper: formatCurrency(row.totalPurchase),
                  }))}
                  tone="green"
                />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
