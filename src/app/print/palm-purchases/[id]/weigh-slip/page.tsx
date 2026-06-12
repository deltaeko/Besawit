import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { PrintPageStyle } from "@/components/shared/print-page-style";
import { resolvePrintMarginPreset } from "@/lib/print-settings";
import { WeighSlipDocument } from "@/modules/palm/weigh-slip-document";
import { buildWeighSlipPaymentSummary } from "@/modules/palm/weigh-slip-sharing";
import { getPayableByReference, getPayableDetail } from "@/services/finance-service";
import { getPalmPurchase } from "@/services/palm-service";

export default async function PalmPurchaseWeighSlipPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ margin?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const marginPreset = resolvePrintMarginPreset(resolvedSearchParams?.margin);
  const [purchase, payable] = await Promise.all([
    getPalmPurchase(id).catch(() => null),
    getPayableByReference("tbs_purchase", id).catch(() => null),
  ]);
  const payableDetail = payable ? await getPayableDetail(payable.id).catch(() => null) : null;
  const paymentSummary = buildWeighSlipPaymentSummary(payableDetail ?? { payable, paymentHistory: [] });

  if (!purchase) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintPageStyle marginPreset={marginPreset} />
      <BrowserPrintActions
        backHref={`/palm/purchases/${id}/weigh-slip`}
        printLabel="Cetak Slip Timbang"
        sharePath={`/print/palm-purchases/${id}/weigh-slip?shared=1`}
        whatsappMessage={`Slip timbang pembelian TBS ${String(purchase.code ?? id)} siap dicetak.`}
      />
      <WeighSlipDocument
        mode="print"
        paymentSummary={paymentSummary}
        printedAt={new Date()}
        purchase={purchase as Record<string, unknown>}
      />
    </div>
  );
}
