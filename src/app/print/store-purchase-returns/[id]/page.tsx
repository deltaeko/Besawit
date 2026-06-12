import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { PrintPageStyle } from "@/components/shared/print-page-style";
import { resolvePrintMarginPreset } from "@/lib/print-settings";
import { StorePurchaseReturnDocument } from "@/modules/store/store-purchase-return-document";
import { getStorePurchaseReturnDocument } from "@/services/store-service";

export default async function StorePurchaseReturnPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ margin?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const marginPreset = resolvePrintMarginPreset(resolvedSearchParams?.margin);
  const document = await getStorePurchaseReturnDocument(id).catch(() => null);

  if (!document) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintPageStyle marginPreset={marginPreset} />
      <BrowserPrintActions
        backHref={`/store/purchase-returns/${id}`}
        printLabel="Cetak Dokumen Retur Pembelian"
        sharePath={`/print/store-purchase-returns/${id}`}
        whatsappMessage={`Dokumen retur pembelian ${String(document.storeReturn.code ?? id)} siap dicetak.`}
      />
      <StorePurchaseReturnDocument document={document} mode="print" printedAt={new Date()} />
    </div>
  );
}
