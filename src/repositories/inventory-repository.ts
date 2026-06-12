import { and, count, desc, eq, getTableColumns, gte, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/lib/db/client";
import {
  products,
  stockAdjustmentItems,
  stockAdjustments,
  stockBalances,
  stockMovements,
  stockTakeItems,
  stockTakes,
  users,
  warehouses,
} from "@/lib/db/schema";

export async function getProductById(productId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return row ?? null;
}

export async function getProductByCode(code: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.code, code))
    .limit(1);
  return row ?? null;
}

export async function createProduct(values: typeof products.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(products).values(values).returning();
  return row;
}

export async function getStockBalance(warehouseId: string, productId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(stockBalances)
    .where(
      and(
        eq(stockBalances.warehouseId, warehouseId),
        eq(stockBalances.productId, productId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function upsertStockBalance(values: typeof stockBalances.$inferInsert) {
  const db = await getDb();
  const existing = await getStockBalance(values.warehouseId, values.productId);

  if (!existing) {
    const [row] = await db.insert(stockBalances).values(values).returning();
    return row;
  }

  const [row] = await db
    .update(stockBalances)
    .set({
      quantity: values.quantity,
      averageCost: values.averageCost,
      lastMovementAt: values.lastMovementAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(stockBalances.warehouseId, values.warehouseId),
        eq(stockBalances.productId, values.productId),
      ),
    )
    .returning();

  return row;
}

export async function createStockMovement(values: typeof stockMovements.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(stockMovements).values(values).returning();
  return row;
}

export async function hasStockMovementHistory(warehouseId: string, productId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.warehouseId, warehouseId),
        eq(stockMovements.productId, productId),
      ),
    );

  return Number(row?.value ?? 0) > 0;
}

export async function hasStockMovementByReference(
  referenceType: typeof stockMovements.$inferSelect.referenceType,
  referenceId: string,
) {
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.referenceType, referenceType),
        eq(stockMovements.referenceId, referenceId),
      ),
    );

  return Number(row?.value ?? 0) > 0;
}

export async function listStockMovementsByReference(
  referenceType: typeof stockMovements.$inferSelect.referenceType,
  referenceId: string,
) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(stockMovements),
      productName: products.name,
      productCode: products.code,
      warehouseName: warehouses.name,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .where(
      and(
        eq(stockMovements.referenceType, referenceType),
        eq(stockMovements.referenceId, referenceId),
      ),
    )
    .orderBy(desc(stockMovements.movementDate), desc(stockMovements.createdAt));
}

export async function listStockMovements(
  limit = 50,
  filters?: {
    productId?: string;
    warehouseId?: string;
  },
) {
  const db = await getDb();
  const conditions = [];
  if (filters?.productId) conditions.push(eq(stockMovements.productId, filters.productId));
  if (filters?.warehouseId) conditions.push(eq(stockMovements.warehouseId, filters.warehouseId));

  return db
    .select({
      ...getTableColumns(stockMovements),
      productName: products.name,
      productCode: products.code,
      warehouseName: warehouses.name,
      createdByName: users.fullName,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockMovements.createdBy, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stockMovements.movementDate), desc(stockMovements.createdAt))
    .limit(limit);
}

export async function getStockMovementById(id: string) {
  const db = await getDb();
  const counterpartyWarehouses = alias(warehouses, "counterparty_warehouses");
  const [row] = await db
    .select({
      ...getTableColumns(stockMovements),
      productName: products.name,
      productCode: products.code,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      counterpartyWarehouseName: counterpartyWarehouses.name,
      counterpartyWarehouseCode: counterpartyWarehouses.code,
      createdByName: users.fullName,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .leftJoin(counterpartyWarehouses, eq(stockMovements.counterpartyWarehouseId, counterpartyWarehouses.id))
    .leftJoin(users, eq(stockMovements.createdBy, users.id))
    .where(eq(stockMovements.id, id))
    .limit(1);

  return row ?? null;
}

export async function listStockMovementsPage(
  page: number,
  pageSize: number,
  filters?: {
    productId?: string;
    warehouseId?: string;
    reason?: typeof stockMovements.$inferSelect.reason;
    dateFrom?: Date;
    dateTo?: Date;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  if (filters?.productId) conditions.push(eq(stockMovements.productId, filters.productId));
  if (filters?.warehouseId) conditions.push(eq(stockMovements.warehouseId, filters.warehouseId));
  if (filters?.reason) conditions.push(eq(stockMovements.reason, filters.reason));
  if (filters?.dateFrom) conditions.push(gte(stockMovements.movementDate, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(stockMovements.movementDate, filters.dateTo));

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(stockMovements),
      productName: products.name,
      productCode: products.code,
      warehouseName: warehouses.name,
      createdByName: users.fullName,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockMovements.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(stockMovements.movementDate), desc(stockMovements.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(stockMovements)
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}

export async function listStockBalances(limit = 100) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(stockBalances),
      productName: products.name,
      productCode: products.code,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      unit: products.unit,
      minStock: products.minStock,
    })
    .from(stockBalances)
    .leftJoin(products, eq(stockBalances.productId, products.id))
    .leftJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
    .orderBy(desc(stockBalances.updatedAt))
    .limit(limit);
}

export async function listStockBalancesPage(
  page: number,
  pageSize: number,
  filters?: {
    productId?: string;
    warehouseId?: string;
    lowStockOnly?: boolean;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  if (filters?.productId) conditions.push(eq(stockBalances.productId, filters.productId));
  if (filters?.warehouseId) conditions.push(eq(stockBalances.warehouseId, filters.warehouseId));
  if (filters?.lowStockOnly) conditions.push(lte(stockBalances.quantity, products.minStock));

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(stockBalances),
      productName: products.name,
      productCode: products.code,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      unit: products.unit,
      minStock: products.minStock,
    })
    .from(stockBalances)
    .leftJoin(products, eq(stockBalances.productId, products.id))
    .leftJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
    .where(whereClause)
    .orderBy(desc(stockBalances.updatedAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(stockBalances)
    .leftJoin(products, eq(stockBalances.productId, products.id))
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}

export async function summarizeStockBalances() {
  const db = await getDb();
  const [row] = await db
    .select({
      totalRows: count(),
      totalQuantity: sql<number>`coalesce(sum(${stockBalances.quantity}), 0)`,
      totalValue: sql<number>`coalesce(sum(${stockBalances.quantity} * ${stockBalances.averageCost}), 0)`,
      criticalCount: sql<number>`coalesce(sum(case when ${stockBalances.quantity} <= ${products.minStock} then 1 else 0 end), 0)`,
    })
    .from(stockBalances)
    .leftJoin(products, eq(stockBalances.productId, products.id));

  return {
    totalRows: Number(row?.totalRows ?? 0),
    totalQuantity: Number(row?.totalQuantity ?? 0),
    totalValue: Number(row?.totalValue ?? 0),
    criticalCount: Number(row?.criticalCount ?? 0),
  };
}

export async function createStockTake(values: typeof stockTakes.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(stockTakes).values(values).returning();
  return row;
}

export async function createStockTakeItems(
  values: (typeof stockTakeItems.$inferInsert)[],
) {
  const db = await getDb();
  return db.insert(stockTakeItems).values(values).returning();
}

export async function getStockTakeById(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(stockTakes).where(eq(stockTakes.id, id)).limit(1);
  return row ?? null;
}

export async function listStockTakes(limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(stockTakes)
    .orderBy(desc(stockTakes.stockDate), desc(stockTakes.createdAt))
    .limit(limit);
}

export async function listStockTakesPage(
  page: number,
  pageSize: number,
  filters?: {
    warehouseId?: string;
    status?: typeof stockTakes.$inferSelect.status;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  if (filters?.warehouseId) conditions.push(eq(stockTakes.warehouseId, filters.warehouseId));
  if (filters?.status) conditions.push(eq(stockTakes.status, filters.status));

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(stockTakes),
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
    })
    .from(stockTakes)
    .leftJoin(warehouses, eq(stockTakes.warehouseId, warehouses.id))
    .where(whereClause)
    .orderBy(desc(stockTakes.stockDate), desc(stockTakes.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(stockTakes)
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}

export async function summarizeStockTakes() {
  const db = await getDb();
  const [row] = await db
    .select({
      totalCount: count(),
      approvedCount: sql<number>`coalesce(sum(case when ${stockTakes.status} = 'approved' then 1 else 0 end), 0)`,
      totalVariance: sql<number>`coalesce(sum(${stockTakes.varianceValue}), 0)`,
    })
    .from(stockTakes);

  return {
    totalCount: Number(row?.totalCount ?? 0),
    approvedCount: Number(row?.approvedCount ?? 0),
    totalVariance: Number(row?.totalVariance ?? 0),
  };
}

export async function listStockTakeItems(stockTakeId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(stockTakeItems),
      productName: products.name,
      productCode: products.code,
      unit: products.unit,
    })
    .from(stockTakeItems)
    .leftJoin(products, eq(stockTakeItems.productId, products.id))
    .where(eq(stockTakeItems.stockTakeId, stockTakeId));
}

export async function updateStockTake(
  id: string,
  values: Partial<typeof stockTakes.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(stockTakes)
    .set(values)
    .where(eq(stockTakes.id, id))
    .returning();
  return row;
}

export async function createStockAdjustment(
  values: typeof stockAdjustments.$inferInsert,
) {
  const db = await getDb();
  const [row] = await db.insert(stockAdjustments).values(values).returning();
  return row;
}

export async function getStockAdjustmentById(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(stockAdjustments).where(eq(stockAdjustments.id, id)).limit(1);
  return row ?? null;
}

export async function updateStockAdjustment(
  id: string,
  values: Partial<typeof stockAdjustments.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(stockAdjustments)
    .set(values)
    .where(eq(stockAdjustments.id, id))
    .returning();

  return row;
}

export async function createStockAdjustmentItems(
  values: (typeof stockAdjustmentItems.$inferInsert)[],
) {
  const db = await getDb();
  return db.insert(stockAdjustmentItems).values(values).returning();
}

export async function listStockAdjustments(limit = 50) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(stockAdjustments),
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      createdByName: users.fullName,
    })
    .from(stockAdjustments)
    .leftJoin(warehouses, eq(stockAdjustments.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockAdjustments.createdBy, users.id))
    .orderBy(desc(stockAdjustments.createdAt))
    .limit(limit);
}

export async function listStockAdjustmentsPage(
  page: number,
  pageSize: number,
  filters?: {
    warehouseId?: string;
    status?: typeof stockAdjustments.$inferSelect.status;
  },
) {
  const db = await getDb();
  const conditions: SQL[] = [];
  if (filters?.warehouseId) conditions.push(eq(stockAdjustments.warehouseId, filters.warehouseId));
  if (filters?.status) conditions.push(eq(stockAdjustments.status, filters.status));

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      ...getTableColumns(stockAdjustments),
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      createdByName: users.fullName,
    })
    .from(stockAdjustments)
    .leftJoin(warehouses, eq(stockAdjustments.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockAdjustments.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(stockAdjustments.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(stockAdjustments)
    .where(whereClause);

  return {
    items,
    total: Number(total ?? 0),
  };
}

export async function summarizeStockAdjustments() {
  const db = await getDb();
  const [row] = await db
    .select({
      totalCount: count(),
      pendingCount: sql<number>`coalesce(sum(case when ${stockAdjustments.status} = 'pending' then 1 else 0 end), 0)`,
    })
    .from(stockAdjustments);

  return {
    totalCount: Number(row?.totalCount ?? 0),
    pendingCount: Number(row?.pendingCount ?? 0),
  };
}

export async function listStockAdjustmentItems(adjustmentId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(stockAdjustmentItems),
      productName: products.name,
      productCode: products.code,
      unit: products.unit,
    })
    .from(stockAdjustmentItems)
    .leftJoin(products, eq(stockAdjustmentItems.productId, products.id))
    .where(eq(stockAdjustmentItems.adjustmentId, adjustmentId));
}

export async function updateStockAdjustmentItem(
  id: string,
  values: Partial<typeof stockAdjustmentItems.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(stockAdjustmentItems)
    .set(values)
    .where(eq(stockAdjustmentItems.id, id))
    .returning();

  return row;
}
