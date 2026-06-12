import type { ReactNode } from "react";

import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export function StorePurchaseInvoiceDocument({
  invoice,
  printedAt,
  mode = "preview",
}: {
  invoice: {
    purchase: Record<string, unknown>;
    items: Array<{
      id: string;
      productCode: string | null;
      productName: string | null;
      productUnit: string | null;
      quantity: string | number;
      unitCost: string | number;
      lineTotal: string | number;
    }>;
  };
  printedAt: Date;
  mode?: "preview" | "print";
}) {
  const wrapperClass =
    mode === "print"
      ? "document-sheet document-sheet-print space-y-6"
      : "document-sheet document-sheet-preview space-y-6";
  const purchase = invoice.purchase;

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-6 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">
            Besawit
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Slip Pembelian Barang</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Dokumen pembelian barang toko untuk supplier, referensi gudang, dan arsip transaksi.
          </p>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>Tanggal Cetak: {formatDate(printedAt)}</div>
          <div>Nomor Dokumen: {String(purchase.code ?? "-")}</div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label="Tanggal" value={formatDate(purchase.transactionDate as Date | string | null)} emphasis />
        <InfoBlock label="Supplier" value={String(purchase.supplierName ?? "-")} />
        <InfoBlock label="Gudang" value={String(purchase.warehouseName ?? "-")} />
        <InfoBlock label="Status Pembayaran" value={String(purchase.paymentStatus === "paid" ? "Lunas" : purchase.paymentStatus === "partial" ? "Parsial" : "Belum Dibayar")} />
      </div>

      <div className="document-avoid-break overflow-x-auto rounded-2xl border border-border/80">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-muted/30">
            <tr>
              {["Produk", "Qty", "Satuan", "Harga Beli", "Subtotal"].map((column) => (
                <th className="border-b border-border/80 px-4 py-3 text-left font-semibold" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.length ? (
              invoice.items.map((item) => (
                <tr className="border-b border-border/70 last:border-b-0" key={item.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold">{item.productName ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{item.productCode ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 align-top">{formatNumber(item.quantity)}</td>
                  <td className="px-4 py-3 align-top">{item.productUnit ?? "-"}</td>
                  <td className="px-4 py-3 align-top">{formatCurrency(item.unitCost)}</td>
                  <td className="px-4 py-3 align-top font-semibold">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Tidak ada item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="document-avoid-break grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Subtotal" value={formatCurrency(purchase.subtotal as string | number)} />
        <SummaryCard label="Diskon" value={formatCurrency(purchase.discount as string | number)} />
        <SummaryCard label="Pajak" value={formatCurrency(purchase.tax as string | number)} />
        <SummaryCard emphasis label="Total Pembelian" value={formatCurrency(purchase.totalAmount as string | number)} />
      </div>

      <DocumentSection title="Catatan">
        <div className="document-avoid-break rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          {String(purchase.notes ?? "").trim() || "Tidak ada catatan."}
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
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
