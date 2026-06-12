import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

type PalmSaleDocumentRecord = {
  id?: string;
  code?: string;
  saleDate?: Date | string | null;
  factoryName?: string | null;
  warehouseName?: string | null;
  paymentStatus?: string | null;
  status?: string | null;
  grossWeight?: string | number | null;
  tareWeight?: string | number | null;
  netWeightInitial?: string | number | null;
  totalDeduction?: string | number | null;
  returnWeight?: string | number | null;
  netWeightFinal?: string | number | null;
  sellingPricePerKg?: string | number | null;
  grossSalesAmount?: string | number | null;
  totalDeductionAmount?: string | number | null;
  totalSales?: string | number | null;
  margin?: string | number | null;
  notes?: string | null;
  deductions?: Array<{
    id?: string;
    configCode?: string | null;
    configName?: string | null;
    label?: string | null;
    inputMode?: string | null;
    inputValue?: string | number | null;
    percentageValue?: string | number | null;
    weight?: string | number | null;
    deductionAmount?: string | number | null;
    notes?: string | null;
  }>;
  returns?: Array<{
    id?: string;
    returnWeight?: string | number | null;
    returnReason?: string | null;
    actionType?: string | null;
    notes?: string | null;
  }>;
};

function paymentStatusLabel(status?: string | null) {
  switch (status) {
    case "paid":
      return "Lunas";
    case "partial":
      return "Sebagian";
    case "overdue":
      return "Jatuh Tempo";
    case "unpaid":
    default:
      return "Belum Dibayar";
  }
}

function transactionStatusLabel(status?: string | null) {
  switch (status) {
    case "void":
      return "Void";
    case "cancelled":
      return "Dibatalkan";
    case "active":
    default:
      return "Aktif";
  }
}

function deductionModeLabel(mode?: string | null) {
  switch (mode) {
    case "percentage":
      return "Persen";
    case "kg":
      return "Kg";
    case "amount":
      return "Nominal";
    default:
      return "-";
  }
}

function returnActionLabel(action?: string | null) {
  switch (action) {
    case "carry_forward":
      return "Dibawa ke periode berikutnya";
    case "deduct_payment":
      return "Kurangi pembayaran";
    case "manual_followup":
      return "Tindak lanjut manual";
    default:
      return "-";
  }
}

export function PalmSaleDocument({
  sale,
  printedAt,
  mode = "preview",
}: {
  sale: PalmSaleDocumentRecord;
  printedAt: Date;
  mode?: "preview" | "print";
}) {
  const wrapperClass =
    mode === "print"
      ? "document-sheet document-sheet-print space-y-6"
      : "document-sheet document-sheet-preview space-y-6";
  const deductions = Array.isArray(sale.deductions) ? sale.deductions : [];
  const returns = Array.isArray(sale.returns) ? sale.returns : [];

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-6 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">
            Besawit
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Dokumen Penjualan TBS ke Pabrik
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ringkasan penjualan TBS dari pool gudang ke pabrik untuk verifikasi tonase,
            potongan, dan nilai transaksi.
          </p>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>Tanggal Cetak: {formatDate(printedAt)}</div>
          <div>Kode Penjualan: {String(sale.code ?? "-")}</div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label="Tanggal" value={formatDate(sale.saleDate ?? null)} emphasis />
        <InfoBlock label="Pabrik" value={String(sale.factoryName ?? "-")} />
        <InfoBlock label="Gudang Asal" value={String(sale.warehouseName ?? "-")} />
        <InfoBlock label="Status Pembayaran" value={paymentStatusLabel(sale.paymentStatus)} />
      </div>

      <div className="document-avoid-break grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Berat Bersih Final"
          value={`${formatNumber(sale.netWeightFinal ?? 0)} kg`}
          emphasis
        />
        <MetricCard
          label="Harga Jual / Kg"
          value={formatCurrency(sale.sellingPricePerKg ?? 0)}
        />
        <MetricCard label="Total Penjualan" value={formatCurrency(sale.totalSales ?? 0)} />
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label="Berat Kotor" value={`${formatNumber(sale.grossWeight ?? 0)} kg`} />
        <InfoBlock label="Berat Tara" value={`${formatNumber(sale.tareWeight ?? 0)} kg`} />
        <InfoBlock
          label="Berat Bersih Awal"
          value={`${formatNumber(sale.netWeightInitial ?? 0)} kg`}
        />
        <InfoBlock
          label="Potongan Total"
          value={`${formatNumber(sale.totalDeduction ?? 0)} kg`}
        />
        <InfoBlock label="Return" value={`${formatNumber(sale.returnWeight ?? 0)} kg`} />
        <InfoBlock label="Nilai Bruto" value={formatCurrency(sale.grossSalesAmount ?? 0)} />
        <InfoBlock
          label="Potongan Nominal"
          value={formatCurrency(sale.totalDeductionAmount ?? 0)}
        />
        <InfoBlock label="Margin" value={formatCurrency(sale.margin ?? 0)} />
      </div>

      <DocumentSection title="Status Dokumen">
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryStrip
            label="Status Transaksi"
            value={transactionStatusLabel(sale.status)}
          />
          <SummaryStrip
            label="Status Pembayaran"
            value={paymentStatusLabel(sale.paymentStatus)}
          />
        </div>
      </DocumentSection>

      <DocumentSection title="Breakdown Potongan">
        <div className="document-avoid-break overflow-x-auto rounded-2xl border border-border/80">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Potongan", "Mode", "Input", "Berat", "Nominal", "Catatan"].map((column) => (
                  <th className="border-b border-border/80 px-4 py-3 text-left font-semibold" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deductions.length ? (
                deductions.map((item, index) => {
                  const inputValue =
                    item.inputMode === "percentage"
                      ? `${formatNumber(item.percentageValue ?? 0)}%`
                      : item.inputMode === "amount"
                        ? formatCurrency(item.inputValue ?? 0)
                        : `${formatNumber(item.inputValue ?? 0)} kg`;

                  return (
                    <tr
                      className="border-b border-border/70 last:border-b-0"
                      key={String(item.id ?? item.configCode ?? item.label ?? `deduction-${index}`)}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold">{String(item.configName ?? item.label ?? "-")}</div>
                        <div className="text-xs text-muted-foreground">{String(item.configCode ?? "-")}</div>
                      </td>
                      <td className="px-4 py-3 align-top">{deductionModeLabel(item.inputMode)}</td>
                      <td className="px-4 py-3 align-top">{inputValue}</td>
                      <td className="px-4 py-3 align-top">{formatNumber(item.weight ?? 0)} kg</td>
                      <td className="px-4 py-3 align-top font-semibold">
                        {formatCurrency(item.deductionAmount ?? 0)}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {String(item.notes ?? "-")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                    Tidak ada data potongan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DocumentSection>

      <DocumentSection title="Data Return">
        <div className="document-avoid-break overflow-x-auto rounded-2xl border border-border/80">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Berat Return", "Alasan", "Tindak Lanjut", "Catatan"].map((column) => (
                  <th className="border-b border-border/80 px-4 py-3 text-left font-semibold" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.length ? (
                returns.map((item, index) => (
                  <tr
                    className="border-b border-border/70 last:border-b-0"
                    key={String(item.id ?? item.returnReason ?? `return-${index}`)}
                  >
                    <td className="px-4 py-3 align-top">{formatNumber(item.returnWeight ?? 0)} kg</td>
                    <td className="px-4 py-3 align-top">{String(item.returnReason ?? "-")}</td>
                    <td className="px-4 py-3 align-top">{returnActionLabel(item.actionType)}</td>
                    <td className="px-4 py-3 align-top text-muted-foreground">{String(item.notes ?? "-")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    Tidak ada data return.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DocumentSection>

      <DocumentSection title="Catatan">
        <div className="document-avoid-break rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          {String(sale.notes ?? "").trim() || "Tidak ada catatan."}
        </div>
      </DocumentSection>
    </div>
  );
}

function InfoBlock({
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
      <div className={emphasis ? "mt-2 text-lg font-semibold" : "mt-2 text-sm font-semibold"}>
        {value}
      </div>
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
      <div className={emphasis ? "mt-2 text-2xl font-semibold" : "mt-2 text-lg font-semibold"}>
        {value}
      </div>
    </div>
  );
}

function SummaryStrip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  );
}

function DocumentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
