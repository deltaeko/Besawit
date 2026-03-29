import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/palm/sales/${id}`}>Kembali</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/print/palm-sales/${id}/document`} target="_blank">
                <Printer className="size-4" />
                Print
              </Link>
            </Button>
          </div>
        }
      />

      <PalmSaleDocument mode="preview" printedAt={new Date()} sale={sale as Record<string, unknown>} />
    </div>
  );
}
