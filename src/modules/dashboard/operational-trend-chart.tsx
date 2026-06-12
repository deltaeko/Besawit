import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { getDashboardTrendSummary } from "@/services/dashboard-service";

type DashboardTrendSummary = Awaited<ReturnType<typeof getDashboardTrendSummary>>;

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

export function OperationalTrendChart({
  summary,
}: {
  summary: DashboardTrendSummary;
}) {
  const chartWidth = 720;
  const chartHeight = 230;
  const paddingX = 28;
  const topPadding = 18;
  const bottomPadding = 36;
  const plotHeight = chartHeight - topPadding - bottomPadding;
  const plotWidth = chartWidth - paddingX * 2;
  const groupWidth = plotWidth / Math.max(summary.series.length, 1);
  const barWidth = Math.min(18, Math.max(groupWidth * 0.24, 10));
  const maxValue = summary.summary.maxValue || 1;
  const gridValues = [1, 0.75, 0.5, 0.25];
  const marginPositive = summary.summary.totalMargin >= 0;

  return (
    <Card className="overflow-hidden border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(246,250,246,0.98)_100%)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary/80">
              Executive Trend
            </div>
            <CardTitle className="mt-2 text-xl">Tren Operasional 7 Hari</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Bandingkan nilai pembelian TBS dan penjualan pabrik dalam 7 hari terakhir
              untuk membaca ritme operasional dan arah margin lebih cepat.
            </CardDescription>
          </div>

          <div className="rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm shadow-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Periode
            </div>
            <div className="mt-1 font-medium">
              {summary.periodStartLabel} - {summary.periodEndLabel}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
        <div className="rounded-[1.75rem] border border-border/70 bg-white/75 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="h-3 w-3 rounded-full bg-[#315d3f]" />
              Penjualan
            </div>
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="h-3 w-3 rounded-full bg-[#d8f26a]" />
              Pembelian
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <svg
              aria-label="Grafik tren operasional 7 hari"
              className="h-auto w-full min-w-[640px]"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              {gridValues.map((tick) => {
                const y = topPadding + plotHeight * (1 - tick);

                return (
                  <g key={tick}>
                    <line
                      stroke="rgba(58,79,63,0.12)"
                      strokeDasharray="4 6"
                      strokeWidth="1"
                      x1={paddingX}
                      x2={chartWidth - paddingX}
                      y1={y}
                      y2={y}
                    />
                    <text
                      fill="rgba(77,95,81,0.78)"
                      fontSize="11"
                      textAnchor="start"
                      x={paddingX}
                      y={y - 6}
                    >
                      {formatCompactCurrency(maxValue * tick)}
                    </text>
                  </g>
                );
              })}

              {summary.series.map((item, index) => {
                const groupX = paddingX + groupWidth * index;
                const centerX = groupX + groupWidth / 2;
                const purchaseHeight = (item.purchaseValue / maxValue) * plotHeight;
                const salesHeight = (item.salesValue / maxValue) * plotHeight;
                const purchaseX = centerX - barWidth - 4;
                const salesX = centerX + 4;
                const purchaseY = topPadding + plotHeight - purchaseHeight;
                const salesY = topPadding + plotHeight - salesHeight;

                return (
                  <g key={item.date}>
                    <rect
                      fill="#d8f26a"
                      height={purchaseHeight}
                      opacity="0.95"
                      rx="8"
                      width={barWidth}
                      x={purchaseX}
                      y={purchaseY}
                    />
                    <rect
                      fill="#315d3f"
                      height={salesHeight}
                      opacity="0.96"
                      rx="8"
                      width={barWidth}
                      x={salesX}
                      y={salesY}
                    />
                    <text
                      fill="rgba(21,36,25,0.9)"
                      fontSize="11"
                      textAnchor="middle"
                      x={centerX}
                      y={chartHeight - 10}
                    >
                      {item.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-border/70 bg-[#183216] p-5 text-white shadow-[0_22px_44px_-28px_rgba(24,50,22,0.55)]">
            <div className="text-xs uppercase tracking-[0.24em] text-[#d8f26a]">
              Total Penjualan 7 Hari
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">
              {formatCurrency(summary.summary.totalSales)}
            </div>
            <div className="mt-2 text-sm text-white/70">
              Dari {formatNumber(summary.series.reduce((sum, item) => sum + item.salesTransactionCount, 0), 0)} transaksi sale aktif.
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-white/80 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Total Pembelian 7 Hari
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {formatCurrency(summary.summary.totalPurchase)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Dari {formatNumber(summary.series.reduce((sum, item) => sum + item.purchaseTransactionCount, 0), 0)} transaksi beli TBS.
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-white/80 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Margin Tercatat 7 Hari
            </div>
            <div
              className={`mt-3 text-2xl font-semibold tracking-tight ${
                marginPositive ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {formatCurrency(summary.summary.totalMargin)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Total aktivitas tercatat {formatNumber(summary.summary.totalTransactions, 0)} transaksi gabungan.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
