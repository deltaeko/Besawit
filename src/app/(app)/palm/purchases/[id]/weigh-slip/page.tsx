import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WeighSlipDocument } from "@/modules/palm/weigh-slip-document";
import { getPalmPurchase } from "@/services/palm-service";

export default async function PalmPurchaseWeighSlipPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchase = await getPalmPurchase(id).catch(() => null);

  if (!purchase) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agen Sawit"
        title="Preview Slip Timbang Petani"
        description="Tinjau data timbang pembelian TBS sebelum slip dicetak untuk petani atau arsip lapangan."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/palm/purchases/${id}`}>Kembali</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/print/palm-purchases/${id}/weigh-slip`} target="_blank">
                <Printer className="size-4" />
                Print
              </Link>
            </Button>
            <Button disabled type="button" variant="outline">
              <FileDown className="size-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
        Export PDF belum diaktifkan karena infrastruktur generator PDF belum tersedia di aplikasi saat ini. Preview ini tetap siap dicetak melalui browser.
      </div>

      <WeighSlipDocument mode="preview" printedAt={new Date()} purchase={purchase as Record<string, unknown>} />
    </div>
  );
}
