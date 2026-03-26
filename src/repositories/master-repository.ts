import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  customers,
  factories,
  farmers,
  payables,
  productCategories,
  products,
  productPriceHistories,
  roles,
  stockAdjustmentItems,
  stockAdjustments,
  stockMovements,
  stockTakeItems,
  stockTakes,
  suppliers,
  tbsPurchaseStoreOffsetItems,
  tbsPurchaseStoreOffsets,
  tbsPurchases,
  tbsSales,
  transportPersonnel,
  users,
  vehicles,
  warehouses,
  storePurchaseItems,
  storePurchases,
  storeSaleItems,
  storeSales,
  receivables,
} from "@/lib/db/schema";
import type { MasterEntityKey } from "@/types/domain";

export type MasterListQuery = {
  q?: string;
  status?: "all" | "active" | "inactive";
  sort?: "latest" | "oldest" | "code_asc" | "name_asc";
  page: number;
  pageSize: number;
};

const simpleMasterTables = {
  farmers,
  factories,
  customers,
  suppliers,
  "transport-personnel": transportPersonnel,
  vehicles,
  warehouses,
  categories: productCategories,
  roles,
} as const;

function getOffset(query: MasterListQuery) {
  return (query.page - 1) * query.pageSize;
}

function getSortDirection(
  sort: MasterListQuery["sort"],
  columns: { createdAt?: unknown; code?: unknown; name?: unknown },
) {
  switch (sort) {
    case "oldest":
      return columns.createdAt ? asc(columns.createdAt as never) : undefined;
    case "code_asc":
      return columns.code ? asc(columns.code as never) : undefined;
    case "name_asc":
      return columns.name ? asc(columns.name as never) : undefined;
    case "latest":
    default:
      return columns.createdAt ? desc(columns.createdAt as never) : undefined;
  }
}

function buildStatusCondition(
  isActiveColumn: unknown,
  status: MasterListQuery["status"],
) {
  if (!isActiveColumn || !status || status === "all") {
    return undefined;
  }

  return eq(isActiveColumn as never, status === "active");
}

export async function listMasterRecords(
  entity: MasterEntityKey,
  query: MasterListQuery,
) {
  if (entity === "users") {
    const conditions: SQL[] = [];

    const statusCondition = buildStatusCondition(users.isActive, query.status);
    if (statusCondition) conditions.push(statusCondition);

    if (query.q) {
      conditions.push(
        or(
          ilike(users.fullName, `%${query.q}%`),
          ilike(users.email, `%${query.q}%`),
          ilike(users.phone, `%${query.q}%`),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const sortClause =
      getSortDirection(query.sort, {
        createdAt: users.createdAt,
        name: users.fullName,
      }) ?? desc(users.createdAt);

    const items = await db
      .select({
        ...getTableColumns(users),
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(whereClause)
      .orderBy(sortClause)
      .limit(query.pageSize)
      .offset(getOffset(query));

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(users)
      .where(whereClause);

    return { items, total };
  }

  if (entity === "products") {
    const conditions: SQL[] = [];
    const statusCondition = buildStatusCondition(products.isActive, query.status);
    if (statusCondition) conditions.push(statusCondition);

    if (query.q) {
      conditions.push(
        or(
          ilike(products.code, `%${query.q}%`),
          ilike(products.sku, `%${query.q}%`),
          ilike(products.name, `%${query.q}%`),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const sortClause =
      getSortDirection(query.sort, {
        createdAt: products.createdAt,
        code: products.code,
        name: products.name,
      }) ?? desc(products.createdAt);

    const items = await db
      .select({
        ...getTableColumns(products),
        categoryName: productCategories.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(whereClause)
      .orderBy(sortClause)
      .limit(query.pageSize)
      .offset(getOffset(query));

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(products)
      .where(whereClause);

    return { items, total };
  }

  if (entity === "customers") {
    const conditions: SQL[] = [];
    const statusCondition = buildStatusCondition(customers.isActive, query.status);
    if (statusCondition) conditions.push(statusCondition);

    if (query.q) {
      conditions.push(
        or(
          ilike(customers.code, `%${query.q}%`),
          ilike(customers.name, `%${query.q}%`),
          ilike(customers.phone, `%${query.q}%`),
          ilike(customers.city, `%${query.q}%`),
          ilike(farmers.name, `%${query.q}%`),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const sortClause =
      getSortDirection(query.sort, {
        createdAt: customers.createdAt,
        code: customers.code,
        name: customers.name,
      }) ?? desc(customers.createdAt);

    const items = await db
      .select({
        ...getTableColumns(customers),
        farmerName: farmers.name,
        farmerCode: farmers.code,
      })
      .from(customers)
      .leftJoin(farmers, eq(customers.farmerId, farmers.id))
      .where(whereClause)
      .orderBy(sortClause)
      .limit(query.pageSize)
      .offset(getOffset(query));

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(customers)
      .leftJoin(farmers, eq(customers.farmerId, farmers.id))
      .where(whereClause);

    return { items, total };
  }

  if (entity === "farmers") {
    const conditions: SQL[] = [];
    const statusCondition = buildStatusCondition(farmers.isActive, query.status);
    if (statusCondition) conditions.push(statusCondition);

    if (query.q) {
      conditions.push(
        or(
          ilike(farmers.code, `%${query.q}%`),
          ilike(farmers.name, `%${query.q}%`),
          ilike(farmers.phone, `%${query.q}%`),
          ilike(farmers.village, `%${query.q}%`),
          ilike(farmers.districtOrCity, `%${query.q}%`),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const sortClause =
      getSortDirection(query.sort, {
        createdAt: farmers.createdAt,
        code: farmers.code,
        name: farmers.name,
      }) ?? desc(farmers.createdAt);

    const outstandingSubquery = db
      .select({
        farmerId: payables.farmerId,
        outstandingAmount: sql<number>`coalesce(sum(${payables.outstandingAmount}), 0)`.as(
          "outstandingAmount",
        ),
      })
      .from(payables)
      .where(
        and(
          eq(payables.partyType, "farmer"),
          inArray(payables.status, ["unpaid", "partial", "overdue"]),
        ),
      )
      .groupBy(payables.farmerId)
      .as("farmer_outstanding");

    const storeReceivableSubquery = db
      .select({
        farmerId: customers.farmerId,
        storeOutstanding: sql<number>`coalesce(sum(${receivables.outstandingAmount}), 0)`.as(
          "storeOutstanding",
        ),
      })
      .from(receivables)
      .innerJoin(customers, eq(receivables.customerId, customers.id))
      .where(
        and(
          eq(receivables.partyType, "customer"),
          inArray(receivables.status, ["unpaid", "partial", "overdue"]),
        ),
      )
      .groupBy(customers.farmerId)
      .as("farmer_store_outstanding");

    const items = await db
      .select({
        ...getTableColumns(farmers),
        outstandingAmount: sql<number>`coalesce(${outstandingSubquery.outstandingAmount}, 0)`,
        storeReceivableOutstanding: sql<number>`coalesce(${storeReceivableSubquery.storeOutstanding}, 0)`,
      })
      .from(farmers)
      .leftJoin(
        outstandingSubquery,
        eq(outstandingSubquery.farmerId, farmers.id),
      )
      .leftJoin(
        storeReceivableSubquery,
        eq(storeReceivableSubquery.farmerId, farmers.id),
      )
      .where(whereClause)
      .orderBy(sortClause)
      .limit(query.pageSize)
      .offset(getOffset(query));

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(farmers)
      .where(whereClause);

    return { items, total };
  }

  const table = simpleMasterTables[entity as keyof typeof simpleMasterTables];

  if (!table) {
    throw new Error(`Unsupported master entity: ${entity}`);
  }

  const columns = getTableColumns(table);
  const conditions: SQL[] = [];
  const statusCondition =
    "isActive" in columns
      ? buildStatusCondition(columns.isActive, query.status)
      : undefined;

  if (statusCondition) conditions.push(statusCondition);

  if (query.q) {
    if (entity === "transport-personnel") {
      conditions.push(
        or(
          ilike(transportPersonnel.code, `%${query.q}%`),
          ilike(transportPersonnel.name, `%${query.q}%`),
          ilike(transportPersonnel.phone, `%${query.q}%`),
          ilike(transportPersonnel.licenseNumber, `%${query.q}%`),
          ilike(transportPersonnel.identityNumber, `%${query.q}%`),
          sql`cast(${transportPersonnel.role} as text) ilike ${`%${query.q}%`}`,
        )!,
      );
    } else if (entity === "vehicles") {
      conditions.push(
        or(
          ilike(vehicles.code, `%${query.q}%`),
          ilike(vehicles.plateNumber, `%${query.q}%`),
          ilike(vehicles.type, `%${query.q}%`),
        )!,
      );
    } else if (entity === "warehouses") {
      conditions.push(
        or(
          ilike(warehouses.code, `%${query.q}%`),
          ilike(warehouses.name, `%${query.q}%`),
          ilike(warehouses.address, `%${query.q}%`),
        )!,
      );
    } else if (entity === "categories") {
      conditions.push(
        or(
          ilike(productCategories.code, `%${query.q}%`),
          ilike(productCategories.name, `%${query.q}%`),
          ilike(productCategories.description, `%${query.q}%`),
        )!,
      );
    } else if (entity === "roles") {
      conditions.push(
        or(
          ilike(roles.code, `%${query.q}%`),
          ilike(roles.name, `%${query.q}%`),
          ilike(roles.description, `%${query.q}%`),
        )!,
      );
    } else {
      const contactTable = entity === "factories" ? factories : suppliers;

      conditions.push(
        or(
          ilike(contactTable.code, `%${query.q}%`),
          ilike(contactTable.name, `%${query.q}%`),
          ilike(contactTable.phone, `%${query.q}%`),
          ilike(contactTable.city, `%${query.q}%`),
        )!,
      );
    }
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const sortClause =
    getSortDirection(query.sort, {
      createdAt: "createdAt" in columns ? columns.createdAt : undefined,
      code: "code" in columns ? columns.code : undefined,
      name: "name" in columns ? columns.name : undefined,
    }) ??
    ("createdAt" in columns ? desc(columns.createdAt as never) : undefined);

  if (entity === "transport-personnel") {
    const items = await db
      .select({
        ...getTableColumns(transportPersonnel),
        primaryVehicleCode: vehicles.code,
        primaryVehiclePlateNumber: vehicles.plateNumber,
      })
      .from(transportPersonnel)
      .leftJoin(vehicles, eq(transportPersonnel.primaryVehicleId, vehicles.id))
      .where(whereClause)
      .orderBy(sortClause!)
      .limit(query.pageSize)
      .offset(getOffset(query));

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(transportPersonnel)
      .where(whereClause);

    return { items, total };
  }

  const items = await db
    .select()
    .from(table)
    .where(whereClause)
    .orderBy(sortClause!)
    .limit(query.pageSize)
    .offset(getOffset(query));

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(table)
    .where(whereClause);

  return { items, total };
}

async function hasAnyRows(table: { id?: unknown }, condition?: SQL) {
  if (!condition) return false;
  const [{ value }] = await db.select({ value: count() }).from(table as never).where(condition);
  return Number(value) > 0;
}

export async function hasMasterTransactions(
  entity: MasterEntityKey,
  id: string,
) {
  switch (entity) {
    case "farmers":
      return (
        (await hasAnyRows(tbsPurchases, eq(tbsPurchases.farmerId, id))) ||
        (await hasAnyRows(
          payables,
          and(eq(payables.partyType, "farmer"), eq(payables.farmerId, id)),
        )) ||
        (await hasAnyRows(
          tbsPurchaseStoreOffsets,
          eq(tbsPurchaseStoreOffsets.farmerId, id),
        ))
      );
    case "factories":
      return (
        (await hasAnyRows(tbsSales, eq(tbsSales.factoryId, id))) ||
        (await hasAnyRows(
          receivables,
          and(eq(receivables.partyType, "factory"), eq(receivables.factoryId, id)),
        ))
      );
    case "customers":
      return (
        (await hasAnyRows(storeSales, eq(storeSales.customerId, id))) ||
        (await hasAnyRows(
          receivables,
          and(eq(receivables.partyType, "customer"), eq(receivables.customerId, id)),
        )) ||
        (await hasAnyRows(
          tbsPurchaseStoreOffsetItems,
          eq(tbsPurchaseStoreOffsetItems.customerId, id),
        ))
      );
    case "suppliers":
      return (
        (await hasAnyRows(storePurchases, eq(storePurchases.supplierId, id))) ||
        (await hasAnyRows(
          payables,
          and(eq(payables.partyType, "supplier"), eq(payables.supplierId, id)),
        ))
      );
    case "transport-personnel":
      return await hasAnyRows(tbsPurchases, eq(tbsPurchases.driverId, id));
    case "vehicles":
      return (
        (await hasAnyRows(tbsPurchases, eq(tbsPurchases.vehicleId, id))) ||
        (await hasAnyRows(transportPersonnel, eq(transportPersonnel.primaryVehicleId, id)))
      );
    case "warehouses":
      return (
        (await hasAnyRows(tbsPurchases, eq(tbsPurchases.warehouseId, id))) ||
        (await hasAnyRows(storePurchases, eq(storePurchases.warehouseId, id))) ||
        (await hasAnyRows(storeSales, eq(storeSales.warehouseId, id))) ||
        (await hasAnyRows(stockMovements, eq(stockMovements.warehouseId, id))) ||
        (await hasAnyRows(stockTakes, eq(stockTakes.warehouseId, id))) ||
        (await hasAnyRows(stockAdjustments, eq(stockAdjustments.warehouseId, id)))
      );
    case "products":
      return (
        (await hasAnyRows(storePurchaseItems, eq(storePurchaseItems.productId, id))) ||
        (await hasAnyRows(storeSaleItems, eq(storeSaleItems.productId, id))) ||
        (await hasAnyRows(stockMovements, eq(stockMovements.productId, id))) ||
        (await hasAnyRows(stockTakeItems, eq(stockTakeItems.productId, id))) ||
        (await hasAnyRows(stockAdjustmentItems, eq(stockAdjustmentItems.productId, id)))
      );
    case "categories":
      return await hasAnyRows(products, eq(products.categoryId, id));
    default:
      return false;
  }
}

export async function getMasterRecordById(entity: MasterEntityKey, id: string) {
  if (entity === "users") {
    const rows = await db
      .select({
        ...getTableColumns(users),
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  if (entity === "products") {
    const rows = await db
      .select({
        ...getTableColumns(products),
        categoryName: productCategories.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(eq(products.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  if (entity === "customers") {
    const rows = await db
      .select({
        ...getTableColumns(customers),
        farmerName: farmers.name,
        farmerCode: farmers.code,
      })
      .from(customers)
      .leftJoin(farmers, eq(customers.farmerId, farmers.id))
      .where(eq(customers.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  if (entity === "farmers") {
    const outstandingSubquery = db
      .select({
        farmerId: payables.farmerId,
        outstandingAmount: sql<number>`coalesce(sum(${payables.outstandingAmount}), 0)`.as(
          "outstandingAmount",
        ),
      })
      .from(payables)
      .where(
        and(
          eq(payables.partyType, "farmer"),
          inArray(payables.status, ["unpaid", "partial", "overdue"]),
        ),
      )
      .groupBy(payables.farmerId)
      .as("farmer_outstanding");

    const storeReceivableSubquery = db
      .select({
        farmerId: customers.farmerId,
        storeOutstanding: sql<number>`coalesce(sum(${receivables.outstandingAmount}), 0)`.as(
          "storeOutstanding",
        ),
      })
      .from(receivables)
      .innerJoin(customers, eq(receivables.customerId, customers.id))
      .where(
        and(
          eq(receivables.partyType, "customer"),
          inArray(receivables.status, ["unpaid", "partial", "overdue"]),
        ),
      )
      .groupBy(customers.farmerId)
      .as("farmer_store_outstanding");

    const rows = await db
      .select({
        ...getTableColumns(farmers),
        outstandingAmount: sql<number>`coalesce(${outstandingSubquery.outstandingAmount}, 0)`,
        storeReceivableOutstanding: sql<number>`coalesce(${storeReceivableSubquery.storeOutstanding}, 0)`,
      })
      .from(farmers)
      .leftJoin(outstandingSubquery, eq(outstandingSubquery.farmerId, farmers.id))
      .leftJoin(
        storeReceivableSubquery,
        eq(storeReceivableSubquery.farmerId, farmers.id),
      )
      .where(eq(farmers.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  if (entity === "transport-personnel") {
    const rows = await db
      .select({
        ...getTableColumns(transportPersonnel),
        primaryVehicleCode: vehicles.code,
        primaryVehiclePlateNumber: vehicles.plateNumber,
      })
      .from(transportPersonnel)
      .leftJoin(vehicles, eq(transportPersonnel.primaryVehicleId, vehicles.id))
      .where(eq(transportPersonnel.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  const table = simpleMasterTables[entity as keyof typeof simpleMasterTables];
  if (!table) return null;

  const rows = await db.select().from(table).where(eq(table.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listProductPriceHistories(productId: string, limit = 20) {
  return db
    .select({
      ...getTableColumns(productPriceHistories),
      createdByName: users.fullName,
    })
    .from(productPriceHistories)
    .leftJoin(users, eq(productPriceHistories.createdBy, users.id))
    .where(eq(productPriceHistories.productId, productId))
    .orderBy(desc(productPriceHistories.effectiveFrom), desc(productPriceHistories.createdAt))
    .limit(limit);
}

export async function createProductPriceHistory(
  values: typeof productPriceHistories.$inferInsert,
) {
  const [row] = await db
    .insert(productPriceHistories)
    .values(values)
    .returning();

  return row;
}

export async function getLatestProductPriceHistory(productId: string) {
  const [row] = await db
    .select()
    .from(productPriceHistories)
    .where(eq(productPriceHistories.productId, productId))
    .orderBy(desc(productPriceHistories.effectiveFrom), desc(productPriceHistories.createdAt))
    .limit(1);

  return row ?? null;
}

export async function listProductsByCodes(codes: string[]) {
  if (!codes.length) return [];

  return db
    .select({
      ...getTableColumns(products),
      categoryName: productCategories.name,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(inArray(products.code, codes));
}

export async function listProductCategoriesByCodes(codes: string[]) {
  if (!codes.length) return [];

  return db
    .select()
    .from(productCategories)
    .where(inArray(productCategories.code, codes));
}

export async function listFarmersByCodes(codes: string[]) {
  if (!codes.length) return [];

  return db
    .select()
    .from(farmers)
    .where(inArray(farmers.code, codes));
}

export async function findMasterByCode(
  entity: MasterEntityKey,
  code: string,
  excludeId?: string,
) {
  const table =
    entity === "products"
      ? products
      : entity === "users"
        ? null
        : entity === "transport-personnel"
          ? transportPersonnel
        : simpleMasterTables[entity as keyof typeof simpleMasterTables];

  if (!table || !("code" in getTableColumns(table))) {
    return null;
  }

  const codeColumn = getTableColumns(table).code;
  const conditions = [eq(codeColumn as never, code)];

  if (excludeId) {
    conditions.push(eq(table.id, excludeId));
  }

  const rows = await db
    .select()
    .from(table)
    .where(eq(codeColumn as never, code))
    .limit(1);

  const record = rows[0] ?? null;
  if (record && excludeId && record.id === excludeId) return null;

  return record;
}

export async function createMasterRecord(
  entity: MasterEntityKey,
  values: Record<string, unknown>,
) {
  if (entity === "users") {
    const [row] = await db.insert(users).values(values as typeof users.$inferInsert).returning();
    return row;
  }

  if (entity === "products") {
    const [row] = await db
      .insert(products)
      .values(values as typeof products.$inferInsert)
      .returning();
    return row;
  }

  if (entity === "transport-personnel") {
    const [row] = await db
      .insert(transportPersonnel)
      .values(values as typeof transportPersonnel.$inferInsert)
      .returning();
    return row;
  }

  const table = simpleMasterTables[entity as keyof typeof simpleMasterTables];
  const [row] = await db
    .insert(table)
    .values(values as never)
    .returning();

  return row;
}

export async function updateMasterRecord(
  entity: MasterEntityKey,
  id: string,
  values: Record<string, unknown>,
) {
  if (entity === "users") {
    const [row] = await db
      .update(users)
      .set(values as typeof users.$inferInsert)
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  if (entity === "products") {
    const [row] = await db
      .update(products)
      .set(values as typeof products.$inferInsert)
      .where(eq(products.id, id))
      .returning();
    return row ?? null;
  }

  if (entity === "transport-personnel") {
    const [row] = await db
      .update(transportPersonnel)
      .set(values as typeof transportPersonnel.$inferInsert)
      .where(eq(transportPersonnel.id, id))
      .returning();
    return row ?? null;
  }

  const table = simpleMasterTables[entity as keyof typeof simpleMasterTables];
  const [row] = await db
    .update(table)
    .set(values as never)
    .where(eq(table.id, id))
    .returning();

  return row ?? null;
}

export async function updateMasterStatus(
  entity: MasterEntityKey,
  id: string,
  isActive: boolean,
) {
  if (entity === "roles") {
    throw new Error("Roles do not support activate/deactivate.");
  }

  const table =
    entity === "users"
      ? users
      : entity === "products"
        ? products
        : entity === "transport-personnel"
          ? transportPersonnel
        : simpleMasterTables[entity as keyof typeof simpleMasterTables];

  const [row] = await db
    .update(table)
    .set({
      isActive,
      updatedAt: new Date(),
    } as never)
    .where(eq(table.id, id))
    .returning();

  return row ?? null;
}

export async function getMasterFormOptions() {
  const [roleOptions, categoryOptions, vehicleOptions, farmerOptions] = await Promise.all([
    db.select({ id: roles.id, label: roles.name }).from(roles).orderBy(asc(roles.name)),
    db
      .select({ id: productCategories.id, label: productCategories.name })
      .from(productCategories)
      .orderBy(asc(productCategories.name)),
    db
      .select({
        id: vehicles.id,
        label: sql<string>`concat(${vehicles.plateNumber}, ' • ', coalesce(${vehicles.type}, '-'))`,
      })
      .from(vehicles)
      .where(eq(vehicles.isActive, true))
      .orderBy(asc(vehicles.plateNumber)),
    db
      .select({
        id: farmers.id,
        label: sql<string>`concat(${farmers.name}, ' • ', ${farmers.code})`,
      })
      .from(farmers)
      .where(eq(farmers.isActive, true))
      .orderBy(asc(farmers.name)),
  ]);

  return {
    roles: roleOptions,
    categories: categoryOptions,
    vehicles: vehicleOptions,
    farmers: farmerOptions,
  };
}
