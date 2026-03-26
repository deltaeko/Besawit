import { PageHeader } from "@/components/shared/page-header";
import { StockTakeForm } from "@/modules/inventory/stock-take-form";
import { getMasterList } from "@/services/master-service";
import { getStockBalanceList } from "@/services/inventory-service";

export default async function NewStockTakePage() {
  const [warehouses, products, balances] = await Promise.all([
    getMasterList("warehouses").then((result) => result.items).catch(() => []),
    getMasterList("products").then((result) => result.items).catch(() => []),
    getStockBalanceList(100).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Buat Stock Take"
        description="Muat stok sistem, input stok fisik, lalu submit untuk approval dan pembentukan adjustment."
      />
      <StockTakeForm
        warehouses={warehouses.map((item) => ({
          id: (item as { id: string }).id,
          name: (item as { name: string }).name,
        }))}
        products={products.map((item) => ({
          id: (item as { id: string }).id,
          name: (item as { name: string }).name,
        }))}
        balances={balances.map((item) => ({
          warehouseId: item.warehouseId,
          productId: item.productId,
          quantity: item.quantity,
          averageCost: item.averageCost,
          productName: item.productName,
        }))}
      />
    </div>
  );
}
