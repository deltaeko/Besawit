import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";

function SummaryMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-3xl border border-amber-200 bg-amber-50/70 p-5"
          : "rounded-2xl border border-border/80 bg-card/80 p-4"
      }
    >
      <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </div>
      <div className={emphasis ? "mt-3 text-3xl font-semibold tracking-tight" : "mt-2 text-xl font-semibold tracking-tight"}>
        {value}
      </div>
    </div>
  );
}

export function PalmPurchaseFormSummary({
  transactionStatus,
  paymentStatus,
  netWeight,
  totalPurchase,
  deductionAmount,
  totalFinal,
  paidAmount,
  outstandingAmount,
  payableCode,
  hasPaymentConflict,
}: {
  transactionStatus: string;
  paymentStatus: string;
  netWeight: number;
  totalPurchase: number;
  deductionAmount: number;
  totalFinal: number;
  paidAmount: number;
  outstandingAmount: number;
  payableCode?: string | null;
  hasPaymentConflict: boolean;
}) {
  return (
    <Card className="sticky top-24 self-start">
      <CardHeader className="space-y-4 border-b border-border/70 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Ringkasan Perhitungan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Periksa angka timbangan, nilai pembelian, dan posisi hutang sebelum menyimpan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={resolvePalmStatusBadgeVariant(transactionStatus)}>
              {formatPalmStatusLabel(transactionStatus)}
            </Badge>
            <Badge variant={resolvePalmStatusBadgeVariant(paymentStatus)}>
              {formatPalmStatusLabel(paymentStatus)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-5">
        <SummaryMetric
          emphasis={outstandingAmount > 0}
          label="Sisa Hutang"
          value={formatCurrency(outstandingAmount)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryMetric
            label="Total Akhir"
            value={formatCurrency(totalFinal)}
          />
          <SummaryMetric
            label="Sudah Dibayar"
            value={formatCurrency(paidAmount)}
          />
          <SummaryMetric
            label="Berat Bersih"
            value={`${formatNumber(netWeight)} kg`}
          />
          <SummaryMetric
            label="Total Pembelian"
            value={formatCurrency(totalPurchase)}
          />
          <SummaryMetric
            label="Potong Hutang Toko"
            value={formatCurrency(deductionAmount)}
          />
        </div>
        <div className="rounded-2xl border border-border/80 bg-muted/25 p-4 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">
            {payableCode ? `Referensi hutang: ${payableCode}` : "Hutang dibuat otomatis setelah transaksi disimpan."}
          </div>
          <p className="mt-2 leading-6">
            Pembayaran dicatat sebagai langkah terpisah agar audit trail hutang tetap jelas dan dapat ditelusuri.
          </p>
        </div>
        {hasPaymentConflict ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive">
            Nilai yang sudah dibayar melebihi total akhir hasil edit. Sesuaikan nominal transaksi atau koreksi pembayaran lebih dulu.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
