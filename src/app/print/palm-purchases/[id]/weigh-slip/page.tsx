import { notFound } from "next/navigation";

import { BrowserPrintActions } from "@/components/shared/browser-print-actions";
import { WeighSlipDocument } from "@/modules/palm/weigh-slip-document";
import { getPalmPurchase } from "@/services/palm-service";

export default async function PalmPurchaseWeighSlipPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchase = await getPalmPurchase(id).catch(() => null);

  if (!purchase) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <BrowserPrintActions backHref={`/palm/purchases/${id}/weigh-slip`} printLabel="Cetak Slip Timbang" />
      <WeighSlipDocument mode="print" printedAt={new Date()} purchase={purchase as Record<string, unknown>} />
    </div>
  );
}
