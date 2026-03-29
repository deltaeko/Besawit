import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { PalmSaleDocument } from "@/modules/palm/palm-sale-document";
import { getPalmSale } from "@/services/palm-service";

export default async function PalmSaleDocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getPalmSale(id).catch(() => null);

  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <BrowserPrintActions backHref={`/palm/sales/${id}/document`} printLabel="Cetak Dokumen" />
      <PalmSaleDocument mode="print" printedAt={new Date()} sale={sale as Record<string, unknown>} />
    </div>
  );
}
