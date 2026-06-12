import { notFound } from "next/navigation";

import { DocumentPreviewActions } from "@/components/shared/document-preview-actions";
import { PageHeader } from "@/components/shared/page-header";
import { WeighSlipDocument } from "@/modules/palm/weigh-slip-document";
import { buildWeighSlipPaymentSummary } from "@/modules/palm/weigh-slip-sharing";
import { getPayableByReference, getPayableDetail } from "@/services/finance-service";
import { getPalmPurchase } from "@/services/palm-service";

export default async function PalmPurchaseWeighSlipPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [purchase, payable] = await Promise.all([
    getPalmPurchase(id).catch(() => null),
    getPayableByReference("tbs_purchase", id).catch(() => null),
  ]);
  const payableDetail = payable ? await getPayableDetail(payable.id).catch(() => null) : null;
  const paymentSummary = buildWeighSlipPaymentSummary(payableDetail ?? { payable, paymentHistory: [] });

  if (!purchase) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agen Sawit"
        title="Preview Slip Timbang Petani"
        description="Tinjau data timbang pembelian TBS sebelum slip dicetak untuk petani atau arsip lapangan."
        action={
          <DocumentPreviewActions
            backHref={`/palm/purchases/${id}`}
            printHref={`/print/palm-purchases/${id}/weigh-slip`}
            printLabel="Print Preview"
            whatsappMessage={`Slip timbang pembelian TBS ${String(purchase.code ?? id)} siap ditinjau.`}
            whatsappSharePath={`/print/palm-purchases/${id}/weigh-slip`}
          />
        }
      />

      <WeighSlipDocument
        mode="preview"
        paymentSummary={paymentSummary}
        printedAt={new Date()}
        purchase={purchase as Record<string, unknown>}
      />
    </div>
  );
}
