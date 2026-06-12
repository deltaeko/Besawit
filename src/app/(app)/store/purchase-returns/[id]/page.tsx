import { notFound } from "next/navigation";

import { DocumentPreviewActions } from "@/components/shared/document-preview-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StorePurchaseReturnDocument } from "@/modules/store/store-purchase-return-document";
import { getStorePurchaseReturnDocument } from "@/services/store-service";

export default async function StorePurchaseReturnPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getStorePurchaseReturnDocument(id).catch(() => null);

  if (!document) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store"
        title="Preview Dokumen Retur Pembelian"
        description="Tinjau item retur, total nilai retur, dan referensi pembelian sebelum dokumen dicetak."
        action={
          <DocumentPreviewActions
            backHref={`/store/purchases/${document.storeReturn.purchaseId}`}
            printHref={`/print/store-purchase-returns/${id}`}
            printLabel="Print Preview"
            whatsappMessage={`Dokumen retur pembelian ${String(document.storeReturn.code ?? id)} siap ditinjau.`}
          />
        }
      />

      <StorePurchaseReturnDocument document={document} mode="preview" printedAt={new Date()} />
    </div>
  );
}
