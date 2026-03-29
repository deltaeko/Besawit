import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { StorePurchaseReturnDocument } from "@/modules/store/store-purchase-return-document";
import { getStorePurchaseReturnDocument } from "@/services/store-service";

export default async function StorePurchaseReturnPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getStorePurchaseReturnDocument(id).catch(() => null);

  if (!document) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <BrowserPrintActions
        backHref={`/store/purchase-returns/${id}`}
        printLabel="Cetak Dokumen Retur Pembelian"
      />
      <StorePurchaseReturnDocument document={document} mode="print" printedAt={new Date()} />
    </div>
  );
}
