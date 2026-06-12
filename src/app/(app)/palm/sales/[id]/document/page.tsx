import { notFound } from "next/navigation";

import { DocumentPreviewActions } from "@/components/shared/document-preview-actions";
import { PageHeader } from "@/components/shared/page-header";
import { PalmSaleDocument } from "@/modules/palm/palm-sale-document";
import { getPalmSale } from "@/services/palm-service";

export default async function PalmSaleDocumentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getPalmSale(id).catch(() => null);

  if (!sale) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agen Sawit"
        title="Preview Dokumen Penjualan TBS"
        description="Tinjau tonase, potongan, return, dan nilai transaksi penjualan ke pabrik sebelum dicetak."
        action={
          <DocumentPreviewActions
            backHref={`/palm/sales/${id}`}
            printHref={`/print/palm-sales/${id}/document`}
            printLabel="Print Preview"
            whatsappMessage={`Dokumen penjualan TBS ${String(sale.code ?? id)} siap ditinjau.`}
          />
        }
      />

      <PalmSaleDocument mode="preview" printedAt={new Date()} sale={sale as Record<string, unknown>} />
    </div>
  );
}
