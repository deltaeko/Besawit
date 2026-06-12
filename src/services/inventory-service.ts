import Decimal from "decimal.js";
import { and, eq, sql } from "drizzle-orm";

import { getDb, runInDbTransaction } from "@/lib/db/client";
import { stockBalances } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { stockAdjustmentSchema, stockTakeSchema } from "@/lib/validation/inventory";
import {
  createProduct,
  createStockAdjustment,
  createStockAdjustmentItems,
  createStockMovement,
  createStockTake,
  createStockTakeItems,
  getProductById,
  getProductByCode,
  getStockMovementById,
  getStockAdjustmentById,
  hasStockMovementHistory,
  hasStockMovementByReference,
  getStockBalance,
  getStockTakeById,
  listStockMovementsByReference,
  listStockAdjustmentsPage,
  listStockBalancesPage,
  listStockMovementsPage,
  listStockTakesPage,
  listStockAdjustmentItems,
  listStockAdjustments,
  listStockBalances,
  listStockMovements,
  listStockTakeItems,
  listStockTakes,
  summarizeStockAdjustments,
  summarizeStockBalances,
  summarizeStockTakes,
  updateStockTake,
  updateStockAdjustment,
  updateStockAdjustmentItem,
} from "@/repositories/inventory-repository";
import { logAudit } from "@/services/audit-service";
import { generateTransactionCode } from "@/services/code-service";
import { getMasterList } from "@/services/master-service";

const mutationReasonLabels: Record<string, string> = {
  correction: "Koreksi",
  damaged: "Rusak",
  lost: "Hilang",
  transfer: "Transfer",
  stock_take: "Opname",
  other: "Lainnya",
};

function getMutationReasonLabel(reason: string) {
  return mutationReasonLabels[reason] ?? reason;
}

export async function applyStockMovement(input: {
  warehouseId: string;
  productId: string;
  referenceType:
    | "store_purchase"
    | "store_sale"
    | "tbs_purchase"
    | "tbs_sale"
    | "stock_take"
    | "stock_adjustment"
    | "manual";
  referenceId?: string | null;
  movementType:
    | "purchase_in"
    | "sales_out"
    | "adjustment_in"
    | "adjustment_out"
    | "opening_balance"
    | "transfer_in"
    | "transfer_out";
  reason?: "correction" | "damaged" | "lost" | "transfer" | "stock_take" | "other";
  counterpartyWarehouseId?: string | null;
  quantity: number;
  unitCost: number;
  notes?: string;
  createdBy?: string | null;
}) {
  return runInDbTransaction(async () => {
    const db = await getDb();
    const product = await getProductById(input.productId);
    const qty = new Decimal(input.quantity);
    const direction = input.movementType.endsWith("_out") ? -1 : 1;

    await db.execute(sql`
      insert into stock_balances (warehouse_id, product_id, quantity, average_cost, updated_at)
      values (${input.warehouseId}, ${input.productId}, '0.00', '0.00', now())
      on conflict (warehouse_id, product_id) do nothing
    `);

    const lockedBalanceResult = await db.execute(sql`
      select
        quantity::text as quantity,
        average_cost::text as average_cost
      from stock_balances
      where warehouse_id = ${input.warehouseId}
        and product_id = ${input.productId}
      for update
    `);
    const lockedBalance = lockedBalanceResult.rows[0] as
      | {
          quantity?: string;
          average_cost?: string;
        }
      | undefined;
    const currentQty = new Decimal(lockedBalance?.quantity ?? "0");
    const currentAvgCost = new Decimal(lockedBalance?.average_cost ?? "0");
    const beforeQty = currentQty;
    const nextQty = currentQty.plus(qty.mul(direction));

    if (
      nextQty.isNegative() &&
      !env.ALLOW_NEGATIVE_STOCK &&
      !product?.allowNegativeStock
    ) {
      throw new Error("Stock cannot be negative.");
    }

    const unitCost =
      input.movementType === "sales_out"
        ? currentAvgCost.gt(0)
          ? currentAvgCost
          : new Decimal(product?.purchasePrice ?? input.unitCost)
        : new Decimal(input.unitCost);
    const totalValue = qty.mul(unitCost);

    const nextAvgCost =
      direction > 0 && nextQty.gt(0)
        ? currentQty.mul(currentAvgCost).plus(totalValue).div(nextQty)
        : currentAvgCost;

    await createStockMovement({
      warehouseId: input.warehouseId,
      productId: input.productId,
      referenceType: input.referenceType,
      referenceId: input.referenceId ?? null,
      movementType: input.movementType,
      reason: input.reason ?? "other",
      counterpartyWarehouseId: input.counterpartyWarehouseId ?? null,
      beforeQuantity: beforeQty.toFixed(2),
      quantity: qty.toFixed(2),
      afterQuantity: nextQty.toFixed(2),
      unitCost: unitCost.toFixed(2),
      totalValue: totalValue.toFixed(2),
      notes: input.notes ?? null,
      createdBy: input.createdBy ?? null,
    });

    await db
      .update(stockBalances)
      .set({
        quantity: nextQty.toFixed(2),
        averageCost: nextAvgCost.toFixed(2),
        lastMovementAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stockBalances.warehouseId, input.warehouseId),
          eq(stockBalances.productId, input.productId),
        ),
      );
  });
}

export async function getInventoryStockBalance(warehouseId: string, productId: string) {
  return getStockBalance(warehouseId, productId);
}

const TBS_POOL_PRODUCT_CODE = "SYS-TBS-POOL";

export async function ensureTbsPoolProduct() {
  const existing = await getProductByCode(TBS_POOL_PRODUCT_CODE);
  if (existing) return existing;

  return createProduct({
    code: TBS_POOL_PRODUCT_CODE,
    sku: null,
    name: "TBS Pool",
    unit: "kg",
    purchasePrice: "0.00",
    sellingPrice: "0.00",
    minStock: "0.00",
    allowNegativeStock: false,
    notes: "Produk internal sistem untuk pooled stock TBS.",
    isActive: false,
  });
}

export async function getInventoryStockFilterOptions() {
  const [warehouses, balances, tbsPoolProduct] = await Promise.all([
    getMasterList("warehouses", { status: "active", pageSize: 50 }).then((result) => result.items),
    listStockBalances(1000).catch(() => []),
    ensureTbsPoolProduct(),
  ]);

  const productMap = new Map<
    string,
    {
      id: string;
      name: string;
      unit: string;
      isSystem?: boolean;
    }
  >();

  for (const item of balances) {
    const productId = String((item as { productId: string }).productId);
    const productName = String((item as { productName?: string; productCode?: string }).productName ?? (item as { productCode?: string }).productCode ?? "-");
    const unit = String((item as { unit?: string }).unit ?? "");

    productMap.set(productId, {
      id: productId,
      name: productId === tbsPoolProduct.id ? "TBS Pool (Sistem)" : productName,
      unit,
      isSystem: productId === tbsPoolProduct.id,
    });
  }

  if (!productMap.has(tbsPoolProduct.id)) {
    productMap.set(tbsPoolProduct.id, {
      id: tbsPoolProduct.id,
      name: "TBS Pool (Sistem)",
      unit: String(tbsPoolProduct.unit ?? "kg"),
      isSystem: true,
    });
  }

  return {
    products: Array.from(productMap.values()).sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return a.name.localeCompare(b.name, "id");
    }),
    warehouses: warehouses.map((item) => ({
      id: String((item as { id: string }).id),
      name: String((item as { name: string }).name),
    })),
    tbsPoolProductId: tbsPoolProduct.id,
  };
}

export async function hasReferenceStockMovement(
  referenceType: "tbs_purchase" | "tbs_sale" | "store_purchase" | "store_sale" | "stock_take" | "stock_adjustment" | "payment" | "manual",
  referenceId: string,
) {
  return hasStockMovementByReference(referenceType, referenceId);
}

export async function reverseReferenceStockMovements(
  referenceType: "tbs_purchase" | "tbs_sale" | "store_purchase" | "store_sale" | "stock_take" | "stock_adjustment" | "manual",
  referenceId: string,
  actorId?: string | null,
  notes?: string,
) {
  const movements = await listStockMovementsByReference(referenceType, referenceId);

  for (const movement of movements) {
    const reversalMovementType =
      movement.movementType === "purchase_in" || movement.movementType === "adjustment_in" || movement.movementType === "transfer_in" || movement.movementType === "opening_balance"
        ? "adjustment_out"
        : "adjustment_in";

    await applyStockMovement({
      warehouseId: movement.warehouseId,
      productId: movement.productId,
      referenceType,
      referenceId,
      movementType: reversalMovementType,
      reason: "correction",
      counterpartyWarehouseId: movement.counterpartyWarehouseId,
      quantity: Number(movement.quantity),
      unitCost: Number(movement.unitCost),
      notes: notes ?? `Reversal movement untuk ${referenceType}`,
      createdBy: actorId,
    });
  }

  return movements.length;
}

export async function getReferenceStockReversalStatus(
  referenceType: "tbs_purchase" | "tbs_sale" | "store_purchase" | "store_sale" | "stock_take" | "stock_adjustment" | "manual",
  referenceId: string,
) {
  const movements = await listStockMovementsByReference(referenceType, referenceId);

  const requirements = new Map<
    string,
    {
      warehouseId: string;
      warehouseName: string;
      productId: string;
      productName: string;
      requiredQty: Decimal;
    }
  >();

  for (const movement of movements) {
    const reversalMovementType =
      movement.movementType === "purchase_in" ||
      movement.movementType === "adjustment_in" ||
      movement.movementType === "transfer_in" ||
      movement.movementType === "opening_balance"
        ? "adjustment_out"
        : "adjustment_in";

    if (!reversalMovementType.endsWith("_out")) continue;

    const key = `${movement.warehouseId}:${movement.productId}`;
    const requiredQty = new Decimal(requirements.get(key)?.requiredQty ?? 0).plus(movement.quantity);

    requirements.set(key, {
      warehouseId: movement.warehouseId,
      warehouseName: movement.warehouseName ?? "Gudang",
      productId: movement.productId,
      productName: movement.productName ?? movement.productCode ?? "Produk",
      requiredQty,
    });
  }

  const blockers: Array<{
    warehouseId: string;
    warehouseName: string;
    productId: string;
    productName: string;
    requiredQty: number;
    availableQty: number;
  }> = [];

  for (const requirement of requirements.values()) {
    const balance = await getStockBalance(requirement.warehouseId, requirement.productId);
    const availableQty = new Decimal(balance?.quantity ?? 0);

    if (availableQty.lt(requirement.requiredQty)) {
      blockers.push({
        warehouseId: requirement.warehouseId,
        warehouseName: requirement.warehouseName,
        productId: requirement.productId,
        productName: requirement.productName,
        requiredQty: Number(requirement.requiredQty.toFixed(2)),
        availableQty: Number(availableQty.toFixed(2)),
      });
    }
  }

  return {
    canReverse: blockers.length === 0,
    blockers,
    movementCount: movements.length,
  };
}

export async function getStockMovementList(
  limit = 50,
  filters?: {
    productId?: string;
    warehouseId?: string;
  },
) {
  return listStockMovements(limit, filters);
}

export async function getStockMovementDetail(movementId: string) {
  return getStockMovementById(movementId);
}

export async function getStockBalanceList(limit = 100) {
  return listStockBalances(limit);
}

export async function getStockBalancePage(
  page = 1,
  pageSize = 20,
  filters?: {
    productId?: string;
    warehouseId?: string;
    lowStockOnly?: boolean;
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listStockBalancesPage(safePage, safePageSize, filters);

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

export async function getStockBalanceSummary() {
  return summarizeStockBalances();
}

export async function getStockTakeList(limit = 50) {
  return listStockTakes(limit);
}

export async function getStockTakePage(
  page = 1,
  pageSize = 20,
  filters?: {
    warehouseId?: string;
    status?: "draft" | "submitted" | "approved" | "rejected" | "cancelled";
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listStockTakesPage(safePage, safePageSize, filters);

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

export async function getStockTakeSummary() {
  return summarizeStockTakes();
}

export async function getStockAdjustmentList(limit = 50) {
  return listStockAdjustments(limit);
}

export async function getStockAdjustmentPage(
  page = 1,
  pageSize = 20,
  filters?: {
    warehouseId?: string;
    status?: "pending" | "approved" | "cancelled";
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listStockAdjustmentsPage(safePage, safePageSize, filters);

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

export async function getStockAdjustmentSummary() {
  return summarizeStockAdjustments();
}

export async function getStockMovementPage(
  page = 1,
  pageSize = 20,
  filters?: {
    productId?: string;
    warehouseId?: string;
    reason?: "correction" | "damaged" | "lost" | "transfer" | "stock_take" | "other";
    dateFrom?: string;
    dateTo?: string;
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listStockMovementsPage(safePage, safePageSize, {
    productId: filters?.productId,
    warehouseId: filters?.warehouseId,
    reason: filters?.reason,
    dateFrom: filters?.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : undefined,
    dateTo: filters?.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
  });

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

export async function getInventoryAdjustmentFormOptions() {
  const [warehouses, products, balances] = await Promise.all([
    getMasterList("warehouses", { status: "active", pageSize: 50 }).then((result) => result.items),
    getMasterList("products", { status: "active", pageSize: 50 }).then((result) => result.items),
    listStockBalances(500).catch(() => []),
  ]);

  return {
    warehouses: warehouses.map((item) => ({
      id: String((item as { id: string }).id),
      name: String((item as { name: string }).name),
    })),
    products: products.map((item) => ({
      id: String((item as { id: string }).id),
      name: String((item as { name: string }).name),
      unit: String((item as { unit?: string }).unit ?? ""),
    })),
    balances: balances.map((item) => ({
      warehouseId: String((item as { warehouseId: string }).warehouseId),
      productId: String((item as { productId: string }).productId),
      quantity: Number((item as { quantity: string | number }).quantity ?? 0),
    })),
    reasons: Object.entries(mutationReasonLabels).map(([value, label]) => ({
      value,
      label,
    })),
  };
}

export async function submitStockTake(payload: unknown, actorId?: string | null) {
  const parsed = stockTakeSchema.parse(payload);
  const code = generateTransactionCode("STK");

  const stockTake = await createStockTake({
    code,
    warehouseId: parsed.warehouseId,
    stockDate: new Date(parsed.stockDate),
    status: "submitted",
    notes: parsed.notes || null,
    createdBy: actorId ?? null,
    varianceValue: parsed.items
      .reduce((total, item) => {
        const variance = item.physicalQty - item.systemQty;
        return total + variance * item.unitCost;
      }, 0)
      .toFixed(2),
  });

  await createStockTakeItems(
    parsed.items.map((item) => ({
      stockTakeId: stockTake.id,
      productId: item.productId,
      systemQty: item.systemQty.toFixed(2),
      physicalQty: item.physicalQty.toFixed(2),
      varianceQty: (item.physicalQty - item.systemQty).toFixed(2),
      unitCost: item.unitCost.toFixed(2),
      varianceValue: (
        (item.physicalQty - item.systemQty) *
        item.unitCost
      ).toFixed(2),
      notes: item.notes || null,
    })),
  );

  await logAudit({
    entityType: "stock_takes",
    entityId: stockTake.id,
    action: "submit",
    actorId,
    after: stockTake,
  });

  return stockTake;
}

export async function getStockTakeDetail(stockTakeId: string) {
  return getStockTakeById(stockTakeId);
}

export async function approveStockTake(stockTakeId: string, actorId?: string | null) {
  const stockTake = await getStockTakeById(stockTakeId);
  if (!stockTake) throw new Error("Stock take not found.");
  if (stockTake.status !== "submitted") {
    throw new Error("Only submitted stock takes can be approved.");
  }

  const items = await listStockTakeItems(stockTakeId);
  const adjustment = await createStockAdjustment({
    code: generateTransactionCode("ADJ"),
    warehouseId: stockTake.warehouseId,
    stockTakeId: stockTake.id,
    status: "approved",
    reason: "stock_take",
    totalVarianceValue: stockTake.varianceValue,
    notes: "Generated from approved stock take",
    createdBy: stockTake.createdBy,
    approvedBy: actorId ?? null,
    approvedAt: new Date(),
  });

  await createStockAdjustmentItems(
    items.map((item) => {
      const beforeQty = Number(item.systemQty);
      const afterQty = Number(item.physicalQty);
      return {
        adjustmentId: adjustment.id,
        productId: item.productId,
        adjustmentType:
          Number(item.varianceQty) >= 0 ? "adjustment_in" : "adjustment_out",
        reason: "stock_take",
        systemQty: item.systemQty,
        physicalQty: item.physicalQty,
        beforeQty: beforeQty.toFixed(2),
        afterQty: afterQty.toFixed(2),
        adjustmentQty: item.varianceQty,
        unitCost: item.unitCost,
        varianceValue: item.varianceValue,
      };
    }),
  );

  for (const item of items) {
    await applyStockMovement({
      warehouseId: stockTake.warehouseId,
      productId: item.productId,
      referenceType: "stock_adjustment",
      referenceId: adjustment.id,
      movementType:
        Number(item.varianceQty) >= 0 ? "adjustment_in" : "adjustment_out",
      reason: "stock_take",
      quantity: Math.abs(Number(item.varianceQty)),
      unitCost: Number(item.unitCost),
      notes: "Adjustment dari approval stock take",
      createdBy: actorId,
    });
  }

  const approved = await updateStockTake(stockTake.id, {
    status: "approved",
    approvedBy: actorId ?? null,
    approvedAt: new Date(),
  });

  await logAudit({
    entityType: "stock_takes",
    entityId: stockTake.id,
    action: "approve",
    actorId,
    after: approved,
    metadata: { adjustmentId: adjustment.id },
  });

  return { stockTake: approved, adjustment };
}

export async function createManualStockAdjustment(payload: unknown, actorId?: string | null) {
  const parsed = stockAdjustmentSchema.parse(payload);
  const product = await getProductById(parsed.productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan.");
  }

  const currentBalance = await getStockBalance(parsed.warehouseId, parsed.productId);
  const beforeQty = new Decimal(currentBalance?.quantity ?? "0");
  const quantity = new Decimal(parsed.quantity);
  const unitCost = new Decimal(parsed.unitCost || product.purchasePrice || 0);

  const isTransfer = parsed.mode === "transfer";
  const isOpeningBalance = parsed.mode === "opening_balance";
  const movementType =
    parsed.mode === "opening_balance"
      ? "opening_balance"
      : parsed.mode === "adjustment_in"
      ? "adjustment_in"
      : parsed.mode === "adjustment_out"
        ? "adjustment_out"
        : "transfer_out";
  const direction = movementType.endsWith("_out") ? -1 : 1;
  const afterQty = isOpeningBalance ? quantity : beforeQty.plus(quantity.mul(direction));

  if (isOpeningBalance) {
    const hasHistory = await hasStockMovementHistory(parsed.warehouseId, parsed.productId);
    if (hasHistory || beforeQty.gt(0)) {
      throw new Error("Opening balance hanya boleh dibuat untuk produk yang belum memiliki histori stok di gudang ini.");
    }
  }

  if (afterQty.isNegative() && !env.ALLOW_NEGATIVE_STOCK && !product.allowNegativeStock) {
    throw new Error("Stok tidak boleh negatif.");
  }

  const signedVarianceValue = isOpeningBalance
    ? quantity.mul(unitCost)
    : quantity.mul(unitCost).mul(direction);
  const adjustment = await createStockAdjustment({
    code: generateTransactionCode("ADJ"),
    warehouseId: parsed.warehouseId,
    targetWarehouseId: parsed.targetWarehouseId || null,
    stockTakeId: null,
    status: isOpeningBalance ? "approved" : "pending",
    reason: parsed.reason,
    totalVarianceValue: signedVarianceValue.toFixed(2),
    notes: parsed.notes || null,
    createdBy: actorId ?? null,
    approvedBy: isOpeningBalance ? actorId ?? null : null,
    approvedAt: isOpeningBalance ? new Date() : null,
  });

  await createStockAdjustmentItems([
    {
      adjustmentId: adjustment.id,
      productId: parsed.productId,
      adjustmentType: movementType,
      reason: parsed.reason,
      systemQty: beforeQty.toFixed(2),
      physicalQty: afterQty.toFixed(2),
      beforeQty: beforeQty.toFixed(2),
      afterQty: afterQty.toFixed(2),
      adjustmentQty: quantity.toFixed(2),
      unitCost: unitCost.toFixed(2),
      varianceValue: signedVarianceValue.toFixed(2),
    },
  ]);

  if (isOpeningBalance) {
    await applyStockMovement({
      warehouseId: parsed.warehouseId,
      productId: parsed.productId,
      referenceType: "stock_adjustment",
      referenceId: adjustment.id,
      movementType,
      reason: parsed.reason,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      counterpartyWarehouseId: parsed.targetWarehouseId || null,
      notes:
        parsed.notes ||
        "Saldo awal inventory",
      createdBy: actorId,
    });
  }

  if (isTransfer && parsed.targetWarehouseId) {
    const targetBalance = await getStockBalance(parsed.targetWarehouseId, parsed.productId);
    const targetBeforeQty = new Decimal(targetBalance?.quantity ?? "0");
    const targetAfterQty = targetBeforeQty.plus(quantity);

    await createStockAdjustmentItems([
      {
        adjustmentId: adjustment.id,
        productId: parsed.productId,
        adjustmentType: "transfer_in",
        reason: "transfer",
        systemQty: targetBeforeQty.toFixed(2),
        physicalQty: targetAfterQty.toFixed(2),
        beforeQty: targetBeforeQty.toFixed(2),
        afterQty: targetAfterQty.toFixed(2),
        adjustmentQty: quantity.toFixed(2),
        unitCost: unitCost.toFixed(2),
        varianceValue: quantity.mul(unitCost).toFixed(2),
      },
    ]);

    if (isOpeningBalance) {
      await applyStockMovement({
        warehouseId: parsed.targetWarehouseId,
        productId: parsed.productId,
        referenceType: "stock_adjustment",
        referenceId: adjustment.id,
        movementType: "transfer_in",
        reason: "transfer",
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        counterpartyWarehouseId: parsed.warehouseId,
        notes: parsed.notes || "Transfer masuk dari gudang asal",
        createdBy: actorId,
      });
    }
  }

  await logAudit({
    entityType: "stock_adjustments",
    entityId: adjustment.id,
    action: "create_manual_adjustment",
    actorId,
    after: adjustment,
    metadata: {
      reason: parsed.reason,
      mode: parsed.mode,
      productId: parsed.productId,
      warehouseId: parsed.warehouseId,
      targetWarehouseId: parsed.targetWarehouseId || null,
    },
  });

  return adjustment;
}

export async function approveManualStockAdjustment(adjustmentId: string, actorId?: string | null) {
  const adjustment = await getStockAdjustmentById(adjustmentId);
  if (!adjustment) {
    throw new Error("Adjustment tidak ditemukan.");
  }
  if (adjustment.status !== "pending") {
    throw new Error("Hanya adjustment pending yang bisa di-approve.");
  }

  const items = await listStockAdjustmentItems(adjustmentId);
  if (!items.length) {
    throw new Error("Adjustment tidak memiliki item.");
  }

  let totalVarianceValue = new Decimal(0);

  for (const item of items) {
    const warehouseId =
      item.adjustmentType === "transfer_in"
        ? adjustment.targetWarehouseId
        : adjustment.warehouseId;

    if (!warehouseId) {
      throw new Error("Gudang adjustment tidak lengkap.");
    }

    const currentBalance = await getStockBalance(warehouseId, item.productId);
    const beforeQty = new Decimal(currentBalance?.quantity ?? "0");
    const quantity = new Decimal(item.adjustmentQty);
    const unitCost = new Decimal(item.unitCost);
    const direction = item.adjustmentType.endsWith("_out") ? -1 : 1;
    const afterQty = beforeQty.plus(quantity.mul(direction));

    if (afterQty.isNegative() && !env.ALLOW_NEGATIVE_STOCK) {
      const product = await getProductById(item.productId);
      if (!product?.allowNegativeStock) {
        throw new Error("Approval adjustment gagal karena stok akan menjadi negatif.");
      }
    }

    const varianceValue =
      item.adjustmentType === "opening_balance"
        ? quantity.mul(unitCost)
        : quantity.mul(unitCost).mul(direction);

    await updateStockAdjustmentItem(item.id, {
      systemQty: beforeQty.toFixed(2),
      physicalQty: afterQty.toFixed(2),
      beforeQty: beforeQty.toFixed(2),
      afterQty: afterQty.toFixed(2),
      varianceValue: varianceValue.toFixed(2),
    });

    await applyStockMovement({
      warehouseId,
      productId: item.productId,
      referenceType: "stock_adjustment",
      referenceId: adjustment.id,
      movementType: item.adjustmentType,
      reason: item.reason,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      counterpartyWarehouseId:
        item.adjustmentType === "transfer_in"
          ? adjustment.warehouseId
          : adjustment.targetWarehouseId,
      notes:
        adjustment.notes ||
        (item.adjustmentType === "transfer_in"
          ? "Transfer masuk dari gudang asal"
          : `${getMutationReasonLabel(item.reason)} - mutasi manual`),
      createdBy: actorId,
    });

    totalVarianceValue = totalVarianceValue.plus(varianceValue);
  }

  const approved = await updateStockAdjustment(adjustment.id, {
    status: "approved",
    totalVarianceValue: totalVarianceValue.toFixed(2),
    approvedBy: actorId ?? null,
    approvedAt: new Date(),
  });

  await logAudit({
    entityType: "stock_adjustments",
    entityId: adjustment.id,
    action: "approve_manual_adjustment",
    actorId,
    after: approved,
  });

  return approved;
}

export async function getStockAdjustmentDetail(adjustmentId: string) {
  const adjustments = await listStockAdjustments(200);
  const adjustment = adjustments.find((item) => item.id === adjustmentId) ?? null;
  if (!adjustment) return null;

  const items = await listStockAdjustmentItems(adjustmentId);
  return {
    adjustment,
    items,
  };
}

export async function getStockAdjustmentByStockTake(stockTakeId: string) {
  const adjustments = await listStockAdjustments(200);
  const adjustment = adjustments.find((item) => item.stockTakeId === stockTakeId) ?? null;
  if (!adjustment) return null;

  const items = await listStockAdjustmentItems(adjustment.id);
  return {
    adjustment,
    items,
  };
}
