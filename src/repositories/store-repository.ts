import { desc, eq, getTableColumns } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  customers,
  products,
  storePurchaseItems,
  storePurchases,
  storeSaleItems,
  storeSales,
  suppliers,
  warehouses,
} from "@/lib/db/schema";

export async function listStorePurchases(limit = 20) {
  return db
    .select()
    .from(storePurchases)
    .orderBy(desc(storePurchases.transactionDate), desc(storePurchases.createdAt))
    .limit(limit);
}

export async function listStoreSales(limit = 20) {
  return db
    .select()
    .from(storeSales)
    .orderBy(desc(storeSales.transactionDate), desc(storeSales.createdAt))
    .limit(limit);
}

export async function getStorePurchaseById(id: string) {
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
  const [row] = await db.insert(storePurchases).values(values).returning();
  return row;
}

export async function updateStorePurchase(
  id: string,
  values: Partial<typeof storePurchases.$inferInsert>,
) {
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
  return db.insert(storePurchaseItems).values(values).returning();
}

export async function createStoreSale(values: typeof storeSales.$inferInsert) {
  const [row] = await db.insert(storeSales).values(values).returning();
  return row;
}

export async function updateStoreSale(
  id: string,
  values: Partial<typeof storeSales.$inferInsert>,
) {
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
  return db.insert(storeSaleItems).values(values).returning();
}

export async function listStoreSaleItemsBySaleId(saleId: string) {
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
  return db.select().from(products).orderBy(desc(products.createdAt)).limit(limit);
}

export async function listSuppliers(limit = 100) {
  return db.select().from(suppliers).orderBy(desc(suppliers.createdAt)).limit(limit);
}

export async function listCustomers(limit = 100) {
  return db.select().from(customers).orderBy(desc(customers.createdAt)).limit(limit);
}

export async function listWarehouses(limit = 100) {
  return db.select().from(warehouses).orderBy(desc(warehouses.createdAt)).limit(limit);
}
