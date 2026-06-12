import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  cashTransactions,
  customers,
  factories,
  farmers,
  payables,
  payments,
  receivables,
  storePurchases,
  storeSales,
  suppliers,
  tbsPurchaseStoreOffsetItems,
  tbsPurchaseStoreOffsets,
  tbsPurchases,
  tbsSales,
  users,
} from "@/lib/db/schema";

export async function createPayable(values: typeof payables.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(payables).values(values).returning();
  return row;
}

export async function createReceivable(values: typeof receivables.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(receivables).values(values).returning();
  return row;
}

export async function listPayables(limit = 50) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(payables),
      farmerName: farmers.name,
      supplierName: suppliers.name,
      sourceCode: sql<string | null>`coalesce(${tbsPurchases.code}, ${storePurchases.code})`,
      sourceDate: sql<Date | null>`coalesce(${tbsPurchases.purchaseDate}, ${storePurchases.transactionDate})`,
    })
    .from(payables)
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(
      storePurchases,
      and(eq(payables.sourceType, "store_purchase"), eq(payables.sourceId, storePurchases.id)),
    )
    .orderBy(desc(payables.createdAt))
    .limit(limit);
}

export async function listPayablesPage(
  page: number,
  pageSize: number,
  filters?: {
    q?: string;
    status?: typeof payables.$inferSelect.status;
    partyType?: typeof payables.$inferSelect.partyType;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const keyword = filters?.q?.trim();

  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(payables.code, pattern),
        ilike(farmers.name, pattern),
        ilike(suppliers.name, pattern),
        ilike(tbsPurchases.code, pattern),
        ilike(storePurchases.code, pattern),
      )!,
    );
  }

  if (filters?.status) {
    conditions.push(eq(payables.status, filters.status));
  }

  if (filters?.partyType) {
    conditions.push(eq(payables.partyType, filters.partyType));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(payables),
      farmerName: farmers.name,
      supplierName: suppliers.name,
      sourceCode: sql<string | null>`coalesce(${tbsPurchases.code}, ${storePurchases.code})`,
      sourceDate: sql<Date | null>`coalesce(${tbsPurchases.purchaseDate}, ${storePurchases.transactionDate})`,
    })
    .from(payables)
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(
      storePurchases,
      and(eq(payables.sourceType, "store_purchase"), eq(payables.sourceId, storePurchases.id)),
    )
    .where(whereClause)
    .orderBy(desc(payables.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(payables)
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(
      storePurchases,
      and(eq(payables.sourceType, "store_purchase"), eq(payables.sourceId, storePurchases.id)),
    )
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}

export async function getPayableAgingSummary(filters?: {
  q?: string;
  status?: typeof payables.$inferSelect.status;
  partyType?: typeof payables.$inferSelect.partyType;
}) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const keyword = filters?.q?.trim();

  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(payables.code, pattern),
        ilike(farmers.name, pattern),
        ilike(suppliers.name, pattern),
        ilike(tbsPurchases.code, pattern),
        ilike(storePurchases.code, pattern),
      )!,
    );
  }

  if (filters?.status) {
    conditions.push(eq(payables.status, filters.status));
  } else {
    conditions.push(inArray(payables.status, ["unpaid", "partial", "overdue"]));
  }

  if (filters?.partyType) {
    conditions.push(eq(payables.partyType, filters.partyType));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const [row] = await db
    .select({
      current: sql<string>`coalesce(sum(case when ${payables.dueDate} is null or ${payables.dueDate} >= current_date then ${payables.outstandingAmount} else 0 end), 0)`,
      due1to7: sql<string>`coalesce(sum(case when ${payables.dueDate} < current_date and ${payables.dueDate} >= current_date - interval '7 days' then ${payables.outstandingAmount} else 0 end), 0)`,
      due8to14: sql<string>`coalesce(sum(case when ${payables.dueDate} < current_date - interval '7 days' and ${payables.dueDate} >= current_date - interval '14 days' then ${payables.outstandingAmount} else 0 end), 0)`,
      due15to30: sql<string>`coalesce(sum(case when ${payables.dueDate} < current_date - interval '14 days' and ${payables.dueDate} >= current_date - interval '30 days' then ${payables.outstandingAmount} else 0 end), 0)`,
      dueOver30: sql<string>`coalesce(sum(case when ${payables.dueDate} < current_date - interval '30 days' then ${payables.outstandingAmount} else 0 end), 0)`,
    })
    .from(payables)
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(
      storePurchases,
      and(eq(payables.sourceType, "store_purchase"), eq(payables.sourceId, storePurchases.id)),
    )
    .where(whereClause);

  return {
    current: Number(row?.current ?? 0),
    due1to7: Number(row?.due1to7 ?? 0),
    due8to14: Number(row?.due8to14 ?? 0),
    due15to30: Number(row?.due15to30 ?? 0),
    dueOver30: Number(row?.dueOver30 ?? 0),
  };
}

export async function listReceivables(limit = 50) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(receivables),
      factoryName: factories.name,
      customerName: customers.name,
      farmerName: farmers.name,
      farmerCode: farmers.code,
      sourceCode: sql<string | null>`coalesce(${tbsSales.code}, ${storeSales.code})`,
      sourceDate: sql<Date | null>`coalesce(${tbsSales.saleDate}, ${storeSales.transactionDate})`,
    })
    .from(receivables)
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(farmers, eq(customers.farmerId, farmers.id))
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .orderBy(desc(receivables.createdAt))
    .limit(limit);
}

export async function listReceivablesPage(
  page: number,
  pageSize: number,
  filters?: {
    q?: string;
    status?: typeof receivables.$inferSelect.status;
    partyType?: typeof receivables.$inferSelect.partyType;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const keyword = filters?.q?.trim();

  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(receivables.code, pattern),
        ilike(factories.name, pattern),
        ilike(customers.name, pattern),
        ilike(farmers.name, pattern),
        ilike(tbsSales.code, pattern),
        ilike(storeSales.code, pattern),
      )!,
    );
  }

  if (filters?.status) {
    conditions.push(eq(receivables.status, filters.status));
  }

  if (filters?.partyType) {
    conditions.push(eq(receivables.partyType, filters.partyType));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(receivables),
      factoryName: factories.name,
      customerName: customers.name,
      farmerName: farmers.name,
      farmerCode: farmers.code,
      sourceCode: sql<string | null>`coalesce(${tbsSales.code}, ${storeSales.code})`,
      sourceDate: sql<Date | null>`coalesce(${tbsSales.saleDate}, ${storeSales.transactionDate})`,
    })
    .from(receivables)
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(farmers, eq(customers.farmerId, farmers.id))
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(whereClause)
    .orderBy(desc(receivables.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(receivables)
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(farmers, eq(customers.farmerId, farmers.id))
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}

export async function getReceivableAgingSummary(filters?: {
  q?: string;
  status?: typeof receivables.$inferSelect.status;
  partyType?: typeof receivables.$inferSelect.partyType;
}) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const keyword = filters?.q?.trim();

  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(receivables.code, pattern),
        ilike(factories.name, pattern),
        ilike(customers.name, pattern),
        ilike(farmers.name, pattern),
        ilike(tbsSales.code, pattern),
        ilike(storeSales.code, pattern),
      )!,
    );
  }

  if (filters?.status) {
    conditions.push(eq(receivables.status, filters.status));
  } else {
    conditions.push(inArray(receivables.status, ["unpaid", "partial", "overdue"]));
  }

  if (filters?.partyType) {
    conditions.push(eq(receivables.partyType, filters.partyType));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const [row] = await db
    .select({
      current: sql<string>`coalesce(sum(case when ${receivables.dueDate} is null or ${receivables.dueDate} >= current_date then ${receivables.outstandingAmount} else 0 end), 0)`,
      due1to7: sql<string>`coalesce(sum(case when ${receivables.dueDate} < current_date and ${receivables.dueDate} >= current_date - interval '7 days' then ${receivables.outstandingAmount} else 0 end), 0)`,
      due8to14: sql<string>`coalesce(sum(case when ${receivables.dueDate} < current_date - interval '7 days' and ${receivables.dueDate} >= current_date - interval '14 days' then ${receivables.outstandingAmount} else 0 end), 0)`,
      due15to30: sql<string>`coalesce(sum(case when ${receivables.dueDate} < current_date - interval '14 days' and ${receivables.dueDate} >= current_date - interval '30 days' then ${receivables.outstandingAmount} else 0 end), 0)`,
      dueOver30: sql<string>`coalesce(sum(case when ${receivables.dueDate} < current_date - interval '30 days' then ${receivables.outstandingAmount} else 0 end), 0)`,
    })
    .from(receivables)
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(farmers, eq(customers.farmerId, farmers.id))
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(whereClause);

  return {
    current: Number(row?.current ?? 0),
    due1to7: Number(row?.due1to7 ?? 0),
    due8to14: Number(row?.due8to14 ?? 0),
    due15to30: Number(row?.due15to30 ?? 0),
    dueOver30: Number(row?.dueOver30 ?? 0),
  };
}

export async function getPayableById(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(payables).where(eq(payables.id, id)).limit(1);
  return row ?? null;
}

export async function getPayableDetailById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(payables),
      farmerName: farmers.name,
      farmerCode: farmers.code,
      supplierName: suppliers.name,
      supplierCode: suppliers.code,
      sourceCode: sql<string | null>`coalesce(${tbsPurchases.code}, ${storePurchases.code})`,
      sourceDate: sql<Date | null>`coalesce(${tbsPurchases.purchaseDate}, ${storePurchases.transactionDate})`,
      createdByName: users.fullName,
    })
    .from(payables)
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(
      storePurchases,
      and(eq(payables.sourceType, "store_purchase"), eq(payables.sourceId, storePurchases.id)),
    )
    .leftJoin(users, eq(payables.createdBy, users.id))
    .where(eq(payables.id, id))
    .limit(1);

  return row ?? null;
}

export async function getPayableBySource(
  sourceType: "tbs_purchase" | "store_purchase" | "manual",
  sourceId: string,
) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(payables)
    .where(and(eq(payables.sourceType, sourceType), eq(payables.sourceId, sourceId)))
    .limit(1);
  return row ?? null;
}

export async function getReceivableById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(receivables)
    .where(eq(receivables.id, id))
    .limit(1);
  return row ?? null;
}

export async function getReceivableDetailById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(receivables),
      factoryName: factories.name,
      factoryCode: factories.code,
      customerName: customers.name,
      customerCode: customers.code,
      farmerName: farmers.name,
      farmerCode: farmers.code,
      sourceCode: sql<string | null>`coalesce(${tbsSales.code}, ${storeSales.code})`,
      sourceDate: sql<Date | null>`coalesce(${tbsSales.saleDate}, ${storeSales.transactionDate})`,
      createdByName: users.fullName,
    })
    .from(receivables)
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(farmers, eq(customers.farmerId, farmers.id))
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .leftJoin(users, eq(receivables.createdBy, users.id))
    .where(eq(receivables.id, id))
    .limit(1);

  return row ?? null;
}

export async function getReceivableBySource(
  sourceType: "tbs_sale" | "store_sale" | "manual",
  sourceId: string,
) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(receivables)
    .where(and(eq(receivables.sourceType, sourceType), eq(receivables.sourceId, sourceId)))
    .limit(1);
  return row ?? null;
}

export async function updatePayable(id: string, values: Partial<typeof payables.$inferInsert>) {
  const db = await getDb();
  const [row] = await db
    .update(payables)
    .set(values)
    .where(eq(payables.id, id))
    .returning();
  return row;
}

export async function updateReceivable(
  id: string,
  values: Partial<typeof receivables.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(receivables)
    .set(values)
    .where(eq(receivables.id, id))
    .returning();
  return row;
}

export async function createPayment(values: typeof payments.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(payments).values(values).returning();
  return row;
}

export async function createCashTransaction(
  values: typeof cashTransactions.$inferInsert,
) {
  const db = await getDb();
  const [row] = await db.insert(cashTransactions).values(values).returning();
  return row;
}

export async function listPayments(limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(payments)
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
    .limit(limit);
}

export async function listPaymentsPage(
  page: number,
  pageSize: number,
  filters?: {
    q?: string;
    direction?: typeof payments.$inferSelect.direction;
    method?: typeof payments.$inferSelect.method;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const keyword = filters?.q?.trim();

  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(payments.code, pattern),
        ilike(payables.code, pattern),
        ilike(receivables.code, pattern),
        ilike(farmers.name, pattern),
        ilike(suppliers.name, pattern),
        ilike(factories.name, pattern),
        ilike(customers.name, pattern),
      )!,
    );
  }

  if (filters?.direction) {
    conditions.push(eq(payments.direction, filters.direction));
  }

  if (filters?.method) {
    conditions.push(eq(payments.method, filters.method));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(payments),
      payableCode: payables.code,
      receivableCode: receivables.code,
      farmerName: farmers.name,
      supplierName: suppliers.name,
      factoryName: factories.name,
      customerName: customers.name,
      createdByName: users.fullName,
      ledgerCategory: cashTransactions.category,
    })
    .from(payments)
    .leftJoin(payables, eq(payments.payableId, payables.id))
    .leftJoin(receivables, eq(payments.receivableId, receivables.id))
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(users, eq(payments.createdBy, users.id))
    .leftJoin(
      cashTransactions,
      and(eq(cashTransactions.referenceType, "payment"), eq(cashTransactions.referenceId, payments.id)),
    )
    .where(whereClause)
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(payments)
    .leftJoin(payables, eq(payments.payableId, payables.id))
    .leftJoin(receivables, eq(payments.receivableId, receivables.id))
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}

export async function getPaymentDetailById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(payments),
      payableCode: payables.code,
      receivableCode: receivables.code,
      payablePartyType: payables.partyType,
      receivablePartyType: receivables.partyType,
      farmerName: farmers.name,
      supplierName: suppliers.name,
      factoryName: factories.name,
      customerName: customers.name,
      purchaseCode: tbsPurchases.code,
      saleCode: tbsSales.code,
      createdByName: users.fullName,
      ledgerCode: cashTransactions.code,
      ledgerCategory: cashTransactions.category,
      ledgerDescription: cashTransactions.description,
    })
    .from(payments)
    .leftJoin(payables, eq(payments.payableId, payables.id))
    .leftJoin(receivables, eq(payments.receivableId, receivables.id))
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(users, eq(payments.createdBy, users.id))
    .leftJoin(
      cashTransactions,
      and(eq(cashTransactions.referenceType, "payment"), eq(cashTransactions.referenceId, payments.id)),
    )
    .where(eq(payments.id, id))
    .limit(1);

  return row ?? null;
}

export async function listPaymentsByPayableId(payableId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(payments),
      createdByName: users.fullName,
      ledgerCategory: cashTransactions.category,
      ledgerDescription: cashTransactions.description,
    })
    .from(payments)
    .leftJoin(users, eq(payments.createdBy, users.id))
    .leftJoin(
      cashTransactions,
      and(eq(cashTransactions.referenceType, "payment"), eq(cashTransactions.referenceId, payments.id)),
    )
    .where(eq(payments.payableId, payableId))
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
}

export async function listPaymentsByReceivableId(receivableId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(payments),
      createdByName: users.fullName,
      ledgerCategory: cashTransactions.category,
      ledgerDescription: cashTransactions.description,
    })
    .from(payments)
    .leftJoin(users, eq(payments.createdBy, users.id))
    .leftJoin(
      cashTransactions,
      and(eq(cashTransactions.referenceType, "payment"), eq(cashTransactions.referenceId, payments.id)),
    )
    .where(eq(payments.receivableId, receivableId))
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
}

export async function listFarmerPayables(farmerId: string, limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(payables),
      sourceCode: tbsPurchases.code,
      sourceDate: tbsPurchases.purchaseDate,
    })
    .from(payables)
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .where(eq(payables.farmerId, farmerId))
    .orderBy(desc(payables.createdAt))
    .limit(limit);
}

export async function listFarmerPayments(farmerId: string, limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(payments),
      payableCode: payables.code,
      purchaseCode: tbsPurchases.code,
      createdByName: users.fullName,
      ledgerCategory: cashTransactions.category,
    })
    .from(payments)
    .innerJoin(payables, eq(payments.payableId, payables.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(users, eq(payments.createdBy, users.id))
    .leftJoin(
      cashTransactions,
      and(eq(cashTransactions.referenceType, "payment"), eq(cashTransactions.referenceId, payments.id)),
    )
    .where(eq(payables.farmerId, farmerId))
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
    .limit(limit);
}

export async function listFarmerStoreOffsets(farmerId: string, limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsPurchaseStoreOffsets),
      purchaseCode: tbsPurchases.code,
      purchaseDate: tbsPurchases.purchaseDate,
      receivableCode: receivables.code,
      customerName: customers.name,
      customerCode: customers.code,
      sourceCode: storeSales.code,
      sourceDate: storeSales.transactionDate,
      itemAppliedAmount: tbsPurchaseStoreOffsetItems.appliedAmount,
    })
    .from(tbsPurchaseStoreOffsets)
    .leftJoin(tbsPurchases, eq(tbsPurchaseStoreOffsets.purchaseId, tbsPurchases.id))
    .leftJoin(
      tbsPurchaseStoreOffsetItems,
      eq(tbsPurchaseStoreOffsets.id, tbsPurchaseStoreOffsetItems.offsetId),
    )
    .leftJoin(receivables, eq(tbsPurchaseStoreOffsetItems.receivableId, receivables.id))
    .leftJoin(customers, eq(tbsPurchaseStoreOffsetItems.customerId, customers.id))
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(eq(tbsPurchaseStoreOffsets.farmerId, farmerId))
    .orderBy(desc(tbsPurchaseStoreOffsets.createdAt), asc(tbsPurchaseStoreOffsetItems.sortOrder))
    .limit(limit);
}

export async function listStoreDebtOffsets(limit = 200) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsPurchaseStoreOffsets),
      purchaseCode: tbsPurchases.code,
      purchaseDate: tbsPurchases.purchaseDate,
      payableCode: payables.code,
      farmerName: farmers.name,
      farmerCode: farmers.code,
      receivableCode: receivables.code,
      customerName: customers.name,
      customerCode: customers.code,
      sourceCode: storeSales.code,
      sourceDate: storeSales.transactionDate,
      itemAppliedAmount: tbsPurchaseStoreOffsetItems.appliedAmount,
    })
    .from(tbsPurchaseStoreOffsets)
    .leftJoin(tbsPurchases, eq(tbsPurchaseStoreOffsets.purchaseId, tbsPurchases.id))
    .leftJoin(payables, eq(tbsPurchaseStoreOffsets.payableId, payables.id))
    .leftJoin(farmers, eq(tbsPurchaseStoreOffsets.farmerId, farmers.id))
    .leftJoin(
      tbsPurchaseStoreOffsetItems,
      eq(tbsPurchaseStoreOffsets.id, tbsPurchaseStoreOffsetItems.offsetId),
    )
    .leftJoin(receivables, eq(tbsPurchaseStoreOffsetItems.receivableId, receivables.id))
    .leftJoin(customers, eq(tbsPurchaseStoreOffsetItems.customerId, customers.id))
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .orderBy(desc(tbsPurchaseStoreOffsets.createdAt), asc(tbsPurchaseStoreOffsetItems.sortOrder))
    .limit(limit);
}

export async function listFactoryReceivables(factoryId: string, limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(receivables),
      sourceCode: tbsSales.code,
      sourceDate: tbsSales.saleDate,
    })
    .from(receivables)
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .where(eq(receivables.factoryId, factoryId))
    .orderBy(desc(receivables.createdAt))
    .limit(limit);
}

export async function listFactoryPayments(factoryId: string, limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(payments),
      receivableCode: receivables.code,
      saleCode: tbsSales.code,
      createdByName: users.fullName,
      ledgerCategory: cashTransactions.category,
    })
    .from(payments)
    .innerJoin(receivables, eq(payments.receivableId, receivables.id))
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(users, eq(payments.createdBy, users.id))
    .leftJoin(
      cashTransactions,
      and(eq(cashTransactions.referenceType, "payment"), eq(cashTransactions.referenceId, payments.id)),
    )
    .where(eq(receivables.factoryId, factoryId))
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
    .limit(limit);
}

export async function listOutstandingPayables(limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(payables),
      farmerName: farmers.name,
      supplierName: suppliers.name,
      sourceCode: sql<string | null>`coalesce(${tbsPurchases.code}, ${storePurchases.code})`,
    })
    .from(payables)
    .leftJoin(farmers, eq(payables.farmerId, farmers.id))
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .leftJoin(
      tbsPurchases,
      and(eq(payables.sourceType, "tbs_purchase"), eq(payables.sourceId, tbsPurchases.id)),
    )
    .leftJoin(
      storePurchases,
      and(eq(payables.sourceType, "store_purchase"), eq(payables.sourceId, storePurchases.id)),
    )
    .where(inArray(payables.status, ["unpaid", "partial", "overdue"]))
    .orderBy(asc(payables.dueDate), desc(payables.createdAt))
    .limit(limit);
}

export async function listOutstandingReceivables(limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(receivables),
      factoryName: factories.name,
      customerName: customers.name,
      sourceCode: sql<string | null>`coalesce(${tbsSales.code}, ${storeSales.code})`,
    })
    .from(receivables)
    .leftJoin(factories, eq(receivables.factoryId, factories.id))
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(
      tbsSales,
      and(eq(receivables.sourceType, "tbs_sale"), eq(receivables.sourceId, tbsSales.id)),
    )
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(inArray(receivables.status, ["unpaid", "partial", "overdue"]))
    .orderBy(asc(receivables.dueDate), desc(receivables.createdAt))
    .limit(limit);
}

export async function listOutstandingStoreReceivablesByFarmer(farmerId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(receivables),
      customerName: customers.name,
      customerCode: customers.code,
      sourceCode: storeSales.code,
      sourceDate: storeSales.transactionDate,
    })
    .from(receivables)
    .innerJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(
      and(
        eq(customers.farmerId, farmerId),
        eq(receivables.sourceType, "store_sale"),
        inArray(receivables.status, ["unpaid", "partial", "overdue"]),
      ),
    )
    .orderBy(asc(receivables.dueDate), asc(receivables.createdAt));
}

export async function listStoreReceivablesByFarmer(farmerId: string, limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(receivables),
      customerName: customers.name,
      customerCode: customers.code,
      sourceCode: storeSales.code,
      sourceDate: storeSales.transactionDate,
    })
    .from(receivables)
    .innerJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(
      and(
        eq(customers.farmerId, farmerId),
        eq(receivables.sourceType, "store_sale"),
      ),
    )
    .orderBy(desc(receivables.createdAt))
    .limit(limit);
}

export async function listStoreReceivableSummariesByFarmerIds(farmerIds: string[]) {
  const db = await getDb();
  if (!farmerIds.length) return [];

  return db
    .select({
      farmerId: customers.farmerId,
      receivableCount: sql<number>`count(${receivables.id})::int`,
      totalOutstanding: sql<string>`coalesce(sum(${receivables.outstandingAmount}), 0)`,
      nearestDueDate: sql<Date | null>`min(${receivables.dueDate})`,
    })
    .from(receivables)
    .innerJoin(customers, eq(receivables.customerId, customers.id))
    .where(
      and(
        inArray(customers.farmerId, farmerIds),
        eq(receivables.sourceType, "store_sale"),
        inArray(receivables.status, ["unpaid", "partial", "overdue"]),
      ),
    )
    .groupBy(customers.farmerId);
}

export async function createTbsPurchaseStoreOffset(
  values: typeof tbsPurchaseStoreOffsets.$inferInsert,
) {
  const db = await getDb();
  const [row] = await db.insert(tbsPurchaseStoreOffsets).values(values).returning();
  return row;
}

export async function createTbsPurchaseStoreOffsetItems(
  values: (typeof tbsPurchaseStoreOffsetItems.$inferInsert)[],
) {
  const db = await getDb();
  if (!values.length) return [];
  return db.insert(tbsPurchaseStoreOffsetItems).values(values).returning();
}

export async function getTbsPurchaseStoreOffsetByPurchaseId(purchaseId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tbsPurchaseStoreOffsets)
    .where(eq(tbsPurchaseStoreOffsets.purchaseId, purchaseId))
    .limit(1);

  return row ?? null;
}

export async function listTbsPurchaseStoreOffsetItemsByOffsetId(offsetId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsPurchaseStoreOffsetItems),
      receivableCode: receivables.code,
      customerName: customers.name,
      customerCode: customers.code,
      sourceCode: storeSales.code,
      sourceDate: storeSales.transactionDate,
    })
    .from(tbsPurchaseStoreOffsetItems)
    .innerJoin(receivables, eq(tbsPurchaseStoreOffsetItems.receivableId, receivables.id))
    .leftJoin(customers, eq(tbsPurchaseStoreOffsetItems.customerId, customers.id))
    .leftJoin(
      storeSales,
      and(eq(receivables.sourceType, "store_sale"), eq(receivables.sourceId, storeSales.id)),
    )
    .where(eq(tbsPurchaseStoreOffsetItems.offsetId, offsetId))
    .orderBy(asc(tbsPurchaseStoreOffsetItems.sortOrder), asc(tbsPurchaseStoreOffsetItems.createdAt));
}

export async function deleteTbsPurchaseStoreOffsetItemsByOffsetId(offsetId: string) {
  const db = await getDb();
  return db
    .delete(tbsPurchaseStoreOffsetItems)
    .where(eq(tbsPurchaseStoreOffsetItems.offsetId, offsetId))
    .returning();
}

export async function deleteTbsPurchaseStoreOffsetByPurchaseId(purchaseId: string) {
  const db = await getDb();
  const [row] = await db
    .delete(tbsPurchaseStoreOffsets)
    .where(eq(tbsPurchaseStoreOffsets.purchaseId, purchaseId))
    .returning();

  return row ?? null;
}

export async function listCashTransactions(limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(cashTransactions)
    .orderBy(desc(cashTransactions.transactionDate), desc(cashTransactions.createdAt))
    .limit(limit);
}

export async function listCashTransactionsPage(
  page: number,
  pageSize: number,
  filters?: {
    q?: string;
    type?: typeof cashTransactions.$inferSelect.type;
    category?: string;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const keyword = filters?.q?.trim();

  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(cashTransactions.code, pattern),
        ilike(cashTransactions.category, pattern),
        ilike(cashTransactions.description, pattern),
      )!,
    );
  }

  if (filters?.type) {
    conditions.push(eq(cashTransactions.type, filters.type));
  }

  if (filters?.category?.trim()) {
    conditions.push(ilike(cashTransactions.category, `%${filters.category.trim()}%`));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(cashTransactions),
      createdByName: users.fullName,
    })
    .from(cashTransactions)
    .leftJoin(users, eq(cashTransactions.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(cashTransactions.transactionDate), desc(cashTransactions.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(cashTransactions)
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}
