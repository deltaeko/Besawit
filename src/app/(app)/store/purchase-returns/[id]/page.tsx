import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StorePurchaseReturnDocument } from "@/modules/store/store-purchase-return-document";
import { getStorePurchaseReturnDocument } from "@/services/store-service";

export default async function StorePurchaseReturnPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getStorePurchaseReturnDocument(id).catch(() => null);

  if (!document) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store"
        title="Preview Dokumen Retur Pembelian"
        description="Tinjau item retur, total nilai retur, dan referensi pembelian sebelum dokumen dicetak."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/store/purchases/${document.storeReturn.purchaseId}`}>Kembali</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/print/store-purchase-returns/${id}`} target="_blank">
                <Printer className="size-4" />
                Print
              </Link>
            </Button>
          </div>
        }
      />

      <StorePurchaseReturnDocument document={document} mode="preview" printedAt={new Date()} />
    </div>
  );
}
