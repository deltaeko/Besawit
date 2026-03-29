import type { ReactNode } from "react";

import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export function StorePurchaseReturnDocument({
  document,
  printedAt,
  mode = "preview",
}: {
  document: {
    storeReturn: Record<string, unknown>;
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
      ? "space-y-6"
      : "space-y-6 rounded-3xl border border-border/80 bg-card/85 p-5 md:p-6";
  const storeReturn = document.storeReturn;

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-6 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">Besawit</div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Dokumen Retur Pembelian
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Dokumen retur pembelian barang toko untuk supplier, referensi pembelian, dan arsip koreksi stok.
          </p>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>Tanggal Cetak: {formatDate(printedAt)}</div>
          <div>Nomor Retur: {String(storeReturn.code ?? "-")}</div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/70 py-6 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock
          label="Tanggal Retur"
          value={formatDate(storeReturn.returnDate as Date | string | null)}
          emphasis
        />
        <InfoBlock label="Supplier" value={String(storeReturn.supplierName ?? "-")} />
        <InfoBlock label="Gudang" value={String(storeReturn.warehouseName ?? "-")} />
        <InfoBlock label="Status" value={String(storeReturn.status === "void" ? "Void" : "Aktif")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Referensi Pembelian" value={String(storeReturn.purchaseCode ?? "-")} />
        <SummaryCard
          label="Tanggal Pembelian"
          value={formatDate(storeReturn.purchaseDate as Date | string | null)}
        />
        <SummaryCard label="No. Invoice Supplier" value={String(storeReturn.purchaseInvoiceNumber ?? "-")} />
        <SummaryCard
          emphasis
          label="Total Retur"
          value={formatCurrency(storeReturn.totalReturnAmount as string | number)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/80">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-muted/30">
            <tr>
              {["Produk", "Qty Retur", "Satuan", "Harga Beli", "Subtotal Retur"].map((column) => (
                <th className="border-b border-border/80 px-4 py-3 text-left font-semibold" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {document.items.length ? (
              document.items.map((item) => (
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
                  Tidak ada item retur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DocumentSection title="Catatan Retur">
        <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          {String(storeReturn.notes ?? "").trim() || "Tidak ada catatan retur."}
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
