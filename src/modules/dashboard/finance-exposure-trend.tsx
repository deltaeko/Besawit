import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { getFinanceExposureTrendSummary } from "@/services/dashboard-service";

type FinanceExposureTrendSummary = Awaited<
  ReturnType<typeof getFinanceExposureTrendSummary>
>;

export function FinanceExposureTrend({
  summary,
}: {
  summary: FinanceExposureTrendSummary;
}) {
  const chartWidth = 720;
  const chartHeight = 220;
  const paddingX = 28;
  const topPadding = 18;
  const bottomPadding = 36;
  const plotHeight = chartHeight - topPadding - bottomPadding;
  const plotWidth = chartWidth - paddingX * 2;
  const groupWidth = plotWidth / Math.max(summary.series.length, 1);
  const barWidth = Math.min(16, Math.max(groupWidth * 0.22, 10));
  const maxValue = summary.summary.maxValue || 1;

  return (
    <Card className="border-border/70 bg-background/45 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-base">Tren Piutang vs Hutang 7 Hari</CardTitle>
            <CardDescription className="mt-1">
              Membaca ritme penambahan eksposur keuangan aktif dari dokumen piutang dan
              hutang yang tercatat dalam 7 hari terakhir.
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            {summary.periodStartLabel} - {summary.periodEndLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 pt-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.75fr)]">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="h-3 w-3 rounded-full bg-[#315d3f]" />
              Piutang
            </div>
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="h-3 w-3 rounded-full bg-[#c66d2e]" />
              Hutang
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <svg
              aria-label="Grafik tren piutang dan hutang 7 hari"
              className="h-auto w-full min-w-[640px]"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              {[1, 0.75, 0.5, 0.25].map((tick) => {
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
                      {new Intl.NumberFormat("id-ID", {
                        notation: "compact",
                        compactDisplay: "short",
                        maximumFractionDigits: 1,
                      }).format(maxValue * tick)}
                    </text>
                  </g>
                );
              })}

              {summary.series.map((item, index) => {
                const groupX = paddingX + groupWidth * index;
                const centerX = groupX + groupWidth / 2;
                const receivableHeight = (item.receivableValue / maxValue) * plotHeight;
                const payableHeight = (item.payableValue / maxValue) * plotHeight;
                const receivableX = centerX - barWidth - 4;
                const payableX = centerX + 4;

                return (
                  <g key={item.date}>
                    <rect
                      fill="#315d3f"
                      height={receivableHeight}
                      rx="8"
                      width={barWidth}
                      x={receivableX}
                      y={topPadding + plotHeight - receivableHeight}
                    />
                    <rect
                      fill="#c66d2e"
                      height={payableHeight}
                      rx="8"
                      width={barWidth}
                      x={payableX}
                      y={topPadding + plotHeight - payableHeight}
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

        <div className="grid gap-3">
          <div className="rounded-2xl border border-border/70 bg-white/75 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Piutang Tercatat
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {formatCurrency(summary.summary.totalReceivableValue)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {formatNumber(summary.summary.totalReceivableCount, 0)} dokumen dalam 7 hari.
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-white/75 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Hutang Tercatat
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {formatCurrency(summary.summary.totalPayableValue)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {formatNumber(summary.summary.totalPayableCount, 0)} dokumen dalam 7 hari.
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-white/75 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Posisi Bersih
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {formatCurrency(
                summary.summary.totalReceivableValue - summary.summary.totalPayableValue,
              )}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Selisih eksposur aktif piutang terhadap hutang dari periode yang sama.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
