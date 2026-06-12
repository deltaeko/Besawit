import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { PrintPageStyle } from "@/components/shared/print-page-style";
import { resolvePrintMarginPreset } from "@/lib/print-settings";
import { StorePurchaseInvoiceDocument } from "@/modules/store/store-purchase-invoice-document";
import { getStorePurchaseInvoice } from "@/services/store-service";

export default async function StorePurchaseInvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ margin?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const marginPreset = resolvePrintMarginPreset(resolvedSearchParams?.margin);
  const invoice = await getStorePurchaseInvoice(id).catch(() => null);

  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintPageStyle marginPreset={marginPreset} />
      <BrowserPrintActions
        backHref={`/store/purchases/${id}/invoice`}
        printLabel="Cetak Slip Pembelian"
        sharePath={`/print/store-purchases/${id}/invoice`}
        whatsappMessage={`Slip pembelian barang ${String(invoice.purchase.code ?? id)} siap dicetak.`}
      />
      <StorePurchaseInvoiceDocument invoice={invoice} mode="print" printedAt={new Date()} />
    </div>
  );
}
