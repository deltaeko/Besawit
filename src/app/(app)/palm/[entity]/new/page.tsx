import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getPalmSaleFormOptions } from "@/services/palm-service";
import { PalmPurchaseForm } from "@/modules/palm/purchase-form";
import { getPalmPurchaseFormOptions } from "@/modules/palm/purchase-form-options";
import { PalmSaleForm } from "@/modules/palm/sale-form";
import { isPalmEntity } from "@/modules/palm/helpers";

export default async function NewPalmEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (!isPalmEntity(entity)) notFound();

  const [purchaseOptions, saleOptions] = await Promise.all([
    entity === "purchases"
      ? getPalmPurchaseFormOptions()
      : Promise.resolve({
          farmers: [],
          driverOptions: [],
          vehicles: [],
          warehouses: [],
          farmerStoreDebtMap: {},
        }),
    entity === "sales"
      ? getPalmSaleFormOptions().catch(() => ({
          factories: [],
          purchases: [],
          configs: [],
          factoryDefaults: {},
        }))
      : Promise.resolve({
          factories: [],
          purchases: [],
          configs: [],
          factoryDefaults: {},
        }),
  ]);

  return (
    <div className="space-y-6">
      {entity === "purchases" ? (
        <PalmPurchaseForm
          farmers={purchaseOptions.farmers}
          driverOptions={purchaseOptions.driverOptions}
          farmerStoreDebtMap={purchaseOptions.farmerStoreDebtMap}
          mode="create"
          vehicles={purchaseOptions.vehicles}
          warehouses={purchaseOptions.warehouses}
        />
      ) : (
        <>
          <PageHeader
            eyebrow="Palm Agent"
            title="Buat Penjualan TBS ke Pabrik"
            description="Catat penjualan TBS ke pabrik dengan referensi pembelian, hasil timbangan, potongan, return, dan perhitungan margin."
          />
          <PalmSaleForm
            purchases={saleOptions.purchases.map((item) => ({
              id: item.id,
              code: item.code,
              totalPurchase: item.totalPurchase,
              totalOperationalCost: item.totalOperationalCost,
            }))}
            factories={saleOptions.factories}
            deductionConfigs={saleOptions.configs.map((item) => ({
              id: item.id,
              code: item.code,
              name: item.name,
              legacyType: item.legacyType,
              defaultInputMode: item.defaultInputMode,
              description: item.description,
            }))}
            factoryDefaults={saleOptions.factoryDefaults}
          />
        </>
      )}
    </div>
  );
}
