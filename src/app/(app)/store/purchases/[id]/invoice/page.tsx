import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StorePurchaseInvoiceDocument } from "@/modules/store/store-purchase-invoice-document";
import { getStorePurchaseInvoice } from "@/services/store-service";

export default async function StorePurchaseInvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getStorePurchaseInvoice(id).catch(() => null);

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store"
        title="Preview Slip Pembelian Barang"
        description="Tinjau item, total pembelian, dan informasi supplier sebelum slip dicetak."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/store/purchases/${id}`}>Kembali</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/print/store-purchases/${id}/invoice`} target="_blank">
                <Printer className="size-4" />
                Print
              </Link>
            </Button>
          </div>
        }
      />

      <StorePurchaseInvoiceDocument invoice={invoice} mode="preview" printedAt={new Date()} />
    </div>
  );
}
