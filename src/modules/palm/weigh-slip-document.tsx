import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { WeighSlipPaymentSummary } from "@/modules/palm/weigh-slip-sharing";

export function WeighSlipDocument({
  purchase,
  paymentSummary,
  printedAt,
  mode = "preview",
}: {
  purchase: Record<string, unknown>;
  paymentSummary: WeighSlipPaymentSummary;
  printedAt: Date;
  mode?: "preview" | "print";
}) {
  const wrapperClass =
    mode === "print"
      ? "document-sheet document-sheet-print space-y-6"
      : "document-sheet document-sheet-preview space-y-6";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-6 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">
            Besawit
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Slip Timbang Petani</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ringkasan timbang pembelian TBS untuk verifikasi petani dan arsip lapangan.
          </p>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>Tanggal Cetak: {formatDate(printedAt)}</div>
          <div>Kode Pembelian: {String(purchase.code ?? "-")}</div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Tanggal" value={formatDate(purchase.purchaseDate as Date | string | null)} />
        <Field label="Petani" value={String(purchase.farmerName ?? "-")} emphasis />
        <Field label="Sopir" value={String(purchase.driverName ?? "-")} />
        <Field
          label="Kendaraan"
          value={[purchase.vehiclePlateNumber, purchase.vehicleType].filter(Boolean).join(" / ") || "-"}
        />
      </div>

      <div className="document-avoid-break grid gap-4 md:grid-cols-3">
        <MetricCard label="Berat Kotor" value={`${formatNumber(purchase.grossWeight as string | number)} kg`} />
        <MetricCard label="Berat Tara" value={`${formatNumber(purchase.tareWeight as string | number)} kg`} />
        <MetricCard
          emphasis
          label="Berat Bersih"
          value={`${formatNumber(purchase.netWeight as string | number)} kg`}
        />
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Gudang" value={String(purchase.warehouseName ?? "-")} />
        <Field label="Harga Beli / Kg" value={formatCurrency(purchase.buyingPricePerKg as string | number)} />
        <Field label="Biaya Operasional" value={formatCurrency(purchase.totalOperationalCost as string | number)} />
        <Field label="Total Pembelian" value={formatCurrency(purchase.totalPurchase as string | number)} emphasis />
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Kode Hutang" value={paymentSummary.payableCode ?? "-"} />
        <Field label="Status Pembayaran" value={formatPaymentStatus(paymentSummary.paymentStatus)} />
        <Field
          label="Tanggal Pembayaran"
          value={paymentSummary.latestPaymentDate ? formatDate(paymentSummary.latestPaymentDate) : "Belum ada pembayaran"}
        />
        <Field label="Metode Pembayaran" value={formatPaymentMethod(paymentSummary.latestPaymentMethod)} />
        <Field label="Sudah Dibayar" value={formatCurrency(paymentSummary.paidAmount)} />
        <Field label="Sisa Hutang" value={formatCurrency(paymentSummary.outstandingAmount)} emphasis />
        <Field label="Total Akhir Hutang" value={formatCurrency(paymentSummary.totalAmount)} />
      </div>

      <div className="document-avoid-break rounded-2xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
        Slip timbang ini dipakai sebagai bukti timbang awal sebelum tindak lanjut pembayaran hutang petani.
      </div>
    </div>
  );
}

function formatPaymentStatus(status: string | null) {
  switch (status) {
    case "paid":
      return "Lunas";
    case "partial":
      return "Sebagian";
    case "cancelled":
      return "Dibatalkan";
    case "overdue":
      return "Jatuh Tempo";
    default:
      return "Belum Dibayar";
  }
}

function formatPaymentMethod(method: string | null) {
  switch (method) {
    case "cash":
      return "Tunai";
    case "bank_transfer":
      return "Transfer Bank";
    case "giro":
      return "Giro";
    case "other":
      return "Lainnya";
    default:
      return "Belum ada pembayaran";
  }
}

function Field({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={emphasis ? "mt-2 text-lg font-semibold" : "mt-2 text-sm font-semibold"}>{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={emphasis ? "rounded-2xl border bg-primary/10 p-4" : "rounded-2xl border bg-muted/30 p-4"}>
      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={emphasis ? "mt-2 text-2xl font-semibold" : "mt-2 text-lg font-semibold"}>{value}</div>
    </div>
  );
}
