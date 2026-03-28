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
          warehouses: [],
          tbsPoolBalances: [],
          configs: [],
          factoryDefaults: {},
        }))
      : Promise.resolve({
          factories: [],
          warehouses: [],
          tbsPoolBalances: [],
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
            description="Catat penjualan TBS ke pabrik dari pool stok gudang, berikut hasil timbangan, potongan, retur, dan perhitungan margin."
          />
          <PalmSaleForm
            factories={saleOptions.factories}
            warehouses={saleOptions.warehouses}
            tbsPoolBalances={saleOptions.tbsPoolBalances}
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
