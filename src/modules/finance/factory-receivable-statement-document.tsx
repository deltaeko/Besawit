import type { ReactNode } from "react";

import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    unpaid: "Belum Diterima",
    partial: "Sebagian",
    paid: "Lunas",
    overdue: "Jatuh Tempo",
    cancelled: "Dibatalkan",
  };

  return labels[status] ?? status;
}

export function FactoryReceivableStatementDocument({
  factory,
  statement,
  printedAt,
  mode = "preview",
}: {
  factory: Record<string, unknown>;
  statement: {
    receivables: Array<{
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
      receivableCode: string | null;
      saleCode: string | null;
      amount: string | number;
      ledgerCategory: string | null;
    }>;
    summary: {
      transactionCount: number;
      paymentCount: number;
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

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-6 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">
            Besawit
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Statement Piutang Pabrik
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ringkasan penjualan TBS ke pabrik, histori penerimaan, dan saldo piutang akhir.
          </p>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>Tanggal Cetak: {formatDateTime(printedAt)}</div>
          <div>Kode Pabrik: {String(factory.code ?? "-")}</div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label="Nama Pabrik" value={String(factory.name ?? "-")} emphasis />
        <InfoBlock label="No. HP" value={String(factory.phone ?? "-")} />
        <InfoBlock label="Kota" value={String(factory.city ?? "-")} />
        <InfoBlock label="Alamat" value={String(factory.address ?? "-")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Transaksi" value={String(statement.summary.transactionCount)} />
        <SummaryCard label="Total Piutang" value={formatCurrency(statement.summary.totalAmount)} />
        <SummaryCard label="Total Diterima" value={formatCurrency(statement.summary.totalPaid)} />
        <SummaryCard
          emphasis
          label="Sisa Piutang"
          value={formatCurrency(statement.summary.totalOutstanding)}
        />
      </div>

      <DocumentSection
        description="Gunakan tabel ini untuk verifikasi piutang per transaksi penjualan TBS."
        title="Rincian Piutang Per Transaksi"
      >
        <DocumentTable
          columns={["Kode Penjualan", "Tanggal", "Total Piutang", "Sudah Diterima", "Sisa Piutang", "Status"]}
          rows={statement.receivables.map((item) => [
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
        description="Semua penerimaan parsial dan pelunasan yang tercatat untuk pabrik ini."
        title="Histori Penerimaan"
      >
        <DocumentTable
          columns={["Kode Payment", "Tanggal", "Kode Piutang", "Kode Penjualan", "Nominal", "Kas/Bank"]}
          rows={statement.payments.map((item) => [
            item.code,
            formatDateTime(item.paymentDate),
            item.receivableCode ?? "-",
            item.saleCode ?? "-",
            formatCurrency(item.amount),
            item.ledgerCategory ?? "-",
          ])}
        />
      </DocumentSection>

      <div className="rounded-2xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
        Saldo akhir statement ini harus sama dengan total outstanding piutang pabrik pada modul keuangan.
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
