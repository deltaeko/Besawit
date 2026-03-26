import { notFound } from "next/navigation";

import { PrintDocumentActions } from "@/components/shared/print-document-actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getPaymentReceiptDetail } from "@/services/finance-service";

function getMethodLabel(method: string) {
  if (method === "cash") return "Tunai";
  if (method === "bank_transfer") return "Transfer Bank";
  if (method === "giro") return "Giro";
  return "Lainnya";
}

function getDirectionLabel(direction: string) {
  return direction === "out" ? "Pembayaran Keluar" : "Penerimaan Masuk";
}

export default async function PaymentReceiptPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getPaymentReceiptDetail(id).catch(() => null);

  if (!payment) notFound();

  const partyName =
    payment.farmerName ??
    payment.supplierName ??
    payment.factoryName ??
    payment.customerName ??
    "Pihak transaksi";
  const referenceCode =
    payment.payableCode ?? payment.receivableCode ?? "-";
  const sourceCode = payment.purchaseCode ?? payment.saleCode ?? "-";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintDocumentActions
        backHref="/finance/payments"
        documentType="payment_receipt"
        fileName={`bukti-pembayaran-${payment.code}.pdf`}
        printLabel="Cetak Bukti"
        referenceId={payment.id}
        referenceType="payment"
      />

      <div className="rounded-2xl border border-border/80 bg-card/90 p-5 print:rounded-none print:border-none print:bg-transparent print:p-0">
        <div className="flex flex-col gap-5 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">
              Besawit
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Bukti Pembayaran</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Dokumen administrasi untuk pencatatan pembayaran hutang atau penerimaan piutang.
            </p>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>Tanggal Cetak: {formatDateTime(new Date())}</div>
            <div>Kode Payment: {payment.code}</div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-border/70 py-5 md:grid-cols-2">
          <ReceiptField label="Tipe Transaksi" value={getDirectionLabel(payment.direction)} />
          <ReceiptField label="Tanggal Payment" value={formatDateTime(payment.paymentDate)} />
          <ReceiptField label="Pihak" value={partyName} />
          <ReceiptField label="Metode" value={getMethodLabel(payment.method)} />
          <ReceiptField label="Kode Referensi" value={referenceCode} />
          <ReceiptField label="Kode Transaksi" value={sourceCode} />
        </div>

        <div className="grid gap-4 border-b border-border/70 py-5 md:grid-cols-3">
          <ReceiptSummary label="Nominal" value={formatCurrency(payment.amount)} emphasis />
          <ReceiptSummary label="Kas/Bank" value={payment.ledgerCategory ?? "-"} />
          <ReceiptSummary label="Kode Ledger" value={payment.ledgerCode ?? "-"} />
        </div>

        <div className="grid gap-4 py-5 md:grid-cols-2">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Keterangan</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
              {payment.notes?.trim() || payment.ledgerDescription?.trim() || "Tidak ada catatan."}
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Dicatat Oleh</div>
            <div className="mt-2 text-sm font-semibold">{payment.createdByName ?? "Sistem"}</div>
          </div>
        </div>

        <div className="mt-2 grid gap-6 border-t border-border/60 pt-5 text-sm md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Diserahkan Kepada</div>
            <div className="mt-6 border-b border-border/60 pb-2 text-sm text-muted-foreground">Tanda tangan & nama jelas</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Petugas Kas/Keuangan</div>
            <div className="mt-6 border-b border-border/60 pb-2 text-sm text-muted-foreground">Tanda tangan & nama jelas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function ReceiptSummary({
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
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={emphasis ? "mt-2 text-xl font-semibold" : "mt-2 text-base font-semibold"}>{value}</div>
    </div>
  );
}
