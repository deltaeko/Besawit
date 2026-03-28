import { notFound, redirect } from "next/navigation";

import { PalmPurchaseForm } from "@/modules/palm/purchase-form";
import { getPalmPurchaseFormOptions } from "@/modules/palm/purchase-form-options";
import { isPalmEntity } from "@/modules/palm/helpers";
import { getPayableByReference } from "@/services/finance-service";
import { hasReferenceStockMovement } from "@/services/inventory-service";
import { getPalmPurchase } from "@/services/palm-service";

function toDateInputValue(value?: Date | string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

export default async function EditPalmEntityPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!isPalmEntity(entity) || entity !== "purchases") notFound();

  const [purchase, payable, options, hasStockMovement] = await Promise.all([
    getPalmPurchase(id).catch(() => null),
    getPayableByReference("tbs_purchase", id).catch(() => null),
    getPalmPurchaseFormOptions(),
    hasReferenceStockMovement("tbs_purchase", id).catch(() => false),
  ]);

  if (!purchase) notFound();
  if (hasStockMovement) {
    redirect(`/palm/purchases/${id}`);
  }

  return (
    <PalmPurchaseForm
      driverOptions={options.driverOptions}
      farmerStoreDebtMap={options.farmerStoreDebtMap}
      farmers={options.farmers}
      initialValues={{
        purchaseDate: toDateInputValue(purchase.purchaseDate),
        farmerId: purchase.farmerId,
        driverId: purchase.driverId ?? "",
        vehicleId: purchase.vehicleId ?? "",
        warehouseId: purchase.warehouseId ?? "",
        grossWeight: Number(purchase.grossWeight),
        tareWeight: Number(purchase.tareWeight),
        buyingPricePerKg: Number(purchase.buyingPricePerKg),
        transportCost: Number(purchase.transportCost),
        loadingCost: Number(purchase.loadingCost),
        otherCost: Number(purchase.otherCost),
        storeDebtDeductionMode:
          (purchase.storeDebtOffset?.offset?.inputMode as "value" | "percentage" | undefined) ??
          "none",
        storeDebtDeductionValue: Number(
          purchase.storeDebtOffset?.offset?.inputAmount ?? 0,
        ),
        storeDebtDeductionPercent: Number(
          purchase.storeDebtOffset?.offset?.inputPercentage ?? 0,
        ),
        storeDebtDeductionNotes: purchase.storeDebtOffset?.offset?.notes ?? "",
        notes: purchase.notes ?? "",
      }}
      mode="edit"
      paymentSnapshot={{
        payableId: payable?.id ?? null,
        payableCode: payable?.code ?? null,
        paymentStatus: payable?.status ?? purchase.paymentStatus,
        paidAmount: Number(payable?.paidAmount ?? 0),
        outstandingAmount: Number(payable?.outstandingAmount ?? purchase.totalPurchase),
      }}
      purchaseId={purchase.id}
      transactionCode={purchase.code}
      transactionStatus={purchase.status}
      vehicles={options.vehicles}
      warehouses={options.warehouses}
    />
  );
}
