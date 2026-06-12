import { notFound } from "next/navigation";

import { DocumentPreviewActions } from "@/components/shared/document-preview-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StorePurchaseInvoiceDocument } from "@/modules/store/store-purchase-invoice-document";
import { getStorePurchaseInvoice } from "@/services/store-service";

export default async function StorePurchaseInvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getStorePurchaseInvoice(id).catch(() => null);

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store"
        title="Preview Slip Pembelian Barang"
        description="Tinjau item, total pembelian, dan informasi supplier sebelum slip dicetak."
        action={
          <DocumentPreviewActions
            backHref={`/store/purchases/${id}`}
            printHref={`/print/store-purchases/${id}/invoice`}
            printLabel="Print Preview"
            whatsappMessage={`Slip pembelian barang ${String(invoice.purchase.code ?? id)} siap ditinjau.`}
          />
        }
      />

      <StorePurchaseInvoiceDocument invoice={invoice} mode="preview" printedAt={new Date()} />
    </div>
  );
}
