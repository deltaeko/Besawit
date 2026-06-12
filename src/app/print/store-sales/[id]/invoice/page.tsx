import { notFound } from "next/navigation";

import { PrintDocumentActions } from "@/components/shared/print-document-actions";
import { PrintPageStyle } from "@/components/shared/print-page-style";
import { resolvePrintMarginPreset } from "@/lib/print-settings";
import { StoreSaleInvoiceDocument } from "@/modules/store/store-sale-invoice-document";
import { getStoreSaleInvoice } from "@/services/store-service";

export default async function StoreSaleInvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ margin?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const marginPreset = resolvePrintMarginPreset(resolvedSearchParams?.margin);
  const invoice = await getStoreSaleInvoice(id).catch(() => null);

  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintPageStyle marginPreset={marginPreset} />
      <PrintDocumentActions
        backHref={`/store/sales/${id}/invoice`}
        documentType="store_invoice"
        fileName={`nota-penjualan-${String(invoice.sale.code ?? id)}.pdf`}
        printLabel="Cetak Nota"
        referenceId={id}
        referenceType="store_sale"
        sharePath={`/print/store-sales/${id}/invoice`}
        whatsappMessage={`Nota penjualan toko ${String(invoice.sale.code ?? id)} siap dicetak.`}
      />
      <StoreSaleInvoiceDocument invoice={invoice} mode="print" printedAt={new Date()} />
    </div>
  );
}
