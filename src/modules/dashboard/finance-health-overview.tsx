import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { getFinanceInventorySummary } from "@/services/dashboard-service";

type FinanceInventorySummary = Awaited<ReturnType<typeof getFinanceInventorySummary>>;

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function FinanceHealthOverview({
  summary,
}: {
  summary: FinanceInventorySummary;
}) {
  const receivableValue = summary.metrics.activeReceivables;
  const payableValue = summary.metrics.activePayables;
  const maxFinanceValue = Math.max(receivableValue, payableValue, 1);
  const receivableWidth = (receivableValue / maxFinanceValue) * 100;
  const payableWidth = (payableValue / maxFinanceValue) * 100;

  const healthyStockCount = Math.max(
    summary.metrics.activeStockProductCount - summary.metrics.criticalStockCount,
    0,
  );
  const stockHealthRatio =
    summary.metrics.activeStockProductCount > 0
      ? healthyStockCount / summary.metrics.activeStockProductCount
      : 1;
  const stockHealthPercent = clampPercentage(stockHealthRatio * 100);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-border/70 bg-background/45 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Eksposur Keuangan Aktif</CardTitle>
          <CardDescription>
            Perbandingan cepat antara nilai piutang yang masih berjalan dan kewajiban
            hutang yang perlu dikontrol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Piutang Aktif
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(receivableValue)}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formatNumber(summary.metrics.activeReceivableCount, 0)} dokumen
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e7eee6]">
              <div
                className="h-full rounded-full bg-[#315d3f]"
                style={{ width: `${receivableWidth}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Hutang Aktif
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(payableValue)}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formatNumber(summary.metrics.activePayableCount, 0)} dokumen
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#eee7e2]">
              <div
                className="h-full rounded-full bg-[#c66d2e]"
                style={{ width: `${payableWidth}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/45 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Kesehatan Stok Toko</CardTitle>
          <CardDescription>
            Gambaran singkat berapa banyak item aktif yang masih sehat dibandingkan stok
            yang sudah masuk zona kritis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Produk Aktif Di Stok
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatNumber(summary.metrics.activeStockProductCount, 0)}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Qty {formatNumber(summary.metrics.currentStockQuantity, 2)} unit
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#eef2e8]">
              <div
                className="h-full rounded-full bg-[#84b36b]"
                style={{ width: `${stockHealthPercent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Sehat {formatNumber(healthyStockCount, 0)} item</span>
              <span>Kritis {formatNumber(summary.metrics.criticalStockCount, 0)} item</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Rasio Stok Sehat
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {formatNumber(stockHealthPercent, 1)}%
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Fokus Prioritas
              </div>
              <div className="mt-2 text-sm font-medium leading-6 text-foreground">
                {summary.metrics.criticalStockCount > 0
                  ? "Produk kritis perlu direstok atau dicek minimum stock-nya."
                  : "Posisi stok aman, lanjut pantau pergerakan transaksi harian."}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
