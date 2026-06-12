import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { PrintPageStyle } from "@/components/shared/print-page-style";
import { resolvePrintMarginPreset } from "@/lib/print-settings";
import { PalmSaleDocument } from "@/modules/palm/palm-sale-document";
import { getPalmSale } from "@/services/palm-service";

export default async function PalmSaleDocumentPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ margin?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const marginPreset = resolvePrintMarginPreset(resolvedSearchParams?.margin);
  const sale = await getPalmSale(id).catch(() => null);

  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintPageStyle marginPreset={marginPreset} />
      <BrowserPrintActions
        backHref={`/palm/sales/${id}/document`}
        printLabel="Cetak Dokumen"
        sharePath={`/print/palm-sales/${id}/document`}
        whatsappMessage={`Dokumen penjualan TBS ${String(sale.code ?? id)} siap dicetak.`}
      />
      <PalmSaleDocument mode="print" printedAt={new Date()} sale={sale as Record<string, unknown>} />
    </div>
  );
}
