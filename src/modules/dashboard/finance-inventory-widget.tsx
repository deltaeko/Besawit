import Link from "next/link";

import { KpiCard } from "@/components/shared/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { FinanceHealthOverview } from "@/modules/dashboard/finance-health-overview";
import { FinanceExposureTrend } from "@/modules/dashboard/finance-exposure-trend";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import type {
  getFinanceExposureTrendSummary,
  getFinanceInventorySummary,
} from "@/services/dashboard-service";

type FinanceInventorySummary = Awaited<ReturnType<typeof getFinanceInventorySummary>>;
type FinanceExposureTrendSummary = Awaited<ReturnType<typeof getFinanceExposureTrendSummary>>;

function formatStockQuantity(value: number) {
  return `${formatNumber(value, 2)} unit`;
}

function DueList({
  title,
  description,
  emptyMessage,
  items,
  basePath,
  partyKey,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  items: Array<{
    id: string;
    code: string;
    dueDate: Date | string | null;
    outstandingAmount: number;
    status: string;
    [key: string]: unknown;
  }>;
  basePath: string;
  partyKey: string;
}) {
  return (
    <Card className="border-border/70 bg-background/45 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/70 bg-card/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`${basePath}/${item.id}`}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {item.code}
                    </Link>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {String(item[partyKey] ?? "-")}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Jatuh tempo {formatDate(item.dueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(item.outstandingAmount)}</div>
                    <div className="mt-2 flex justify-end">
                      <Badge variant={resolvePalmStatusBadgeVariant(item.status)}>
                        {formatPalmStatusLabel(item.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FinanceInventoryWidget({
  exposureTrend,
  summary,
}: {
  exposureTrend: FinanceExposureTrendSummary;
  summary: FinanceInventorySummary;
}) {
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
                Posisi Bisnis Saat Ini
              </div>
              <CardTitle className="mt-2">Keuangan & Stok Dasar</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Lihat posisi piutang, hutang, stok toko, dan jatuh tempo terdekat tanpa perlu membuka banyak menu.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/finance/receivables">Buka Piutang</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/finance/payables">Buka Hutang</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/inventory/stock">Buka Stok</Link>
              </Button>
            </div>
          </div>
        </CardHeader>

      <CardContent className="space-y-6 p-4 md:p-6">
        <FinanceHealthOverview summary={summary} />
        <FinanceExposureTrend summary={exposureTrend} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Piutang Aktif"
              value={summary.metrics.activeReceivables}
              currency
            />
            <KpiCard
              label="Hutang Aktif"
              value={summary.metrics.activePayables}
              currency
            />
            <KpiCard
              label="Stok Toko Saat Ini"
              value={summary.metrics.currentStockQuantity}
            />
            <KpiCard
              label="Stok Kritis"
              value={summary.metrics.criticalStockCount}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <DueList
              title="Piutang Jatuh Tempo Terdekat"
              description={`Total aktif ${formatNumber(summary.metrics.activeReceivableCount, 0)} dokumen.`}
              emptyMessage="Belum ada piutang aktif dengan jatuh tempo."
              items={summary.nearestReceivables}
              basePath="/finance/receivables"
              partyKey="partyLabel"
            />
            <DueList
              title="Hutang Supplier Terdekat Jatuh Tempo"
              description={`Total aktif ${formatNumber(summary.metrics.activePayableCount, 0)} dokumen.`}
              emptyMessage="Belum ada hutang supplier aktif dengan jatuh tempo."
              items={summary.nearestSupplierPayables}
              basePath="/finance/payables"
              partyKey="supplierName"
            />
          </div>

          <Card className="border-border/70 bg-background/45 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Top Petani dengan Sisa Hutang</CardTitle>
              <CardDescription>
                Prioritas petani dengan outstanding terbesar untuk monitoring owner.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {summary.topFarmerPayables.length ? (
                <div className="space-y-3">
                  {summary.topFarmerPayables.map((row) => (
                    <div
                      key={row.farmerId}
                      className="rounded-2xl border border-border/70 bg-card/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/master/farmers/${row.farmerId}`}
                            className="font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            {row.farmerName}
                          </Link>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatNumber(row.documentCount, 0)} transaksi hutang aktif
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(row.outstandingAmount)}</div>
                          <div className="mt-2 text-xs text-muted-foreground">Sisa hutang</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
                  Belum ada hutang petani aktif.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 bg-background/45 shadow-none">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Dokumen Piutang Aktif
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  {formatNumber(summary.metrics.activeReceivableCount, 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-background/45 shadow-none">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Dokumen Hutang Aktif
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  {formatNumber(summary.metrics.activePayableCount, 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-background/45 shadow-none">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Produk Aktif Di Stok
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  {formatNumber(summary.metrics.activeStockProductCount, 0)}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Total kuantitas {formatStockQuantity(summary.metrics.currentStockQuantity)}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
