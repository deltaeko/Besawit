import Decimal from "decimal.js";

import {
  storePurchaseReturnSchema,
  storePurchaseSchema,
  storeSaleSchema,
} from "@/lib/validation/store";
import {
  createStorePurchase,
  createStorePurchaseItems,
  createStorePurchaseReturn,
  createStorePurchaseReturnItems,
  createStoreSale,
  createStoreSaleItems,
  getStorePurchaseById,
  getStorePurchaseReturnById,
  getStoreSaleById,
  listAllStorePurchases,
  listAllStoreSales,
  listStorePurchaseItemsByPurchaseId,
  listStorePurchaseReturnItemsByPurchaseId,
  listStorePurchaseReturnItemsByReturnId,
  listStorePurchaseReturnsByPurchaseId,
  listStorePurchases,
  listStorePurchasesPage,
  listStoreSaleItemsBySaleId,
  listStoreSales,
  listStoreSalesPage,
  updateStorePurchase,
} from "@/repositories/store-repository";
import { logAudit } from "@/services/audit-service";
import { generateTransactionCode } from "@/services/code-service";
import {
  cancelPayableBySource,
  createPayableEntry,
  createReceivableEntry,
  getPayableByReference,
  syncPayableAmountBySource,
} from "@/services/finance-service";
import {
  applyStockMovement,
  getReferenceStockReversalStatus,
  hasReferenceStockMovement,
  reverseReferenceStockMovements,
} from "@/services/inventory-service";

function appendVoidNote(existingNotes?: string | null) {
  const prefix = existingNotes?.trim() ? `${existingNotes.trim()}\n\n` : "";
  return `${prefix}VOID: transaksi dibatalkan dan dibalikkan oleh sistem.`;
}

export async function getStorePurchaseList(limit = 20) {
  return listStorePurchases(limit);
}

export async function getStoreSaleList(limit = 20) {
  return listStoreSales(limit);
}

function toStartOfDay(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toEndOfDay(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function getStorePurchasePage(
  page = 1,
  pageSize = 20,
  filters?: {
    q?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 50) : 20;
  const result = await listStorePurchasesPage(safePage, safePageSize, {
    q: filters?.q?.trim() || undefined,
    paymentStatus: filters?.paymentStatus || undefined,
    dateFrom: toStartOfDay(filters?.dateFrom),
    dateTo: toEndOfDay(filters?.dateTo),
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

export async function getStoreSalePage(
  page = 1,
  pageSize = 20,
  filters?: {
    q?: string;
    paymentStatus?: string;
    saleType?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 50) : 20;
  const result = await listStoreSalesPage(safePage, safePageSize, {
    q: filters?.q?.trim() || undefined,
    paymentStatus: filters?.paymentStatus || undefined,
    saleType: filters?.saleType || undefined,
    dateFrom: toStartOfDay(filters?.dateFrom),
    dateTo: toEndOfDay(filters?.dateTo),
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

export async function getAllStorePurchaseList() {
  return listAllStorePurchases();
}

export async function getAllStoreSaleList() {
  return listAllStoreSales();
}

export async function getStorePurchase(id: string) {
  return getStorePurchaseById(id);
}

export async function getStoreSale(id: string) {
  return getStoreSaleById(id);
}

export async function getStoreSaleInvoice(id: string) {
  const sale = await getStoreSaleById(id);
  if (!sale) return null;

  const items = await listStoreSaleItemsBySaleId(id);

  return {
    sale,
    items,
  };
}

export async function getStorePurchaseInvoice(id: string) {
  const purchase = await getStorePurchaseById(id);
  if (!purchase) return null;

  const items = await listStorePurchaseItemsByPurchaseId(id);

  return {
    purchase,
    items,
  };
}

export async function getStorePurchaseReturnDocument(id: string) {
  const storeReturn = await getStorePurchaseReturnById(id);
  if (!storeReturn) return null;

  const items = await listStorePurchaseReturnItemsByReturnId(id);

  return {
    storeReturn,
    items,
  };
}

export async function getStorePurchaseReturnFormData(id: string) {
  const purchase = await getStorePurchaseById(id);
  if (!purchase) return null;

  const [items, returns, returnItems, payable] = await Promise.all([
    listStorePurchaseItemsByPurchaseId(id),
    listStorePurchaseReturnsByPurchaseId(id),
    listStorePurchaseReturnItemsByPurchaseId(id),
    getPayableByReference("store_purchase", id).catch(() => null),
  ]);

  const returnedByPurchaseItemId = new Map<string, Decimal>();
  for (const item of returnItems) {
    const current = returnedByPurchaseItemId.get(item.purchaseItemId) ?? new Decimal(0);
    returnedByPurchaseItemId.set(item.purchaseItemId, current.plus(item.quantity));
  }

  const enrichedItems = items.map((item) => {
    const purchasedQty = new Decimal(item.quantity);
    const returnedQty = returnedByPurchaseItemId.get(item.id) ?? new Decimal(0);
    const availableQty = Decimal.max(purchasedQty.minus(returnedQty), 0);

    return {
      ...item,
      purchasedQty: purchasedQty.toFixed(2),
      returnedQty: returnedQty.toFixed(2),
      availableQty: availableQty.toFixed(2),
    };
  });

  const totalReturnedAmount = returns.reduce(
    (total, item) => total.plus(item.totalReturnAmount),
    new Decimal(0),
  );

  return {
    purchase,
    payable,
    items: enrichedItems,
    returns,
    summary: {
      totalReturnedAmount: totalReturnedAmount.toFixed(2),
      returnCount: returns.length,
      hasReturnableItems: enrichedItems.some((item) => new Decimal(item.availableQty).gt(0)),
    },
  };
}

export async function createStorePurchaseTx(
  payload: unknown,
  actorId?: string | null,
) {
  const parsed = storePurchaseSchema.parse(payload);
  const subtotal = parsed.items.reduce(
    (total, item) => total.plus(new Decimal(item.quantity).mul(item.unitPrice)),
    new Decimal(0),
  );
  const totalAmount = subtotal.minus(parsed.discount).plus(parsed.tax);

  const purchase = await createStorePurchase({
    code: generateTransactionCode("SPB"),
    transactionDate: new Date(parsed.transactionDate),
    supplierId: parsed.supplierId,
    warehouseId: parsed.warehouseId,
    invoiceNumber: parsed.invoiceNumber || null,
    subtotal: subtotal.toFixed(2),
    discount: parsed.discount.toFixed(2),
    tax: parsed.tax.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    paymentStatus: "unpaid",
    notes: parsed.notes || null,
    createdBy: actorId ?? null,
    status: "active",
  });

  await createStorePurchaseItems(
    parsed.items.map((item) => ({
      purchaseId: purchase.id,
      productId: item.productId,
      quantity: item.quantity.toFixed(2),
      unitCost: item.unitPrice.toFixed(2),
      lineTotal: new Decimal(item.quantity).mul(item.unitPrice).toFixed(2),
    })),
  );

  for (const item of parsed.items) {
    await applyStockMovement({
      warehouseId: parsed.warehouseId,
      productId: item.productId,
      referenceType: "store_purchase",
      referenceId: purchase.id,
      movementType: "purchase_in",
      quantity: item.quantity,
      unitCost: item.unitPrice,
      notes: "Generated from store purchase",
      createdBy: actorId,
    });
  }

  await createPayableEntry({
    sourceType: "store_purchase",
    sourceId: purchase.id,
    partyType: "supplier",
    supplierId: purchase.supplierId,
    amount: Number(purchase.totalAmount),
    notes: "Auto-generated from store purchase",
    createdBy: actorId,
  });

  await logAudit({
    entityType: "store_purchases",
    entityId: purchase.id,
    action: "create",
    actorId,
    after: purchase,
  });

  return purchase;
}

export async function createStoreSaleTx(payload: unknown, actorId?: string | null) {
  const parsed = storeSaleSchema.parse(payload);
  const subtotal = parsed.items.reduce(
    (total, item) => total.plus(new Decimal(item.quantity).mul(item.unitPrice)),
    new Decimal(0),
  );
  const totalAmount = subtotal.minus(parsed.discount).plus(parsed.tax);

  const sale = await createStoreSale({
    code: generateTransactionCode("SLS"),
    transactionDate: new Date(parsed.transactionDate),
    customerId: parsed.customerId || null,
    warehouseId: parsed.warehouseId,
    invoiceNumber: parsed.invoiceNumber || null,
    saleType: parsed.saleType,
    subtotal: subtotal.toFixed(2),
    discount: parsed.discount.toFixed(2),
    tax: parsed.tax.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    paymentStatus: parsed.saleType === "cash" ? "paid" : "unpaid",
    notes: parsed.notes || null,
    createdBy: actorId ?? null,
    status: "active",
  });

  await createStoreSaleItems(
    parsed.items.map((item) => ({
      saleId: sale.id,
      productId: item.productId,
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: new Decimal(item.quantity).mul(item.unitPrice).toFixed(2),
    })),
  );

  for (const item of parsed.items) {
    await applyStockMovement({
      warehouseId: parsed.warehouseId,
      productId: item.productId,
      referenceType: "store_sale",
      referenceId: sale.id,
      movementType: "sales_out",
      quantity: item.quantity,
      unitCost: item.unitPrice,
      notes: "Generated from store sale",
      createdBy: actorId,
    });
  }

  if (parsed.saleType === "credit") {
    await createReceivableEntry({
      sourceType: "store_sale",
      sourceId: sale.id,
      partyType: "customer",
      customerId: sale.customerId || undefined,
      amount: Number(sale.totalAmount),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      notes: "Auto-generated from store sale",
      createdBy: actorId,
    });
  }

  await logAudit({
    entityType: "store_sales",
    entityId: sale.id,
    action: "create",
    actorId,
    after: sale,
  });

  return sale;
}

export async function voidStorePurchase(id: string, actorId?: string | null) {
  const existing = await getStorePurchaseById(id);
  if (!existing) {
    throw new Error("Transaksi pembelian barang tidak ditemukan.");
  }

  if (existing.status !== "active") {
    throw new Error("Hanya transaksi pembelian barang aktif yang bisa dibatalkan.");
  }

  const payable = await getPayableByReference("store_purchase", id);
  if (payable && new Decimal(payable.paidAmount).gt(0)) {
    throw new Error("Pembelian yang sudah memiliki pembayaran tidak bisa dibatalkan otomatis.");
  }

  const reversalStatus = await getReferenceStockReversalStatus("store_purchase", id);
  if (!reversalStatus.canReverse) {
    const blocker = reversalStatus.blockers[0];
    throw new Error(
      `Pembelian barang ini tidak bisa dibatalkan karena saldo stok ${blocker.productName} di ${blocker.warehouseName} tinggal ${blocker.availableQty.toFixed(2)}, sedangkan reversal membutuhkan ${blocker.requiredQty.toFixed(2)}.`,
    );
  }

  if (await hasReferenceStockMovement("store_purchase", id)) {
    await reverseReferenceStockMovements(
      "store_purchase",
      id,
      actorId,
      "Reversal stok dari pembatalan pembelian barang.",
    );
  }

  await cancelPayableBySource("store_purchase", id);

  const updated = await updateStorePurchase(id, {
    status: "void",
    paymentStatus: "cancelled",
    notes: appendVoidNote(existing.notes),
    updatedAt: new Date(),
  });

  await logAudit({
    entityType: "store_purchases",
    entityId: id,
    action: "void",
    actorId,
    before: existing,
    after: updated ?? existing,
  });

  return updated ?? existing;
}

export async function createStorePurchaseReturnTx(
  purchaseId: string,
  payload: unknown,
  actorId?: string | null,
) {
  const parsed = storePurchaseReturnSchema.parse(payload);
  const context = await getStorePurchaseReturnFormData(purchaseId);

  if (!context) {
    throw new Error("Pembelian barang tidak ditemukan.");
  }

  if (context.purchase.status !== "active") {
    throw new Error("Retur hanya bisa dibuat dari pembelian barang yang masih aktif.");
  }

  if (!context.payable) {
    throw new Error("Referensi hutang pembelian tidak ditemukan.");
  }

  if (new Decimal(context.payable.paidAmount).gt(0)) {
    throw new Error("Retur pembelian belum didukung untuk pembelian yang sudah memiliki pembayaran.");
  }

  const itemMap = new Map(context.items.map((item) => [item.id, item]));
  const selectedItems = parsed.items.filter((item) => item.quantity > 0);
  const returnRows: Array<{
    purchaseItemId: string;
    productId: string;
    quantity: Decimal;
    unitCost: Decimal;
    lineTotal: Decimal;
    productName: string;
  }> = [];

  for (const selected of selectedItems) {
    const purchaseItem = itemMap.get(selected.purchaseItemId);
    if (!purchaseItem) {
      throw new Error("Item pembelian yang dipilih untuk retur tidak ditemukan.");
    }

    const availableQty = new Decimal(purchaseItem.availableQty);
    const returnQty = new Decimal(selected.quantity);

    if (returnQty.lte(0)) continue;

    if (returnQty.gt(availableQty)) {
      throw new Error(`Qty retur untuk ${purchaseItem.productName} melebihi sisa qty yang tersedia.`);
    }

    const unitCost = new Decimal(purchaseItem.unitCost);
    returnRows.push({
      purchaseItemId: purchaseItem.id,
      productId: purchaseItem.productId,
      quantity: returnQty,
      unitCost,
      lineTotal: returnQty.mul(unitCost),
      productName: purchaseItem.productName ?? purchaseItem.productCode ?? "Produk",
    });
  }

  if (!returnRows.length) {
    throw new Error("Minimal satu item retur harus memiliki qty lebih dari 0.");
  }

  const totalReturnAmount = returnRows.reduce(
    (total, item) => total.plus(item.lineTotal),
    new Decimal(0),
  );
  const currentPayableAmount = new Decimal(context.payable.amount);

  if (totalReturnAmount.gt(currentPayableAmount)) {
    throw new Error("Nilai retur melebihi sisa nilai hutang pembelian yang bisa dikurangi.");
  }

  const returnCode = generateTransactionCode("RTB");

  const storeReturn = await createStorePurchaseReturn({
    code: returnCode,
    purchaseId,
    returnDate: new Date(parsed.returnDate),
    totalReturnAmount: totalReturnAmount.toFixed(2),
    notes: parsed.notes || null,
    createdBy: actorId ?? null,
    status: "active",
  });

  const createdItems = await createStorePurchaseReturnItems(
    returnRows.map((item) => ({
      returnId: storeReturn.id,
      purchaseItemId: item.purchaseItemId,
      productId: item.productId,
      quantity: item.quantity.toFixed(2),
      unitCost: item.unitCost.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    })),
  );

  for (const item of returnRows) {
    await applyStockMovement({
      warehouseId: context.purchase.warehouseId,
      productId: item.productId,
      referenceType: "store_purchase",
      referenceId: purchaseId,
      movementType: "sales_out",
      reason: "correction",
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      notes: `Generated from store purchase return ${returnCode}`,
      createdBy: actorId,
    });
  }

  const nextPayableAmount = Decimal.max(currentPayableAmount.minus(totalReturnAmount), 0);
  const updatedPayable = await syncPayableAmountBySource(
    "store_purchase",
    purchaseId,
    nextPayableAmount,
  );

  await logAudit({
    entityType: "store_purchase_returns",
    entityId: storeReturn.id,
    action: "create",
    actorId,
    after: {
      header: storeReturn,
      items: createdItems,
      payable: updatedPayable,
    },
  });

  return {
    return: storeReturn,
    items: createdItems,
  };
}
