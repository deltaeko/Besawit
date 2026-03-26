import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export function WeighSlipDocument({
  purchase,
  printedAt,
  mode = "preview",
}: {
  purchase: Record<string, unknown>;
  printedAt: Date;
  mode?: "preview" | "print";
}) {
  const wrapperClass =
    mode === "print"
      ? "space-y-6"
      : "space-y-6 rounded-3xl border border-border/80 bg-card/85 p-5 md:p-6";

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

      <div className="grid gap-4 md:grid-cols-3">
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

      <div className="rounded-2xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
        Slip timbang ini dipakai sebagai bukti timbang awal sebelum tindak lanjut pembayaran hutang petani.
      </div>
    </div>
  );
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
