import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { StorePurchaseInvoiceDocument } from "@/modules/store/store-purchase-invoice-document";
import { getStorePurchaseInvoice } from "@/services/store-service";

export default async function StorePurchaseInvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getStorePurchaseInvoice(id).catch(() => null);

  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <BrowserPrintActions
        backHref={`/store/purchases/${id}/invoice`}
        printLabel="Cetak Slip Pembelian"
      />
      <StorePurchaseInvoiceDocument invoice={invoice} mode="print" printedAt={new Date()} />
    </div>
  );
}
