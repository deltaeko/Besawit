import { and, count, desc, eq, getTableColumns, ilike, lte, gte, or } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  customers,
  products,
  storePurchaseItems,
  storePurchaseReturnItems,
  storePurchaseReturns,
  storePurchases,
  storeSaleItems,
  storeSales,
  suppliers,
  warehouses,
} from "@/lib/db/schema";

export async function listStorePurchases(limit = 20) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storePurchases),
      supplierName: suppliers.name,
      warehouseName: warehouses.name,
    })
    .from(storePurchases)
    .leftJoin(suppliers, eq(storePurchases.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(storePurchases.warehouseId, warehouses.id))
    .orderBy(desc(storePurchases.transactionDate), desc(storePurchases.createdAt))
    .limit(limit);
}

export async function listAllStorePurchases() {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storePurchases),
      supplierName: suppliers.name,
      warehouseName: warehouses.name,
    })
    .from(storePurchases)
    .leftJoin(suppliers, eq(storePurchases.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(storePurchases.warehouseId, warehouses.id))
    .orderBy(desc(storePurchases.transactionDate), desc(storePurchases.createdAt));
}

export async function listStoreSales(limit = 20) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storeSales),
      customerName: customers.name,
      warehouseName: warehouses.name,
    })
    .from(storeSales)
    .leftJoin(customers, eq(storeSales.customerId, customers.id))
    .leftJoin(warehouses, eq(storeSales.warehouseId, warehouses.id))
    .orderBy(desc(storeSales.transactionDate), desc(storeSales.createdAt))
    .limit(limit);
}

export async function listStorePurchasesPage(
  page: number,
  pageSize: number,
  filters?: {
    q?: string;
    paymentStatus?: string;
    dateFrom?: Date;
    dateTo?: Date;
  },
) {
  const db = await getDb();
  const offset = (page - 1) * pageSize;
  const conditions = [];

  if (filters?.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(storePurchases.code, q),
        ilike(storePurchases.invoiceNumber, q),
        ilike(suppliers.name, q),
      ),
    );
  }

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    conditions.push(eq(storePurchases.paymentStatus, filters.paymentStatus as never));
  }

  if (filters?.dateFrom) {
    conditions.push(gte(storePurchases.transactionDate, filters.dateFrom));
  }

  if (filters?.dateTo) {
    conditions.push(lte(storePurchases.transactionDate, filters.dateTo));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select({
        ...getTableColumns(storePurchases),
        supplierName: suppliers.name,
        warehouseName: warehouses.name,
      })
      .from(storePurchases)
      .leftJoin(suppliers, eq(storePurchases.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(storePurchases.warehouseId, warehouses.id))
      .where(whereClause)
      .orderBy(desc(storePurchases.transactionDate), desc(storePurchases.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(storePurchases)
      .leftJoin(suppliers, eq(storePurchases.supplierId, suppliers.id))
      .where(whereClause),
  ]);

  return {
    items,
    total,
  };
}

export async function listStoreSalesPage(
  page: number,
  pageSize: number,
  filters?: {
    q?: string;
    paymentStatus?: string;
    saleType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  },
) {
  const db = await getDb();
  const offset = (page - 1) * pageSize;
  const conditions = [];

  if (filters?.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(storeSales.code, q),
        ilike(storeSales.invoiceNumber, q),
        ilike(customers.name, q),
      ),
    );
  }

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    conditions.push(eq(storeSales.paymentStatus, filters.paymentStatus as never));
  }

  if (filters?.saleType && filters.saleType !== "all") {
    conditions.push(eq(storeSales.saleType, filters.saleType as never));
  }

  if (filters?.dateFrom) {
    conditions.push(gte(storeSales.transactionDate, filters.dateFrom));
  }

  if (filters?.dateTo) {
    conditions.push(lte(storeSales.transactionDate, filters.dateTo));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select({
        ...getTableColumns(storeSales),
        customerName: customers.name,
        warehouseName: warehouses.name,
      })
      .from(storeSales)
      .leftJoin(customers, eq(storeSales.customerId, customers.id))
      .leftJoin(warehouses, eq(storeSales.warehouseId, warehouses.id))
      .where(whereClause)
      .orderBy(desc(storeSales.transactionDate), desc(storeSales.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(storeSales)
      .leftJoin(customers, eq(storeSales.customerId, customers.id))
      .where(whereClause),
  ]);

  return {
    items,
    total,
  };
}

export async function listAllStoreSales() {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storeSales),
      customerName: customers.name,
      warehouseName: warehouses.name,
    })
    .from(storeSales)
    .leftJoin(customers, eq(storeSales.customerId, customers.id))
    .leftJoin(warehouses, eq(storeSales.warehouseId, warehouses.id))
    .orderBy(desc(storeSales.transactionDate), desc(storeSales.createdAt));
}

export async function getStorePurchaseById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(storePurchases),
      supplierName: suppliers.name,
      warehouseName: warehouses.name,
    })
    .from(storePurchases)
    .leftJoin(suppliers, eq(storePurchases.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(storePurchases.warehouseId, warehouses.id))
    .where(eq(storePurchases.id, id))
    .limit(1);
  return row ?? null;
}

export async function getStoreSaleById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(storeSales),
      customerName: customers.name,
      warehouseName: warehouses.name,
    })
    .from(storeSales)
    .leftJoin(customers, eq(storeSales.customerId, customers.id))
    .leftJoin(warehouses, eq(storeSales.warehouseId, warehouses.id))
    .where(eq(storeSales.id, id))
    .limit(1);
  return row ?? null;
}

export async function createStorePurchase(
  values: typeof storePurchases.$inferInsert,
) {
  const db = await getDb();
  const [row] = await db.insert(storePurchases).values(values).returning();
  return row;
}

export async function updateStorePurchase(
  id: string,
  values: Partial<typeof storePurchases.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(storePurchases)
    .set(values)
    .where(eq(storePurchases.id, id))
    .returning();
  return row ?? null;
}

export async function createStorePurchaseItems(
  values: (typeof storePurchaseItems.$inferInsert)[],
) {
  const db = await getDb();
  return db.insert(storePurchaseItems).values(values).returning();
}

export async function listStorePurchaseItemsByPurchaseId(purchaseId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storePurchaseItems),
      productCode: products.code,
      productName: products.name,
      productUnit: products.unit,
    })
    .from(storePurchaseItems)
    .leftJoin(products, eq(storePurchaseItems.productId, products.id))
    .where(eq(storePurchaseItems.purchaseId, purchaseId))
    .orderBy(desc(storePurchaseItems.createdAt));
}

export async function createStorePurchaseReturn(
  values: typeof storePurchaseReturns.$inferInsert,
) {
  const db = await getDb();
  const [row] = await db.insert(storePurchaseReturns).values(values).returning();
  return row;
}

export async function createStorePurchaseReturnItems(
  values: (typeof storePurchaseReturnItems.$inferInsert)[],
) {
  const db = await getDb();
  return db.insert(storePurchaseReturnItems).values(values).returning();
}

export async function listStorePurchaseReturnsByPurchaseId(purchaseId: string) {
  const db = await getDb();
  return db
    .select()
    .from(storePurchaseReturns)
    .where(eq(storePurchaseReturns.purchaseId, purchaseId))
    .orderBy(desc(storePurchaseReturns.returnDate), desc(storePurchaseReturns.createdAt));
}

export async function getStorePurchaseReturnById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(storePurchaseReturns),
      purchaseCode: storePurchases.code,
      purchaseDate: storePurchases.transactionDate,
      supplierName: suppliers.name,
      warehouseName: warehouses.name,
      purchaseInvoiceNumber: storePurchases.invoiceNumber,
      purchaseNotes: storePurchases.notes,
    })
    .from(storePurchaseReturns)
    .innerJoin(storePurchases, eq(storePurchaseReturns.purchaseId, storePurchases.id))
    .leftJoin(suppliers, eq(storePurchases.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(storePurchases.warehouseId, warehouses.id))
    .where(eq(storePurchaseReturns.id, id))
    .limit(1);

  return row ?? null;
}

export async function listStorePurchaseReturnItemsByPurchaseId(purchaseId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storePurchaseReturnItems),
      returnCode: storePurchaseReturns.code,
      returnDate: storePurchaseReturns.returnDate,
      returnStatus: storePurchaseReturns.status,
      productCode: products.code,
      productName: products.name,
      productUnit: products.unit,
    })
    .from(storePurchaseReturnItems)
    .innerJoin(storePurchaseReturns, eq(storePurchaseReturnItems.returnId, storePurchaseReturns.id))
    .leftJoin(products, eq(storePurchaseReturnItems.productId, products.id))
    .where(eq(storePurchaseReturns.purchaseId, purchaseId))
    .orderBy(desc(storePurchaseReturns.returnDate), desc(storePurchaseReturnItems.createdAt));
}

export async function listStorePurchaseReturnItemsByReturnId(returnId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storePurchaseReturnItems),
      productCode: products.code,
      productName: products.name,
      productUnit: products.unit,
    })
    .from(storePurchaseReturnItems)
    .leftJoin(products, eq(storePurchaseReturnItems.productId, products.id))
    .where(eq(storePurchaseReturnItems.returnId, returnId))
    .orderBy(desc(storePurchaseReturnItems.createdAt));
}

export async function createStoreSale(values: typeof storeSales.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(storeSales).values(values).returning();
  return row;
}

export async function updateStoreSale(
  id: string,
  values: Partial<typeof storeSales.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(storeSales)
    .set(values)
    .where(eq(storeSales.id, id))
    .returning();
  return row ?? null;
}

export async function createStoreSaleItems(
  values: (typeof storeSaleItems.$inferInsert)[],
) {
  const db = await getDb();
  return db.insert(storeSaleItems).values(values).returning();
}

export async function listStoreSaleItemsBySaleId(saleId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(storeSaleItems),
      productCode: products.code,
      productName: products.name,
      productUnit: products.unit,
    })
    .from(storeSaleItems)
    .leftJoin(products, eq(storeSaleItems.productId, products.id))
    .where(eq(storeSaleItems.saleId, saleId))
    .orderBy(desc(storeSaleItems.createdAt));
}

export async function listProducts(limit = 100) {
  const db = await getDb();
  return db.select().from(products).orderBy(desc(products.createdAt)).limit(limit);
}

export async function listSuppliers(limit = 100) {
  const db = await getDb();
  return db.select().from(suppliers).orderBy(desc(suppliers.createdAt)).limit(limit);
}

export async function listCustomers(limit = 100) {
  const db = await getDb();
  return db.select().from(customers).orderBy(desc(customers.createdAt)).limit(limit);
}

export async function listWarehouses(limit = 100) {
  const db = await getDb();
  return db.select().from(warehouses).orderBy(desc(warehouses.createdAt)).limit(limit);
}
