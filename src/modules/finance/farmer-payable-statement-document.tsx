import type { ReactNode } from "react";

import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    unpaid: "Belum Dibayar",
    partial: "Sebagian",
    paid: "Lunas",
    overdue: "Jatuh Tempo",
    cancelled: "Dibatalkan",
  };

  return labels[status] ?? status;
}

export function FarmerPayableStatementDocument({
  farmer,
  statement,
  printedAt,
  mode = "preview",
}: {
  farmer: Record<string, unknown>;
  statement: {
    payables: Array<{
      code: string;
      sourceCode: string | null;
      sourceDate: Date | string | null;
      createdAt: Date | string;
      amount: string | number;
      paidAmount: string | number;
      outstandingAmount: string | number;
      status: string;
    }>;
    payments: Array<{
      id: string;
      code: string;
      paymentDate: Date | string;
      payableCode: string | null;
      purchaseCode: string | null;
      amount: string | number;
      ledgerCategory: string | null;
      notes?: string | null;
    }>;
    storeOffsets: Array<{
      id: string;
      purchaseCode: string | null;
      purchaseDate: Date | string | null;
      receivableCode: string | null;
      customerName: string | null;
      sourceCode: string | null;
      itemAppliedAmount: string | number | null;
      inputMode: string;
      inputPercentage?: string | number | null;
      createdAt: Date | string;
    }>;
    summary: {
      transactionCount: number;
      paymentCount: number;
      storeOffsetCount: number;
      totalStoreOffset: string | number;
      totalAmount: string | number;
      totalPaid: string | number;
      totalOutstanding: string | number;
    };
  };
  printedAt: Date;
  mode?: "preview" | "print";
}) {
  const wrapperClass =
    mode === "print"
      ? "space-y-6"
      : "space-y-6 rounded-3xl border border-border/80 bg-card/85 p-5 md:p-6";
  const blockClass =
    mode === "print"
      ? "grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4"
      : "grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-6 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">
            Besawit
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Statement Sisa Hutang Petani
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ringkasan transaksi pembelian TBS, histori pembayaran, dan saldo hutang akhir per petani.
          </p>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>Tanggal Cetak: {formatDateTime(printedAt)}</div>
          <div>Kode Petani: {String(farmer.code ?? "-")}</div>
        </div>
      </div>

      <div className={blockClass}>
        <InfoBlock label="Nama Petani" value={String(farmer.name ?? "-")} emphasis />
        <InfoBlock label="No. HP" value={String(farmer.phone ?? "-")} />
        <InfoBlock
          label="Desa / Kota"
          value={[farmer.village, farmer.districtOrCity].filter(Boolean).join(", ") || "-"}
        />
        <InfoBlock label="Alamat" value={String(farmer.address ?? "-")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total Transaksi" value={String(statement.summary.transactionCount)} />
        <SummaryCard label="Total Hutang" value={formatCurrency(statement.summary.totalAmount)} />
        <SummaryCard label="Total Dibayar" value={formatCurrency(statement.summary.totalPaid)} />
        <SummaryCard
          label="Potong Hutang Toko"
          value={formatCurrency(statement.summary.totalStoreOffset)}
        />
        <SummaryCard
          emphasis
          label="Sisa Hutang"
          value={formatCurrency(statement.summary.totalOutstanding)}
        />
      </div>

      <DocumentSection
        description="Gunakan tabel ini untuk verifikasi hutang per transaksi pembelian TBS."
        title="Rincian Hutang Per Transaksi"
      >
        <DocumentTable
          columns={["Kode Pembelian", "Tanggal", "Total Hutang", "Sudah Dibayar", "Sisa Hutang", "Status"]}
          rows={statement.payables.map((item) => [
            item.sourceCode ?? item.code,
            formatDate(item.sourceDate ?? item.createdAt),
            formatCurrency(item.amount),
            formatCurrency(item.paidAmount),
            formatCurrency(item.outstandingAmount),
            getPaymentStatusLabel(item.status),
          ])}
        />
      </DocumentSection>

      <DocumentSection
        description="Potongan hasil panen yang dipakai untuk menutup piutang toko petani."
        title="Histori Potong Hutang Toko"
      >
        <DocumentTable
          columns={["Kode Pembelian", "Tanggal", "Kode Piutang", "Pelanggan Toko", "Referensi Toko", "Nilai Potong"]}
          rows={statement.storeOffsets.map((item) => [
            item.purchaseCode ?? "-",
            formatDate(item.purchaseDate ?? item.createdAt),
            item.receivableCode ?? "-",
            item.customerName ?? "-",
            item.sourceCode ?? "-",
            formatCurrency(item.itemAppliedAmount ?? 0),
          ])}
        />
      </DocumentSection>

      <DocumentSection
        description="Semua pembayaran parsial dan pelunasan yang tercatat untuk petani ini."
        title="Histori Pembayaran"
      >
        <DocumentTable
          columns={["Kode Payment", "Tanggal", "Kode Hutang", "Kode Pembelian", "Nominal", "Kas/Bank"]}
          rows={statement.payments.map((item) => [
            item.code,
            formatDateTime(item.paymentDate),
            item.payableCode ?? "-",
            item.purchaseCode ?? "-",
            formatCurrency(item.amount),
            item.ledgerCategory ?? "-",
          ])}
        />
      </DocumentSection>

      <div className="rounded-2xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
        Saldo akhir statement ini harus sama dengan total outstanding hutang petani pada modul keuangan.
      </div>
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
      <div className={emphasis ? "mt-2 text-lg font-semibold" : "mt-2 text-sm font-semibold"}>{value}</div>
    </div>
  );
}

function SummaryCard({
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

function DocumentSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function DocumentTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-muted/30">
          <tr>
            {columns.map((column) => (
              <th className="border-b border-border/80 px-4 py-3 text-left font-semibold" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr className="border-b border-border/70 last:border-b-0" key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td className="px-4 py-3 align-top" key={`${rowIndex}-${cellIndex}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length}>
                Tidak ada data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
