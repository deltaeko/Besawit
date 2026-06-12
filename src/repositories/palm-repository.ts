import { and, asc, count, desc, eq, getTableColumns, gte, ilike, lte, or } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  factoryDeductionDefaults,
  factories,
  farmers,
  tbsDeductionConfigs,
  tbsPurchases,
  tbsSaleDeductions,
  tbsSaleReturns,
  tbsSales,
  transportPersonnel,
  users,
  vehicles,
  warehouses,
} from "@/lib/db/schema";

export async function listTbsPurchases(limit = 20) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsPurchases),
      farmerName: farmers.name,
      driverName: transportPersonnel.name,
    })
    .from(tbsPurchases)
    .leftJoin(farmers, eq(tbsPurchases.farmerId, farmers.id))
    .leftJoin(transportPersonnel, eq(tbsPurchases.driverId, transportPersonnel.id))
    .orderBy(desc(tbsPurchases.purchaseDate), desc(tbsPurchases.createdAt))
    .limit(limit);
}

export async function listAllTbsPurchases() {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsPurchases),
      farmerName: farmers.name,
      driverName: transportPersonnel.name,
    })
    .from(tbsPurchases)
    .leftJoin(farmers, eq(tbsPurchases.farmerId, farmers.id))
    .leftJoin(transportPersonnel, eq(tbsPurchases.driverId, transportPersonnel.id))
    .orderBy(desc(tbsPurchases.purchaseDate), desc(tbsPurchases.createdAt));
}

export async function listTbsSales(limit = 20) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsSales),
      factoryName: factories.name,
      warehouseName: warehouses.name,
    })
    .from(tbsSales)
    .leftJoin(factories, eq(tbsSales.factoryId, factories.id))
    .leftJoin(warehouses, eq(tbsSales.warehouseId, warehouses.id))
    .orderBy(desc(tbsSales.saleDate), desc(tbsSales.createdAt))
    .limit(limit);
}

export async function listAllTbsSales() {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsSales),
      factoryName: factories.name,
      warehouseName: warehouses.name,
    })
    .from(tbsSales)
    .leftJoin(factories, eq(tbsSales.factoryId, factories.id))
    .leftJoin(warehouses, eq(tbsSales.warehouseId, warehouses.id))
    .orderBy(desc(tbsSales.saleDate), desc(tbsSales.createdAt));
}

export async function listTbsPurchasesPage(
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
        ilike(tbsPurchases.code, q),
        ilike(farmers.name, q),
        ilike(transportPersonnel.name, q),
      ),
    );
  }

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    conditions.push(eq(tbsPurchases.paymentStatus, filters.paymentStatus as never));
  }

  if (filters?.dateFrom) {
    conditions.push(gte(tbsPurchases.purchaseDate, filters.dateFrom));
  }

  if (filters?.dateTo) {
    conditions.push(lte(tbsPurchases.purchaseDate, filters.dateTo));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select({
        ...getTableColumns(tbsPurchases),
        farmerName: farmers.name,
        driverName: transportPersonnel.name,
      })
      .from(tbsPurchases)
      .leftJoin(farmers, eq(tbsPurchases.farmerId, farmers.id))
      .leftJoin(transportPersonnel, eq(tbsPurchases.driverId, transportPersonnel.id))
      .where(whereClause)
      .orderBy(desc(tbsPurchases.purchaseDate), desc(tbsPurchases.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(tbsPurchases)
      .leftJoin(farmers, eq(tbsPurchases.farmerId, farmers.id))
      .leftJoin(transportPersonnel, eq(tbsPurchases.driverId, transportPersonnel.id))
      .where(whereClause),
  ]);

  return {
    items,
    total,
  };
}

export async function listTbsSalesPage(
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
        ilike(tbsSales.code, q),
        ilike(factories.name, q),
        ilike(warehouses.name, q),
      ),
    );
  }

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    conditions.push(eq(tbsSales.paymentStatus, filters.paymentStatus as never));
  }

  if (filters?.dateFrom) {
    conditions.push(gte(tbsSales.saleDate, filters.dateFrom));
  }

  if (filters?.dateTo) {
    conditions.push(lte(tbsSales.saleDate, filters.dateTo));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select({
        ...getTableColumns(tbsSales),
        factoryName: factories.name,
        warehouseName: warehouses.name,
      })
      .from(tbsSales)
      .leftJoin(factories, eq(tbsSales.factoryId, factories.id))
      .leftJoin(warehouses, eq(tbsSales.warehouseId, warehouses.id))
      .where(whereClause)
      .orderBy(desc(tbsSales.saleDate), desc(tbsSales.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(tbsSales)
      .leftJoin(factories, eq(tbsSales.factoryId, factories.id))
      .leftJoin(warehouses, eq(tbsSales.warehouseId, warehouses.id))
      .where(whereClause),
  ]);

  return {
    items,
    total,
  };
}

export async function getTbsPurchaseById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(tbsPurchases),
      farmerName: farmers.name,
      driverName: transportPersonnel.name,
      vehicleCode: vehicles.code,
      vehiclePlateNumber: vehicles.plateNumber,
      vehicleType: vehicles.type,
      warehouseName: warehouses.name,
      createdByName: users.fullName,
    })
    .from(tbsPurchases)
    .leftJoin(farmers, eq(tbsPurchases.farmerId, farmers.id))
    .leftJoin(transportPersonnel, eq(tbsPurchases.driverId, transportPersonnel.id))
    .leftJoin(vehicles, eq(tbsPurchases.vehicleId, vehicles.id))
    .leftJoin(warehouses, eq(tbsPurchases.warehouseId, warehouses.id))
    .leftJoin(users, eq(tbsPurchases.createdBy, users.id))
    .where(eq(tbsPurchases.id, id))
    .limit(1);
  return row ?? null;
}

export async function getTbsSaleById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(tbsSales),
      referencePurchaseCode: tbsPurchases.code,
      factoryName: factories.name,
      warehouseName: warehouses.name,
      createdByName: users.fullName,
    })
    .from(tbsSales)
    .leftJoin(tbsPurchases, eq(tbsSales.referencePurchaseId, tbsPurchases.id))
    .leftJoin(factories, eq(tbsSales.factoryId, factories.id))
    .leftJoin(warehouses, eq(tbsSales.warehouseId, warehouses.id))
    .leftJoin(users, eq(tbsSales.createdBy, users.id))
    .where(eq(tbsSales.id, id))
    .limit(1);
  return row ?? null;
}

export async function listTbsSaleDeductionsBySaleId(saleId: string) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(tbsSaleDeductions),
      configCode: tbsDeductionConfigs.code,
      configName: tbsDeductionConfigs.name,
    })
    .from(tbsSaleDeductions)
    .leftJoin(tbsDeductionConfigs, eq(tbsSaleDeductions.configId, tbsDeductionConfigs.id))
    .where(eq(tbsSaleDeductions.saleId, saleId))
    .orderBy(asc(tbsSaleDeductions.sortOrder), asc(tbsSaleDeductions.createdAt));
}

export async function listTbsSaleReturnsBySaleId(saleId: string) {
  const db = await getDb();
  return db
    .select()
    .from(tbsSaleReturns)
    .where(eq(tbsSaleReturns.saleId, saleId))
    .orderBy(asc(tbsSaleReturns.createdAt));
}

export async function listActiveTbsDeductionConfigs() {
  const db = await getDb();
  return db
    .select()
    .from(tbsDeductionConfigs)
    .where(eq(tbsDeductionConfigs.isActive, true))
    .orderBy(asc(tbsDeductionConfigs.name));
}

export async function listFactoryDeductionDefaults(factoryId?: string | null) {
  const db = await getDb();
  if (!factoryId) return [];

  return db
    .select({
      ...getTableColumns(factoryDeductionDefaults),
      configCode: tbsDeductionConfigs.code,
      configName: tbsDeductionConfigs.name,
      legacyType: tbsDeductionConfigs.legacyType,
      defaultInputMode: tbsDeductionConfigs.defaultInputMode,
    })
    .from(factoryDeductionDefaults)
    .innerJoin(
      tbsDeductionConfigs,
      eq(factoryDeductionDefaults.deductionConfigId, tbsDeductionConfigs.id),
    )
    .where(eq(factoryDeductionDefaults.factoryId, factoryId))
    .orderBy(
      asc(factoryDeductionDefaults.sortOrder),
      asc(factoryDeductionDefaults.createdAt),
    );
}

export async function createTbsPurchase(values: typeof tbsPurchases.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(tbsPurchases).values(values).returning();
  return row;
}

export async function updateTbsPurchase(
  id: string,
  values: Partial<typeof tbsPurchases.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(tbsPurchases)
    .set(values)
    .where(eq(tbsPurchases.id, id))
    .returning();
  return row ?? null;
}

export async function createTbsSale(values: typeof tbsSales.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(tbsSales).values(values).returning();
  return row;
}

export async function hasActiveTbsSalesByReferencePurchaseId(referencePurchaseId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(tbsSales)
    .where(
      and(
        eq(tbsSales.referencePurchaseId, referencePurchaseId),
        eq(tbsSales.status, "active"),
      ),
    );

  return Number(row?.value ?? 0) > 0;
}

export async function hasActiveTbsSalesInWarehouseSince(
  warehouseId: string,
  since: Date,
) {
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(tbsSales)
    .where(
      and(
        eq(tbsSales.warehouseId, warehouseId),
        eq(tbsSales.status, "active"),
        gte(tbsSales.createdAt, since),
      ),
    );

  return Number(row?.value ?? 0) > 0;
}

export async function updateTbsSale(
  id: string,
  values: Partial<typeof tbsSales.$inferInsert>,
) {
  const db = await getDb();
  const [row] = await db
    .update(tbsSales)
    .set(values)
    .where(eq(tbsSales.id, id))
    .returning();
  return row ?? null;
}

export async function createTbsSaleDeductions(
  values: (typeof tbsSaleDeductions.$inferInsert)[],
) {
  const db = await getDb();
  return db.insert(tbsSaleDeductions).values(values).returning();
}

export async function createTbsSaleReturns(
  values: (typeof tbsSaleReturns.$inferInsert)[],
) {
  const db = await getDb();
  return db.insert(tbsSaleReturns).values(values).returning();
}
