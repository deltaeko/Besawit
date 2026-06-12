import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0">
      <div className="max-w-[48%] text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={
          emphasis
            ? "max-w-[48%] text-right text-lg font-semibold tracking-tight text-foreground"
            : "max-w-[48%] text-right text-base font-medium text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

export function PalmSaleFormSummary({
  stockBalanceLabel,
  averageCostLabel,
  dueDateLabel,
  netInitialLabel,
  deductionWeightLabel,
  deductionNominalLabel,
  netFinalLabel,
  grossSalesLabel,
  totalSalesLabel,
  estimatedCostLabel,
  marginLabel,
  submitting,
}: {
  stockBalanceLabel: string;
  averageCostLabel: string;
  dueDateLabel: string;
  netInitialLabel: string;
  deductionWeightLabel: string;
  deductionNominalLabel: string;
  netFinalLabel: string;
  grossSalesLabel: string;
  totalSalesLabel: string;
  estimatedCostLabel: string;
  marginLabel: string;
  submitting: boolean;
}) {
  return (
    <Card className="sticky top-24 self-start overflow-hidden border-white/90 bg-card/96">
      <CardHeader className="space-y-2 border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(72,115,74,0.12),transparent_52%),linear-gradient(180deg,rgba(246,248,243,0.96),rgba(255,255,255,0.94))] pb-3">
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/80">
            Ringkasan Live
          </div>
          <CardTitle className="text-[1.35rem] tracking-tight">Ringkasan Penjualan</CardTitle>
          <p className="text-sm leading-5 text-muted-foreground">
            Periksa tonase, nilai penjualan, dan posisi piutang sebelum menyimpan.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={resolvePalmStatusBadgeVariant("draft")}>
              {formatPalmStatusLabel("draft")}
            </Badge>
            <Badge variant={resolvePalmStatusBadgeVariant("unpaid")}>
              {formatPalmStatusLabel("unpaid")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3.5 pt-3.5">
        <div className="rounded-[1.35rem] border border-border/80 bg-card/88 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          <SummaryRow label="Stok TBS Gudang" value={stockBalanceLabel} emphasis />
          <SummaryRow label="Rata-rata Biaya Pool" value={averageCostLabel} />
          <SummaryRow label="Jatuh Tempo Piutang" value={dueDateLabel} />
          <SummaryRow label="Berat Bersih Awal" value={netInitialLabel} />
          <SummaryRow label="Potongan Berat" value={deductionWeightLabel} />
          <SummaryRow label="Potongan Nominal" value={deductionNominalLabel} />
          <SummaryRow label="Berat Bersih Final" value={netFinalLabel} />
          <SummaryRow label="Nilai Bruto Penjualan" value={grossSalesLabel} />
          <SummaryRow label="Nilai Penjualan Akhir" value={totalSalesLabel} />
          <SummaryRow label="Estimasi Nilai Pokok" value={estimatedCostLabel} />
          <SummaryRow label="Margin" value={marginLabel} />
        </div>
        <Button className="w-full" disabled={submitting} type="submit">
          {submitting ? "Menyimpan..." : "Simpan Penjualan"}
        </Button>
      </CardContent>
    </Card>
  );
}
