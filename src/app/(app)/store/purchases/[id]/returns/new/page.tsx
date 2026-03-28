import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StorePurchaseReturnForm } from "@/modules/store/store-purchase-return-form";
import { getStorePurchaseReturnFormData } from "@/services/store-service";

export default async function NewStorePurchaseReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getStorePurchaseReturnFormData(id).catch(() => null);

  if (!context) notFound();

  if (context.purchase.status !== "active") {
    redirect(`/store/purchases/${id}`);
  }

  if (context.payable && Number(context.payable.paidAmount ?? 0) > 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Store"
          title="Retur Pembelian Barang"
          description="Retur pembelian belum tersedia untuk dokumen yang sudah memiliki pembayaran supplier."
          action={
            <Button asChild variant="outline">
              <Link href={`/store/purchases/${id}`}>Kembali</Link>
            </Button>
          }
        />
        <EmptyState
          title="Retur belum bisa diproses"
          description="Pembelian ini sudah memiliki pembayaran supplier. Untuk fase saat ini, retur hanya didukung sebelum ada pembayaran."
        />
      </div>
    );
  }

  if (!context.summary.hasReturnableItems) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Store"
          title="Retur Pembelian Barang"
          description="Semua item pada pembelian ini sudah diretur penuh atau tidak memiliki qty yang bisa diretur."
          action={
            <Button asChild variant="outline">
              <Link href={`/store/purchases/${id}`}>Kembali</Link>
            </Button>
          }
        />
        <EmptyState
          title="Tidak ada qty yang bisa diretur"
          description="Periksa histori retur pembelian di detail transaksi untuk melihat retur yang sudah pernah dicatat."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store"
        title="Retur Pembelian Barang"
        description="Catat barang pembelian supplier yang dikembalikan agar stok dan hutang supplier tetap akurat."
        action={
          <Button asChild variant="outline">
            <Link href={`/store/purchases/${id}`}>Kembali</Link>
          </Button>
        }
      />
      <StorePurchaseReturnForm
        items={context.items.map((item) => ({
          purchaseItemId: item.id,
          productName: item.productName ?? item.productCode ?? "-",
          productUnit: item.productUnit ?? "",
          purchasedQty: Number(item.purchasedQty),
          returnedQty: Number(item.returnedQty),
          availableQty: Number(item.availableQty),
          unitCost: Number(item.unitCost),
        }))}
        payableAmount={Number(context.payable?.outstandingAmount ?? context.payable?.amount ?? 0)}
        purchaseCode={context.purchase.code}
        purchaseId={context.purchase.id}
        supplierName={context.purchase.supplierName ?? "-"}
        totalReturnedAmount={Number(context.summary.totalReturnedAmount)}
        transactionDate={context.purchase.transactionDate}
        warehouseName={context.purchase.warehouseName ?? "-"}
      />
    </div>
  );
}
