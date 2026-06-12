import { notFound } from "next/navigation";

import { DocumentPreviewActions } from "@/components/shared/document-preview-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StoreSaleInvoiceDocument } from "@/modules/store/store-sale-invoice-document";
import { getStoreSaleInvoice } from "@/services/store-service";

export default async function StoreSaleInvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getStoreSaleInvoice(id).catch(() => null);

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store"
        title="Preview Nota Penjualan Toko"
        description="Tinjau item, total penjualan, dan informasi pelanggan sebelum nota dicetak."
        action={
          <DocumentPreviewActions
            backHref={`/store/sales/${id}`}
            printHref={`/print/store-sales/${id}/invoice`}
            printLabel="Print Preview"
            whatsappMessage={`Nota penjualan toko ${String(invoice.sale.code ?? id)} siap ditinjau.`}
          />
        }
      />

      <StoreSaleInvoiceDocument invoice={invoice} mode="preview" printedAt={new Date()} />
    </div>
  );
}
