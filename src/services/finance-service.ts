import Decimal from "decimal.js";

import { paymentSchema } from "@/lib/validation/finance";
import { updateTbsPurchase, updateTbsSale } from "@/repositories/palm-repository";
import { updateStorePurchase, updateStoreSale } from "@/repositories/store-repository";
import {
  createCashTransaction,
  createPayable,
  createPayment,
  createReceivable,
  createTbsPurchaseStoreOffset,
  createTbsPurchaseStoreOffsetItems,
  deleteTbsPurchaseStoreOffsetByPurchaseId,
  deleteTbsPurchaseStoreOffsetItemsByOffsetId,
  getPayableById,
  getPayableDetailById,
  getPayableAgingSummary,
  getPaymentDetailById,
  getPayableBySource,
  getReceivableById,
  getReceivableAgingSummary,
  getReceivableDetailById,
  getReceivableBySource,
  getTbsPurchaseStoreOffsetByPurchaseId,
  listCashTransactions,
  listCashTransactionsPage,
  listFactoryPayments,
  listFactoryReceivables,
  listFarmerPayables,
  listFarmerPayments,
  listFarmerStoreOffsets,
  listPayments,
  listPaymentsPage,
  listPaymentsByPayableId,
  listPaymentsByReceivableId,
  listPayablesPage,
  listPayables,
  listReceivablesPage,
  listReceivables,
  listOutstandingPayables,
  listOutstandingReceivables,
  listOutstandingStoreReceivablesByFarmer,
  listStoreReceivablesByFarmer,
  listStoreDebtOffsets,
  listStoreReceivableSummariesByFarmerIds,
  listTbsPurchaseStoreOffsetItemsByOffsetId,
  updatePayable,
  updateReceivable,
} from "@/repositories/finance-repository";
import { logAudit } from "@/services/audit-service";
import { generateTransactionCode } from "@/services/code-service";

function resolvePaymentStatus(amount: Decimal, paidAmount: Decimal) {
  if (amount.lte(0)) return "paid";
  if (paidAmount.lte(0)) return "unpaid";
  if (paidAmount.gte(amount)) return "paid";
  return "partial";
}

function resolveLedgerCategory(
  direction: "in" | "out",
  method: "cash" | "bank_transfer" | "giro" | "other",
) {
  const sourceLabel = method === "cash" ? "Kas" : "Bank";
  return direction === "out" ? `${sourceLabel} Keluar` : `${sourceLabel} Masuk`;
}

function resolveLedgerDescription(
  direction: "in" | "out",
  method: "cash" | "bank_transfer" | "giro" | "other",
  referenceCode: string,
  partyLabel: string,
  notes?: string | null,
) {
  const base =
    direction === "out"
      ? `${method === "cash" ? "Pembayaran tunai" : "Pembayaran via bank"} untuk ${partyLabel}`
      : `${method === "cash" ? "Penerimaan tunai" : "Penerimaan via bank"} dari ${partyLabel}`;

  return notes?.trim() ? `${base} (${referenceCode}) - ${notes.trim()}` : `${base} (${referenceCode})`;
}

async function syncSourcePaymentStatus(
  sourceType: "tbs_purchase" | "tbs_sale" | "store_purchase" | "store_sale" | "manual",
  sourceId: string | null | undefined,
  status: "unpaid" | "partial" | "paid",
) {
  if (!sourceId) return;

  switch (sourceType) {
    case "tbs_purchase":
      await updateTbsPurchase(sourceId, { paymentStatus: status, updatedAt: new Date() });
      return;
    case "tbs_sale":
      await updateTbsSale(sourceId, { paymentStatus: status, updatedAt: new Date() });
      return;
    case "store_purchase":
      await updateStorePurchase(sourceId, {
        paymentStatus: status,
        updatedAt: new Date(),
      });
      return;
    case "store_sale":
      await updateStoreSale(sourceId, { paymentStatus: status, updatedAt: new Date() });
      return;
    default:
      return;
  }
}

export type FarmerStoreReceivableSummary = {
  farmerId: string;
  receivableCount: number;
  totalOutstanding: number;
  nearestDueDate: Date | null;
};

type StoreDebtDeductionInput = {
  mode: "none" | "value" | "percentage";
  value?: number;
  percentage?: number;
  notes?: string | null;
};

type StoreDebtOffsetPlan = {
  inputMode: "value" | "percentage";
  baseAmount: Decimal;
  inputAmount: Decimal;
  inputPercentage: Decimal | null;
  requestedAmount: Decimal;
  appliedAmount: Decimal;
  notes: string | null;
  allocations: Array<{
    receivableId: string;
    customerId: string | null;
    appliedAmount: Decimal;
    sortOrder: number;
  }>;
};

function toNullableNote(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function getFarmerStoreReceivableSummary(
  farmerId: string,
): Promise<FarmerStoreReceivableSummary> {
  const receivables = await listOutstandingStoreReceivablesByFarmer(farmerId);
  const totalOutstanding = receivables.reduce(
    (total, item) => total.plus(item.outstandingAmount),
    new Decimal(0),
  );

  return {
    farmerId,
    receivableCount: receivables.length,
    totalOutstanding: Number(totalOutstanding.toFixed(2)),
    nearestDueDate: receivables[0]?.dueDate ?? null,
  };
}

export async function getFarmerStoreReceivableSummaryMap(farmerIds: string[]) {
  if (!farmerIds.length) return {} as Record<string, FarmerStoreReceivableSummary>;

  const rows = await listStoreReceivableSummariesByFarmerIds(farmerIds);

  return Object.fromEntries(
    rows
      .filter((row) => typeof row.farmerId === "string")
      .map((row) => [
        row.farmerId as string,
        {
          farmerId: row.farmerId as string,
          receivableCount: Number(row.receivableCount ?? 0),
          totalOutstanding: Number(row.totalOutstanding ?? 0),
          nearestDueDate: row.nearestDueDate ?? null,
        } satisfies FarmerStoreReceivableSummary,
      ]),
  );
}

export async function getTbsPurchaseStoreOffsetDetail(purchaseId: string) {
  const offset = await getTbsPurchaseStoreOffsetByPurchaseId(purchaseId);
  if (!offset) return null;

  const items = await listTbsPurchaseStoreOffsetItemsByOffsetId(offset.id);
  return { offset, items };
}

export async function buildStoreDebtOffsetPlan(input: {
  farmerId: string;
  totalPurchase: Decimal.Value;
  deduction: StoreDebtDeductionInput;
}) {
  const baseAmount = new Decimal(input.totalPurchase);
  const summary = await getFarmerStoreReceivableSummary(input.farmerId);
  const outstandingAmount = new Decimal(summary.totalOutstanding);

  if (input.deduction.mode === "none" || outstandingAmount.lte(0)) {
    return {
      summary,
      plan: null,
    };
  }

  const inputPercentage =
    input.deduction.mode === "percentage"
      ? new Decimal(input.deduction.percentage ?? 0)
      : null;
  const inputAmount =
    input.deduction.mode === "value"
      ? new Decimal(input.deduction.value ?? 0)
      : new Decimal(0);
  const requestedAmount =
    input.deduction.mode === "percentage"
      ? baseAmount.mul(inputPercentage ?? 0).div(100)
      : inputAmount;

  const appliedAmount = Decimal.min(
    Decimal.max(requestedAmount, 0),
    outstandingAmount,
    baseAmount,
  );

  if (appliedAmount.lte(0)) {
    return {
      summary,
      plan: null,
    };
  }

  const receivables = await listOutstandingStoreReceivablesByFarmer(input.farmerId);
  let remaining = appliedAmount;
  const allocations: StoreDebtOffsetPlan["allocations"] = [];

  receivables.forEach((item, index) => {
    if (remaining.lte(0)) return;

    const receivableOutstanding = new Decimal(item.outstandingAmount);
    if (receivableOutstanding.lte(0)) return;

    const applied = Decimal.min(receivableOutstanding, remaining);
    if (applied.lte(0)) return;

    allocations.push({
      receivableId: item.id,
      customerId: item.customerId ?? null,
      appliedAmount: applied,
      sortOrder: index,
    });
    remaining = remaining.minus(applied);
  });

  const finalAppliedAmount = allocations.reduce(
    (total, item) => total.plus(item.appliedAmount),
    new Decimal(0),
  );

  if (finalAppliedAmount.lte(0)) {
    return {
      summary,
      plan: null,
    };
  }

  return {
    summary,
    plan: {
      inputMode: input.deduction.mode,
      baseAmount,
      inputAmount,
      inputPercentage,
      requestedAmount,
      appliedAmount: finalAppliedAmount,
      notes: toNullableNote(input.deduction.notes),
      allocations,
    } satisfies StoreDebtOffsetPlan,
  };
}

export async function reverseTbsPurchaseStoreOffset(
  purchaseId: string,
  actorId?: string | null,
) {
  const existing = await getTbsPurchaseStoreOffsetByPurchaseId(purchaseId);
  if (!existing) return null;

  const items = await listTbsPurchaseStoreOffsetItemsByOffsetId(existing.id);

  for (const item of items) {
    const receivable = await getReceivableById(item.receivableId);
    if (!receivable) continue;

    const currentPaid = new Decimal(receivable.paidAmount);
    const currentOutstanding = new Decimal(receivable.outstandingAmount);
    const reversedAmount = new Decimal(item.appliedAmount);
    const nextPaid = Decimal.max(currentPaid.minus(reversedAmount), 0);
    const nextOutstanding = currentOutstanding.plus(reversedAmount);
    const status = resolvePaymentStatus(new Decimal(receivable.amount), nextPaid);

    await updateReceivable(receivable.id, {
      paidAmount: nextPaid.toFixed(2),
      outstandingAmount: nextOutstanding.toFixed(2),
      status,
      updatedAt: new Date(),
    });
    await syncSourcePaymentStatus(receivable.sourceType, receivable.sourceId, status);
  }

  await deleteTbsPurchaseStoreOffsetItemsByOffsetId(existing.id);
  await deleteTbsPurchaseStoreOffsetByPurchaseId(purchaseId);

  await logAudit({
    entityType: "tbs_purchase_store_offsets",
    entityId: existing.id,
    action: "reverse",
    actorId,
    before: {
      header: existing,
      items,
    },
  });

  return {
    offset: existing,
    items,
  };
}

export async function applyTbsPurchaseStoreOffset(input: {
  purchaseId: string;
  payableId?: string | null;
  farmerId: string;
  actorId?: string | null;
  plan: StoreDebtOffsetPlan | null;
}) {
  if (!input.plan || input.plan.appliedAmount.lte(0)) return null;

  const header = await createTbsPurchaseStoreOffset({
    purchaseId: input.purchaseId,
    payableId: input.payableId ?? null,
    farmerId: input.farmerId,
    inputMode: input.plan.inputMode,
    inputPercentage: input.plan.inputPercentage?.toFixed(2) ?? null,
    inputAmount: input.plan.inputAmount.toFixed(2),
    baseAmount: input.plan.baseAmount.toFixed(2),
    requestedAmount: input.plan.requestedAmount.toFixed(2),
    appliedAmount: input.plan.appliedAmount.toFixed(2),
    notes: input.plan.notes,
    createdBy: input.actorId ?? null,
  });

  const items = [];
  for (const allocation of input.plan.allocations) {
    const receivable = await getReceivableById(allocation.receivableId);
    if (!receivable) continue;

    const currentPaid = new Decimal(receivable.paidAmount);
    const nextPaid = currentPaid.plus(allocation.appliedAmount);
    const nextOutstanding = Decimal.max(
      new Decimal(receivable.outstandingAmount).minus(allocation.appliedAmount),
      0,
    );
    const status = resolvePaymentStatus(new Decimal(receivable.amount), nextPaid);

    await updateReceivable(receivable.id, {
      paidAmount: nextPaid.toFixed(2),
      outstandingAmount: nextOutstanding.toFixed(2),
      status,
      updatedAt: new Date(),
    });
    await syncSourcePaymentStatus(receivable.sourceType, receivable.sourceId, status);

    items.push({
      offsetId: header.id,
      receivableId: receivable.id,
      customerId: allocation.customerId,
      appliedAmount: allocation.appliedAmount.toFixed(2),
      sortOrder: allocation.sortOrder,
      notes: input.plan.notes,
      createdBy: input.actorId ?? null,
    });
  }

  const createdItems = await createTbsPurchaseStoreOffsetItems(items);

  await logAudit({
    entityType: "tbs_purchase_store_offsets",
    entityId: header.id,
    action: "apply",
    actorId: input.actorId,
    after: {
      header,
      items: createdItems,
    },
  });

  return {
    offset: header,
    items: createdItems,
  };
}

export async function syncPayableAmountBySource(
  sourceType: "tbs_purchase" | "store_purchase" | "manual",
  sourceId: string,
  amountValue: Decimal.Value,
) {
  const payable = await getPayableBySource(sourceType, sourceId);
  if (!payable) return null;

  const amount = new Decimal(amountValue);
  const paidAmount = new Decimal(payable.paidAmount);

  if (paidAmount.gt(amount)) {
    throw new Error("Total akhir tidak boleh lebih kecil dari pembayaran yang sudah dicatat.");
  }

  const outstandingAmount = amount.minus(paidAmount);
  const status = resolvePaymentStatus(amount, paidAmount);

  const updated = await updatePayable(payable.id, {
    amount: amount.toFixed(2),
    outstandingAmount: outstandingAmount.toFixed(2),
    status,
    updatedAt: new Date(),
  });

  await syncSourcePaymentStatus(sourceType, sourceId, status);

  return updated;
}

export async function createPayableEntry(input: {
  sourceType: "tbs_purchase" | "store_purchase" | "manual";
  sourceId?: string | null;
  partyType: "farmer" | "supplier" | "other";
  farmerId?: string | null;
  supplierId?: string | null;
  amount: number;
  dueDate?: Date | null;
  notes?: string | null;
  createdBy?: string | null;
}) {
  const amount = new Decimal(input.amount);
  const status = resolvePaymentStatus(amount, new Decimal(0));

  return createPayable({
    code: generateTransactionCode("PAY"),
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    partyType: input.partyType,
    farmerId: input.farmerId ?? null,
    supplierId: input.supplierId ?? null,
    amount: amount.toFixed(2),
    paidAmount: "0.00",
    outstandingAmount: Decimal.max(amount, 0).toFixed(2),
    status,
    dueDate: input.dueDate ?? null,
    notes: input.notes ?? null,
    createdBy: input.createdBy ?? null,
  });
}

export async function createReceivableEntry(input: {
  sourceType: "tbs_sale" | "store_sale" | "manual";
  sourceId?: string | null;
  partyType: "factory" | "customer" | "other";
  factoryId?: string | null;
  customerId?: string | null;
  amount: number;
  dueDate?: Date | null;
  notes?: string | null;
  createdBy?: string | null;
}) {
  const amount = new Decimal(input.amount);
  const status = resolvePaymentStatus(amount, new Decimal(0));

  return createReceivable({
    code: generateTransactionCode("REC"),
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    partyType: input.partyType,
    factoryId: input.factoryId ?? null,
    customerId: input.customerId ?? null,
    amount: amount.toFixed(2),
    paidAmount: "0.00",
    outstandingAmount: Decimal.max(amount, 0).toFixed(2),
    status,
    dueDate: input.dueDate ?? null,
    notes: input.notes ?? null,
    createdBy: input.createdBy ?? null,
  });
}

export async function getPayableList(limit = 50) {
  return listPayables(limit);
}

export async function getPayablePage(
  page = 1,
  pageSize = 20,
  filters?: {
    q?: string;
    status?: "unpaid" | "partial" | "paid" | "overdue" | "cancelled";
    partyType?: "farmer" | "supplier" | "other";
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listPayablesPage(safePage, safePageSize, filters);

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

export async function getPayableAging(filters?: {
  q?: string;
  status?: "unpaid" | "partial" | "paid" | "overdue" | "cancelled";
  partyType?: "farmer" | "supplier" | "other";
}) {
  return getPayableAgingSummary(filters);
}

export async function getReceivableList(limit = 50) {
  return listReceivables(limit);
}

export async function getReceivablePage(
  page = 1,
  pageSize = 20,
  filters?: {
    q?: string;
    status?: "unpaid" | "partial" | "paid" | "overdue" | "cancelled";
    partyType?: "factory" | "customer" | "other";
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listReceivablesPage(safePage, safePageSize, filters);

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

export async function getReceivableAging(filters?: {
  q?: string;
  status?: "unpaid" | "partial" | "paid" | "overdue" | "cancelled";
  partyType?: "factory" | "customer" | "other";
}) {
  return getReceivableAgingSummary(filters);
}

export async function getPaymentList(limit = 50) {
  return listPayments(limit);
}

export async function getPaymentPage(
  page = 1,
  pageSize = 20,
  filters?: {
    q?: string;
    direction?: "in" | "out";
    method?: "cash" | "bank_transfer" | "giro" | "other";
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listPaymentsPage(safePage, safePageSize, filters);

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

export async function getPaymentReceiptDetail(id: string) {
  return getPaymentDetailById(id);
}

export async function getCashLedgerList(limit = 50) {
  return listCashTransactions(limit);
}

export async function getCashLedgerPage(
  page = 1,
  pageSize = 20,
  filters?: {
    q?: string;
    type?: "debit" | "credit";
    category?: string;
  },
) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 10), 100) : 20;
  const result = await listCashTransactionsPage(safePage, safePageSize, filters);

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

export async function getPayableDetail(id: string) {
  const payable = await getPayableDetailById(id);
  if (!payable) return null;

  const [paymentHistory, purchaseStoreOffset] = await Promise.all([
    listPaymentsByPayableId(id),
    payable.sourceType === "tbs_purchase" && payable.sourceId
      ? getTbsPurchaseStoreOffsetDetail(payable.sourceId)
      : Promise.resolve(null),
  ]);
  const farmerStatement =
    payable.partyType === "farmer" && payable.farmerId
      ? await getFarmerPayableStatement(payable.farmerId)
      : null;

  return {
    payable,
    paymentHistory,
    purchaseStoreOffset,
    farmerStatement,
  };
}

export async function getPayableByReference(sourceType: "tbs_purchase" | "store_purchase" | "manual", sourceId: string) {
  return getPayableBySource(sourceType, sourceId);
}

export async function getReceivableDetail(id: string) {
  const receivable = await getReceivableDetailById(id);
  if (!receivable) return null;

  const paymentHistory = await listPaymentsByReceivableId(id);

  return {
    receivable,
    paymentHistory,
  };
}

export async function getReceivableByReference(
  sourceType: "tbs_sale" | "store_sale" | "manual",
  sourceId: string,
) {
  return getReceivableBySource(sourceType, sourceId);
}

export async function getFinancePaymentOptions(limit = 100) {
  const [payables, receivables] = await Promise.all([
    listOutstandingPayables(limit),
    listOutstandingReceivables(limit),
  ]);

  return { payables, receivables };
}

export async function getFarmerPayableStatement(farmerId: string, limit = 100) {
  const [payables, payments, storeOffsets, storeReceivables] = await Promise.all([
    listFarmerPayables(farmerId, limit),
    listFarmerPayments(farmerId, limit),
    listFarmerStoreOffsets(farmerId, limit),
    listStoreReceivablesByFarmer(farmerId, limit),
  ]);

  const totals = payables.reduce(
    (summary, item) => {
      summary.amount = summary.amount.plus(item.amount);
      summary.paid = summary.paid.plus(item.paidAmount);
      summary.outstanding = summary.outstanding.plus(item.outstandingAmount);
      return summary;
    },
    {
      amount: new Decimal(0),
      paid: new Decimal(0),
      outstanding: new Decimal(0),
    },
  );
  const storeOffsetTotal = storeOffsets.reduce(
    (total, item) => total.plus(item.itemAppliedAmount ?? 0),
    new Decimal(0),
  );

  return {
    payables,
    payments,
    storeOffsets,
    storeReceivables,
    summary: {
      transactionCount: payables.length,
      paymentCount: payments.length,
      storeOffsetCount: storeOffsets.length,
      totalStoreOffset: storeOffsetTotal.toFixed(2),
      totalAmount: totals.amount.toFixed(2),
      totalPaid: totals.paid.toFixed(2),
      totalOutstanding: totals.outstanding.toFixed(2),
    },
  };
}

export async function getFactoryReceivableStatement(factoryId: string, limit = 100) {
  const [receivables, payments] = await Promise.all([
    listFactoryReceivables(factoryId, limit),
    listFactoryPayments(factoryId, limit),
  ]);

  const totals = receivables.reduce(
    (summary, item) => {
      summary.amount = summary.amount.plus(item.amount);
      summary.paid = summary.paid.plus(item.paidAmount);
      summary.outstanding = summary.outstanding.plus(item.outstandingAmount);
      return summary;
    },
    {
      amount: new Decimal(0),
      paid: new Decimal(0),
      outstanding: new Decimal(0),
    },
  );

  return {
    receivables,
    payments,
    summary: {
      transactionCount: receivables.length,
      paymentCount: payments.length,
      totalAmount: totals.amount.toFixed(2),
      totalPaid: totals.paid.toFixed(2),
      totalOutstanding: totals.outstanding.toFixed(2),
    },
  };
}

export async function getStoreDebtOffsetReport(limit = 200) {
  const rows = await listStoreDebtOffsets(limit);
  const summary = rows.reduce(
    (accumulator, item) => {
      accumulator.totalApplied = accumulator.totalApplied.plus(item.itemAppliedAmount ?? 0);
      accumulator.totalRequested = accumulator.totalRequested.plus(item.requestedAmount ?? 0);
      accumulator.offsetIds.add(item.id);
      accumulator.purchaseIds.add(item.purchaseId);
      if (item.farmerId) accumulator.farmerIds.add(item.farmerId);
      return accumulator;
    },
    {
      totalApplied: new Decimal(0),
      totalRequested: new Decimal(0),
      offsetIds: new Set<string>(),
      purchaseIds: new Set<string>(),
      farmerIds: new Set<string>(),
    },
  );

  return {
    rows,
    summary: {
      offsetCount: summary.offsetIds.size,
      purchaseCount: summary.purchaseIds.size,
      farmerCount: summary.farmerIds.size,
      totalRequested: summary.totalRequested.toFixed(2),
      totalApplied: summary.totalApplied.toFixed(2),
    },
  };
}

export async function postPayment(payload: unknown, actorId?: string | null) {
  const parsed = paymentSchema.parse(payload);
  const code = generateTransactionCode("PMT");
  const amount = new Decimal(parsed.amount);

  if (parsed.payableId) {
    const payable = await getPayableById(parsed.payableId);
    if (!payable) throw new Error("Referensi hutang tidak ditemukan.");

    const outstanding = new Decimal(payable.outstandingAmount);
    if (amount.gt(outstanding)) {
      throw new Error("Nominal pembayaran tidak boleh melebihi sisa hutang.");
    }

    const nextPaid = new Decimal(payable.paidAmount).plus(amount);
    const nextOutstanding = outstanding.minus(amount);
    const status = resolvePaymentStatus(new Decimal(payable.amount), nextPaid);

    const payment = await createPayment({
      code,
      paymentDate: new Date(parsed.paymentDate),
      direction: "out",
      method: parsed.method,
      payableId: parsed.payableId,
      amount: amount.toFixed(2),
      notes: parsed.notes || null,
      createdBy: actorId ?? null,
      status: "active",
    });

    await updatePayable(parsed.payableId, {
      paidAmount: nextPaid.toFixed(2),
      outstandingAmount: nextOutstanding.toFixed(2),
      status,
      updatedAt: new Date(),
    });
    await syncSourcePaymentStatus(payable.sourceType, payable.sourceId, status);

    await createCashTransaction({
      code: generateTransactionCode("CASH"),
      transactionDate: new Date(parsed.paymentDate),
      type: "credit",
      category: resolveLedgerCategory("out", parsed.method),
      referenceType: "payment",
      referenceId: payment.id,
      amount: amount.toFixed(2),
      description: resolveLedgerDescription(
        "out",
        parsed.method,
        payable.code,
        payable.partyType === "farmer" ? "petani" : payable.partyType === "supplier" ? "supplier" : "pihak lain",
        parsed.notes,
      ),
      createdBy: actorId ?? null,
      status: "active",
    });

    await logAudit({
      entityType: "payments",
      entityId: payment.id,
      action: "post_payable_payment",
      actorId,
      after: payment,
    });

    return payment;
  }

  if (parsed.receivableId) {
    const receivable = await getReceivableById(parsed.receivableId);
    if (!receivable) throw new Error("Referensi piutang tidak ditemukan.");

    const outstanding = new Decimal(receivable.outstandingAmount);
    if (amount.gt(outstanding)) {
      throw new Error("Nominal penerimaan tidak boleh melebihi sisa piutang.");
    }

    const nextPaid = new Decimal(receivable.paidAmount).plus(amount);
    const nextOutstanding = outstanding.minus(amount);
    const status = resolvePaymentStatus(new Decimal(receivable.amount), nextPaid);

    const payment = await createPayment({
      code,
      paymentDate: new Date(parsed.paymentDate),
      direction: "in",
      method: parsed.method,
      receivableId: parsed.receivableId,
      amount: amount.toFixed(2),
      notes: parsed.notes || null,
      createdBy: actorId ?? null,
      status: "active",
    });

    await updateReceivable(parsed.receivableId, {
      paidAmount: nextPaid.toFixed(2),
      outstandingAmount: nextOutstanding.toFixed(2),
      status,
      updatedAt: new Date(),
    });
    await syncSourcePaymentStatus(receivable.sourceType, receivable.sourceId, status);

    await createCashTransaction({
      code: generateTransactionCode("CASH"),
      transactionDate: new Date(parsed.paymentDate),
      type: "debit",
      category: resolveLedgerCategory("in", parsed.method),
      referenceType: "payment",
      referenceId: payment.id,
      amount: amount.toFixed(2),
      description: resolveLedgerDescription(
        "in",
        parsed.method,
        receivable.code,
        receivable.partyType === "factory" ? "pabrik" : receivable.partyType === "customer" ? "pelanggan" : "pihak lain",
        parsed.notes,
      ),
      createdBy: actorId ?? null,
      status: "active",
    });

    await logAudit({
      entityType: "payments",
      entityId: payment.id,
      action: "post_receivable_payment",
      actorId,
      after: payment,
    });

    return payment;
  }

  throw new Error("Pilih referensi hutang atau piutang yang ingin dicatat.");
}
