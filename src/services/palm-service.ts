import Decimal from "decimal.js";

import { palmPurchaseSchema, palmSaleSchema } from "@/lib/validation/palm";
import {
  createTbsPurchase,
  createTbsSale,
  createTbsSaleDeductions,
  createTbsSaleReturns,
  getTbsPurchaseById,
  getTbsSaleById,
  listActiveTbsDeductionConfigs,
  listFactoryDeductionDefaults,
  listTbsSaleDeductionsBySaleId,
  listTbsSaleReturnsBySaleId,
  listTbsPurchases,
  listTbsPurchasesPage,
  listTbsSales,
  listTbsSalesPage,
  updateTbsPurchase,
} from "@/repositories/palm-repository";
import { logAudit } from "@/services/audit-service";
import { generateTransactionCode } from "@/services/code-service";
import {
  applyTbsPurchaseStoreOffset,
  buildStoreDebtOffsetPlan,
  createPayableEntry,
  createReceivableEntry,
  getTbsPurchaseStoreOffsetDetail,
  getPayableByReference,
  reverseTbsPurchaseStoreOffset,
  syncPayableAmountBySource,
} from "@/services/finance-service";
import { getMasterList } from "@/services/master-service";

function normalizeOptionalReference(value?: string) {
  return value ? value : null;
}

function resolvePaymentStatusLabel(status?: string | null) {
  if (status === "partial" || status === "paid" || status === "overdue" || status === "cancelled") {
    return status;
  }

  return "unpaid";
}

type SaleDeductionInput = {
  configId?: string;
  type?: "trash" | "water" | "sand_mud" | "fronds" | "unripe" | "long_stalk" | "others";
  label: string;
  inputMode: "kg" | "percentage" | "nominal";
  inputValue: number;
  notes?: string;
};

function mapLegacyTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    trash: "Sampah",
    water: "Air",
    sand_mud: "Pasir/Lumpur",
    fronds: "Pelepah/Tangkai",
    unripe: "Mentah",
    long_stalk: "Tangkai Panjang",
    others: "Lainnya",
  };

  return labels[type ?? "others"] ?? "Lainnya";
}

function normalizeDeductionType(
  type?: string | null,
): "trash" | "water" | "sand_mud" | "fronds" | "unripe" | "long_stalk" | "others" {
  if (
    type === "trash" ||
    type === "water" ||
    type === "sand_mud" ||
    type === "fronds" ||
    type === "unripe" ||
    type === "long_stalk" ||
    type === "others"
  ) {
    return type;
  }

  return "others";
}

async function getDeductionConfigMap() {
  const configs = await listActiveTbsDeductionConfigs();
  return new Map(configs.map((item) => [item.id, item]));
}

function calculateSaleDeductions(
  deductions: SaleDeductionInput[],
  netWeightInitial: Decimal,
  configMap: Map<string, Awaited<ReturnType<typeof listActiveTbsDeductionConfigs>>[number]>,
) {
  const items = deductions.map((item, index) => {
    const config =
      (item.configId ? configMap.get(item.configId) : undefined) ??
      [...configMap.values()].find(
        (candidate) =>
          candidate.legacyType === item.type ||
          candidate.name.toLowerCase() === item.label.toLowerCase(),
      );
    const normalizedType = normalizeDeductionType(item.type ?? config?.legacyType ?? "others");
    const inputValue = new Decimal(item.inputValue ?? 0);
    const percentageValue =
      item.inputMode === "percentage" ? inputValue : new Decimal(0);
    const deductionWeight =
      item.inputMode === "kg"
        ? inputValue
        : item.inputMode === "percentage"
          ? netWeightInitial.mul(inputValue).div(100)
          : new Decimal(0);
    const deductionAmount =
      item.inputMode === "nominal" ? inputValue : new Decimal(0);

    return {
      configId: item.configId || null,
      type: normalizedType,
      label: item.label || config?.name || mapLegacyTypeLabel(normalizedType),
      inputMode: item.inputMode,
      inputValue,
      percentageValue,
      weight: deductionWeight,
      deductionAmount,
      notes: item.notes || null,
      sortOrder: index,
    };
  });

  return {
    items,
    totalDeductionWeight: items.reduce((total, item) => total.plus(item.weight), new Decimal(0)),
    totalDeductionAmount: items.reduce(
      (total, item) => total.plus(item.deductionAmount),
      new Decimal(0),
    ),
  };
}

export async function getPalmPurchaseList(limit = 20) {
  return listTbsPurchases(limit);
}

export async function getPalmSaleList(limit = 20) {
  return listTbsSales(limit);
}

export async function getPalmPurchasePage(page = 1, pageSize = 20) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 50) : 20;
  const result = await listTbsPurchasesPage(safePage, safePageSize);

  return {
    items: result.items,
    meta: {
      page: safePage,
      pageSize: safePageSize,
      total: result.total,
      totalPages: Math.max(Math.ceil(result.total / safePageSize), 1),
    },
  };
}

export async function getPalmSalePage(page = 1, pageSize = 20) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 50) : 20;
  const result = await listTbsSalesPage(safePage, safePageSize);

  return {
    items: result.items,
    meta: {
      page: safePage,
      pageSize: safePageSize,
      total: result.total,
      totalPages: Math.max(Math.ceil(result.total / safePageSize), 1),
    },
  };
}

export async function getPalmSaleReferenceOptions(limit = 100) {
  return listTbsPurchases(limit);
}

export async function getPalmPurchase(id: string) {
  const purchase = await getTbsPurchaseById(id);
  if (!purchase) return null;

  const storeDebtOffset = await getTbsPurchaseStoreOffsetDetail(id).catch(() => null);

  return {
    ...purchase,
    storeDebtOffset,
  };
}

export async function getPalmSale(id: string) {
  const sale = await getTbsSaleById(id);
  if (!sale) return null;

  const [deductions, returns] = await Promise.all([
    listTbsSaleDeductionsBySaleId(id),
    listTbsSaleReturnsBySaleId(id),
  ]);

  return {
    ...sale,
    deductions,
    returns,
  };
}

export async function getPalmSaleFormOptions() {
  const [factories, purchases, configs] = await Promise.all([
    getMasterList("factories", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
    listTbsPurchases(100),
    listActiveTbsDeductionConfigs(),
  ]);

  const factoryDefaultsEntries = await Promise.all(
    factories.map(async (factory) => {
      const factoryId = (factory as Record<string, unknown>).id;
      if (typeof factoryId !== "string") return null;
      const defaults = await listFactoryDeductionDefaults(factoryId);
      return [factoryId, defaults] as const;
    }),
  );

  return {
    factories: factories.map((item) => ({
      id: (item as { id: string }).id,
      name: (item as { name: string }).name,
    })),
    purchases,
    configs,
    factoryDefaults: Object.fromEntries(
      factoryDefaultsEntries.filter(Boolean) as Array<[string, Awaited<ReturnType<typeof listFactoryDeductionDefaults>>]>,
    ),
  };
}

export async function createPalmPurchase(payload: unknown, actorId?: string | null) {
  const parsed = palmPurchaseSchema.parse(payload);
  const netWeight = new Decimal(parsed.grossWeight).minus(parsed.tareWeight);
  const totalPurchase = netWeight.mul(parsed.buyingPricePerKg);
  const totalOperationalCost = new Decimal(parsed.transportCost)
    .plus(parsed.loadingCost)
    .plus(parsed.otherCost);

  if (netWeight.lte(0)) {
    throw new Error("Net weight must be greater than zero.");
  }

  const storeDebtPlanResult = await buildStoreDebtOffsetPlan({
    farmerId: parsed.farmerId,
    totalPurchase,
    deduction: {
      mode: parsed.storeDebtDeductionMode,
      value: parsed.storeDebtDeductionValue,
      percentage: parsed.storeDebtDeductionPercent,
      notes: parsed.storeDebtDeductionNotes,
    },
  });
  const storeDebtAppliedAmount = storeDebtPlanResult.plan?.appliedAmount ?? new Decimal(0);
  const payableAmount = Decimal.max(totalPurchase.minus(storeDebtAppliedAmount), 0);

  const purchase = await createTbsPurchase({
    code: generateTransactionCode("TBP"),
    purchaseDate: new Date(parsed.purchaseDate),
    farmerId: parsed.farmerId,
    driverId: parsed.driverId || null,
    vehicleId: parsed.vehicleId || null,
    warehouseId: parsed.warehouseId || null,
    grossWeight: parsed.grossWeight.toFixed(2),
    tareWeight: parsed.tareWeight.toFixed(2),
    netWeight: netWeight.toFixed(2),
    buyingPricePerKg: parsed.buyingPricePerKg.toFixed(2),
    totalPurchase: totalPurchase.toFixed(2),
    transportCost: parsed.transportCost.toFixed(2),
    loadingCost: parsed.loadingCost.toFixed(2),
    otherCost: parsed.otherCost.toFixed(2),
    totalOperationalCost: totalOperationalCost.toFixed(2),
    notes: parsed.notes || null,
    createdBy: actorId ?? null,
    paymentStatus: "unpaid",
    status: "active",
  });

  const payable = await createPayableEntry({
    sourceType: "tbs_purchase",
    sourceId: purchase.id,
    partyType: "farmer",
    farmerId: purchase.farmerId,
    amount: Number(payableAmount.toFixed(2)),
    notes: "Auto-generated from TBS purchase",
    createdBy: actorId,
  });

  await applyTbsPurchaseStoreOffset({
    purchaseId: purchase.id,
    payableId: payable.id,
    farmerId: purchase.farmerId,
    actorId,
    plan: storeDebtPlanResult.plan,
  });

  await logAudit({
    entityType: "tbs_purchases",
    entityId: purchase.id,
    action: "create",
    actorId,
    after: purchase,
    metadata: {
      storeDebtDeductionApplied: storeDebtAppliedAmount.toFixed(2),
      storeDebtReceivableCount: storeDebtPlanResult.summary.receivableCount,
    },
  });

  return purchase;
}

export async function updatePalmPurchase(
  id: string,
  payload: unknown,
  actorId?: string | null,
) {
  const existing = await getTbsPurchaseById(id);
  if (!existing) {
    throw new Error("Transaksi pembelian tidak ditemukan.");
  }

  const parsed = palmPurchaseSchema.parse(payload);
  const netWeight = new Decimal(parsed.grossWeight).minus(parsed.tareWeight);
  const totalPurchase = netWeight.mul(parsed.buyingPricePerKg);
  const totalOperationalCost = new Decimal(parsed.transportCost)
    .plus(parsed.loadingCost)
    .plus(parsed.otherCost);

  if (netWeight.lte(0)) {
    throw new Error("Berat bersih harus lebih besar dari 0.");
  }

  const payable = await getPayableByReference("tbs_purchase", id);
  const previousOffset = await getTbsPurchaseStoreOffsetDetail(id).catch(() => null);
  const storeDebtPlanResult = await buildStoreDebtOffsetPlan({
    farmerId: parsed.farmerId,
    totalPurchase,
    deduction: {
      mode: parsed.storeDebtDeductionMode,
      value: parsed.storeDebtDeductionValue,
      percentage: parsed.storeDebtDeductionPercent,
      notes: parsed.storeDebtDeductionNotes,
    },
  });
  const storeDebtAppliedAmount = storeDebtPlanResult.plan?.appliedAmount ?? new Decimal(0);
  const payableAmount = Decimal.max(totalPurchase.minus(storeDebtAppliedAmount), 0);

  if (payable && new Decimal(payable.paidAmount).gt(payableAmount)) {
    throw new Error("Total akhir tidak boleh lebih kecil dari pembayaran yang sudah dicatat.");
  }

  if (previousOffset) {
    await reverseTbsPurchaseStoreOffset(id, actorId);
  }

  const nextPaymentStatus = payable
    ? resolvePaymentStatusLabel(payable.status)
    : existing.paymentStatus;

  const purchase = await updateTbsPurchase(id, {
    purchaseDate: new Date(parsed.purchaseDate),
    farmerId: parsed.farmerId,
    driverId: normalizeOptionalReference(parsed.driverId),
    vehicleId: normalizeOptionalReference(parsed.vehicleId),
    warehouseId: normalizeOptionalReference(parsed.warehouseId),
    grossWeight: parsed.grossWeight.toFixed(2),
    tareWeight: parsed.tareWeight.toFixed(2),
    netWeight: netWeight.toFixed(2),
    buyingPricePerKg: parsed.buyingPricePerKg.toFixed(2),
    totalPurchase: totalPurchase.toFixed(2),
    transportCost: parsed.transportCost.toFixed(2),
    loadingCost: parsed.loadingCost.toFixed(2),
    otherCost: parsed.otherCost.toFixed(2),
    totalOperationalCost: totalOperationalCost.toFixed(2),
    notes: parsed.notes || null,
    paymentStatus: nextPaymentStatus,
    updatedAt: new Date(),
  });

  if (!purchase) {
    throw new Error("Gagal memperbarui transaksi pembelian.");
  }

  if (payable) {
    await syncPayableAmountBySource("tbs_purchase", id, payableAmount);
  } else {
    await createPayableEntry({
      sourceType: "tbs_purchase",
      sourceId: purchase.id,
      partyType: "farmer",
      farmerId: purchase.farmerId,
      amount: Number(payableAmount.toFixed(2)),
      notes: "Auto-generated from TBS purchase",
      createdBy: actorId,
    });
  }

  const refreshedPayable = await getPayableByReference("tbs_purchase", id);
  await applyTbsPurchaseStoreOffset({
    purchaseId: purchase.id,
    payableId: refreshedPayable?.id ?? payable?.id ?? null,
    farmerId: purchase.farmerId,
    actorId,
    plan: storeDebtPlanResult.plan,
  });

  const refreshedPurchase = await getTbsPurchaseById(id);

  await logAudit({
    entityType: "tbs_purchases",
    entityId: id,
    action: "update",
    actorId,
    before: existing,
    after: refreshedPurchase ?? purchase,
    metadata: {
      previousStoreDebtDeductionApplied: previousOffset?.offset?.appliedAmount ?? "0.00",
      storeDebtDeductionApplied: storeDebtAppliedAmount.toFixed(2),
      storeDebtReceivableCount: storeDebtPlanResult.summary.receivableCount,
    },
  });

  return refreshedPurchase ?? purchase;
}

export async function createPalmSale(payload: unknown, actorId?: string | null) {
  const parsed = palmSaleSchema.parse(payload);
  const purchase = await getTbsPurchaseById(parsed.referencePurchaseId);
  const deductionConfigMap = await getDeductionConfigMap();

  if (!purchase) {
    throw new Error("Reference purchase not found.");
  }

  const netWeightInitial = new Decimal(parsed.grossWeight).minus(parsed.tareWeight);
  const deductionSummary = calculateSaleDeductions(
    parsed.deductions as SaleDeductionInput[],
    netWeightInitial,
    deductionConfigMap,
  );
  const netAfterDeduction = netWeightInitial.minus(deductionSummary.totalDeductionWeight);
  const returnWeight = new Decimal(parsed.returnData.returnWeight);
  const netWeightFinal = netAfterDeduction.minus(returnWeight);

  if (netWeightFinal.lt(0)) {
    throw new Error("Net weight final must not be negative.");
  }

  const grossSalesAmount = netWeightFinal.mul(parsed.sellingPricePerKg);
  const totalSales = grossSalesAmount.minus(deductionSummary.totalDeductionAmount);

  if (totalSales.lt(0)) {
    throw new Error("Total penjualan akhir tidak boleh negatif.");
  }

  const margin = totalSales
    .minus(purchase.totalPurchase)
    .minus(purchase.totalOperationalCost);

  const sale = await createTbsSale({
    code: generateTransactionCode("TBS"),
    saleDate: new Date(parsed.saleDate),
    referencePurchaseId: parsed.referencePurchaseId,
    factoryId: parsed.factoryId,
    grossWeight: parsed.grossWeight.toFixed(2),
    tareWeight: parsed.tareWeight.toFixed(2),
    netWeightInitial: netWeightInitial.toFixed(2),
    totalDeduction: deductionSummary.totalDeductionWeight.toFixed(2),
    returnWeight: returnWeight.toFixed(2),
    netWeightFinal: netWeightFinal.toFixed(2),
    grossSalesAmount: grossSalesAmount.toFixed(2),
    totalDeductionAmount: deductionSummary.totalDeductionAmount.toFixed(2),
    sellingPricePerKg: parsed.sellingPricePerKg.toFixed(2),
    totalSales: totalSales.toFixed(2),
    margin: margin.toFixed(2),
    notes: parsed.notes || null,
    createdBy: actorId ?? null,
    paymentStatus: "unpaid",
    status: "active",
  });

  if (deductionSummary.items.length > 0) {
    await createTbsSaleDeductions(
      deductionSummary.items.map((item) => ({
        saleId: sale.id,
        configId: item.configId,
        type: item.type,
        label: item.label,
        inputMode: item.inputMode,
        inputValue: item.inputValue.toFixed(2),
        percentageValue: item.percentageValue.toFixed(4),
        weight: item.weight.toFixed(2),
        deductionAmount: item.deductionAmount.toFixed(2),
        sortOrder: item.sortOrder,
        notes: item.notes,
      })),
    );
  }

  if (parsed.returnData.returnWeight > 0) {
    await createTbsSaleReturns([
      {
        saleId: sale.id,
        returnWeight: parsed.returnData.returnWeight.toFixed(2),
        returnReason: parsed.returnData.returnReason,
        actionType: parsed.returnData.actionType,
        notes: parsed.returnData.notes || null,
      },
    ]);
  }

  await createReceivableEntry({
    sourceType: "tbs_sale",
    sourceId: sale.id,
    partyType: "factory",
    factoryId: sale.factoryId,
    amount: Number(sale.totalSales),
    notes: "Auto-generated from TBS sale",
    createdBy: actorId,
  });

  await logAudit({
    entityType: "tbs_sales",
    entityId: sale.id,
    action: "create",
    actorId,
    after: sale,
  });

  return sale;
}
