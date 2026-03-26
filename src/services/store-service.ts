import Decimal from "decimal.js";

import { storePurchaseSchema, storeSaleSchema } from "@/lib/validation/store";
import {
  createStorePurchase,
  createStorePurchaseItems,
  createStoreSale,
  createStoreSaleItems,
  getStorePurchaseById,
  getStoreSaleById,
  listStorePurchases,
  listStoreSaleItemsBySaleId,
  listStoreSales,
} from "@/repositories/store-repository";
import { logAudit } from "@/services/audit-service";
import { generateTransactionCode } from "@/services/code-service";
import { createPayableEntry, createReceivableEntry } from "@/services/finance-service";
import { applyStockMovement } from "@/services/inventory-service";

export async function getStorePurchaseList(limit = 20) {
  return listStorePurchases(limit);
}

export async function getStoreSaleList(limit = 20) {
  return listStoreSales(limit);
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
