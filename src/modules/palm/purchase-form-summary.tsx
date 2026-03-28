import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={
          emphasis
            ? "max-w-[56%] text-right text-lg font-semibold tracking-tight text-foreground"
            : "max-w-[56%] text-right text-base font-medium text-foreground"
        }
      >
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
    <Card className="sticky top-6 self-start">
      <CardHeader className="space-y-2 border-b border-border/70 pb-3">
        <div className="space-y-2">
          <CardTitle className="text-[1.35rem] tracking-tight">Ringkasan Perhitungan</CardTitle>
          <p className="text-sm leading-5 text-muted-foreground">
            Periksa angka timbangan, nilai pembelian, dan posisi hutang sebelum menyimpan.
          </p>
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
      <CardContent className="space-y-3 p-3.5 pt-3.5">
        <div className="rounded-2xl border border-border/80 bg-card/80 px-4 py-2">
          <SummaryRow
            emphasis
            label="Sisa Hutang"
            value={formatCurrency(outstandingAmount)}
          />
          <SummaryRow label="Total Akhir" value={formatCurrency(totalFinal)} />
          <SummaryRow label="Sudah Dibayar" value={formatCurrency(paidAmount)} />
          <SummaryRow label="Berat Bersih" value={`${formatNumber(netWeight)} kg`} />
          <SummaryRow label="Total Pembelian" value={formatCurrency(totalPurchase)} />
          <SummaryRow label="Potong Hutang Toko" value={formatCurrency(deductionAmount)} />
          <SummaryRow
            label="Referensi Hutang"
            value={payableCode ?? "Otomatis setelah disimpan"}
          />
          <SummaryRow
            label="Status Pembayaran"
            value={formatPalmStatusLabel(paymentStatus)}
          />
          <SummaryRow
            label="Catatan"
            value="Dicatat terpisah agar audit hutang tetap jelas"
          />
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
