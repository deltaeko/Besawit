import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { isStoreEntity } from "@/modules/store/helpers";
import { StorePurchaseForm } from "@/modules/store/purchase-form";
import { StoreSaleForm } from "@/modules/store/sale-form";
import { getMasterList } from "@/services/master-service";

export default async function NewStoreEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (!isStoreEntity(entity)) notFound();

  const [suppliers, customers, warehouses, products] = await Promise.all([
    entity === "purchases"
      ? getMasterList("suppliers", { status: "active", pageSize: 50 })
          .then((result) => result.items)
          .catch(() => [])
      : Promise.resolve([]),
    entity === "sales"
      ? getMasterList("customers", { status: "active", pageSize: 50 })
          .then((result) => result.items)
          .catch(() => [])
      : Promise.resolve([]),
    getMasterList("warehouses", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
    getMasterList("products", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store"
        title={
          entity === "purchases"
            ? "Buat Pembelian Barang Toko"
            : "Buat Penjualan Barang Toko"
        }
        description={
          entity === "purchases"
            ? "Catat pembelian barang dari supplier untuk memperbarui stok, nilai persediaan, dan hutang pembelian."
            : "Catat penjualan barang toko ke pelanggan toko. Jika pelanggan toko terhubung ke petani, piutang kreditnya bisa dipotong dari hasil pembelian TBS."
        }
      />
      {entity === "purchases" ? (
        <StorePurchaseForm
          suppliers={suppliers.map((item) => ({
            id: (item as { id: string }).id,
            name: (item as { name: string }).name,
          }))}
          warehouses={warehouses.map((item) => ({
            id: (item as { id: string }).id,
            name: (item as { name: string }).name,
          }))}
          products={products.map((item) => ({
            id: (item as { id: string }).id,
            name: (item as { name: string }).name,
            purchasePrice: Number((item as { purchasePrice?: string | number }).purchasePrice ?? 0),
          }))}
        />
      ) : (
        <StoreSaleForm
          customers={customers.map((item) => ({
            id: (item as { id: string }).id,
            name: (item as { name: string }).name,
            farmerId: (item as { farmerId?: string | null }).farmerId ?? null,
            farmerName: (item as { farmerName?: string | null }).farmerName ?? null,
            farmerCode: (item as { farmerCode?: string | null }).farmerCode ?? null,
          }))}
          warehouses={warehouses.map((item) => ({
            id: (item as { id: string }).id,
            name: (item as { name: string }).name,
          }))}
          products={products.map((item) => ({
            id: (item as { id: string }).id,
            name: (item as { name: string }).name,
            sellingPrice: Number((item as { sellingPrice?: string | number }).sellingPrice ?? 0),
          }))}
        />
      )}
    </div>
  );
}
