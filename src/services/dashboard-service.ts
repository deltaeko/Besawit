import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  customers,
  factories,
  farmers,
  payables,
  products,
  receivables,
  stockBalances,
  stockTakeItems,
  storeSales,
  suppliers,
  tbsPurchases,
  tbsSales,
} from "@/lib/db/schema";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getJakartaDateString(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function resolveSelectedDate(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return getJakartaDateString();
}

function getDateRange(date: string) {
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(start.getTime() + DAY_IN_MS);

  return { start, end };
}

function getPreviousDate(date: string) {
  const { start } = getDateRange(date);
  return getJakartaDateString(new Date(start.getTime() - DAY_IN_MS));
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

type TbsPurchaseAggregateRow = {
  transactionCount: number;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  totalPurchase: number;
};

type TbsSaleAggregateRow = {
  transactionCount: number;
  netWeightFinal: number;
  totalSales: number;
  returnWeight: number;
  totalDeduction: number;
};

async function getTbsPurchaseAggregate(start: Date, end: Date) {
  const [row] = await db
    .select({
      transactionCount: sql<number>`count(*)`,
      grossWeight: sql<number>`coalesce(sum(${tbsPurchases.grossWeight}), 0)`,
      tareWeight: sql<number>`coalesce(sum(${tbsPurchases.tareWeight}), 0)`,
      netWeight: sql<number>`coalesce(sum(${tbsPurchases.netWeight}), 0)`,
      totalPurchase: sql<number>`coalesce(sum(${tbsPurchases.totalPurchase}), 0)`,
    })
    .from(tbsPurchases)
    .where(
      and(
        eq(tbsPurchases.status, "active"),
        gte(tbsPurchases.purchaseDate, start),
        lt(tbsPurchases.purchaseDate, end),
      ),
    );

  return {
    transactionCount: toNumber(row?.transactionCount),
    grossWeight: toNumber(row?.grossWeight),
    tareWeight: toNumber(row?.tareWeight),
    netWeight: toNumber(row?.netWeight),
    totalPurchase: toNumber(row?.totalPurchase),
  } satisfies TbsPurchaseAggregateRow;
}

async function getTbsPurchaseDeductionAggregate(start: Date, end: Date) {
  const [row] = await db
    .select({
      totalDeduction: sql<number>`coalesce(sum(${tbsSales.totalDeduction}), 0)`,
    })
    .from(tbsSales)
    .innerJoin(
      tbsPurchases,
      eq(tbsSales.referencePurchaseId, tbsPurchases.id),
    )
    .where(
      and(
        eq(tbsSales.status, "active"),
        eq(tbsPurchases.status, "active"),
        gte(tbsPurchases.purchaseDate, start),
        lt(tbsPurchases.purchaseDate, end),
      ),
    );

  return {
    totalDeduction: toNumber(row?.totalDeduction),
  };
}

async function getTbsSaleAggregate(start: Date, end: Date) {
  const [row] = await db
    .select({
      transactionCount: sql<number>`count(*)`,
      netWeightFinal: sql<number>`coalesce(sum(${tbsSales.netWeightFinal}), 0)`,
      totalSales: sql<number>`coalesce(sum(${tbsSales.totalSales}), 0)`,
      returnWeight: sql<number>`coalesce(sum(${tbsSales.returnWeight}), 0)`,
      totalDeduction: sql<number>`coalesce(sum(${tbsSales.totalDeduction}), 0)`,
    })
    .from(tbsSales)
    .where(
      and(
        eq(tbsSales.status, "active"),
        gte(tbsSales.saleDate, start),
        lt(tbsSales.saleDate, end),
      ),
    );

  return {
    transactionCount: toNumber(row?.transactionCount),
    netWeightFinal: toNumber(row?.netWeightFinal),
    totalSales: toNumber(row?.totalSales),
    returnWeight: toNumber(row?.returnWeight),
    totalDeduction: toNumber(row?.totalDeduction),
  } satisfies TbsSaleAggregateRow;
}

export async function getTbsPurchaseDailySummary(selectedDateParam?: string) {
  const selectedDate = resolveSelectedDate(selectedDateParam);
  const previousDate = getPreviousDate(selectedDate);

  const currentRange = getDateRange(selectedDate);
  const previousRange = getDateRange(previousDate);

  const [currentMetrics, previousMetrics, currentDeductions, previousDeductions, topFarmers, purchases] =
    await Promise.all([
      getTbsPurchaseAggregate(currentRange.start, currentRange.end),
      getTbsPurchaseAggregate(previousRange.start, previousRange.end),
      getTbsPurchaseDeductionAggregate(currentRange.start, currentRange.end),
      getTbsPurchaseDeductionAggregate(previousRange.start, previousRange.end),
      db
        .select({
          farmerId: tbsPurchases.farmerId,
          farmerName: farmers.name,
          transactionCount: sql<number>`count(*)`,
          netWeight: sql<number>`coalesce(sum(${tbsPurchases.netWeight}), 0)`,
          totalPurchase: sql<number>`coalesce(sum(${tbsPurchases.totalPurchase}), 0)`,
        })
        .from(tbsPurchases)
        .innerJoin(farmers, eq(tbsPurchases.farmerId, farmers.id))
        .where(
          and(
            eq(tbsPurchases.status, "active"),
            gte(tbsPurchases.purchaseDate, currentRange.start),
            lt(tbsPurchases.purchaseDate, currentRange.end),
          ),
        )
        .groupBy(tbsPurchases.farmerId, farmers.name)
        .orderBy(
          desc(sql`coalesce(sum(${tbsPurchases.netWeight}), 0)`),
          desc(sql`count(*)`),
        )
        .limit(5),
      db
        .select({
          id: tbsPurchases.id,
          code: tbsPurchases.code,
          purchaseDate: tbsPurchases.purchaseDate,
          farmerName: farmers.name,
          grossWeight: tbsPurchases.grossWeight,
          tareWeight: tbsPurchases.tareWeight,
          netWeight: tbsPurchases.netWeight,
          totalPurchase: tbsPurchases.totalPurchase,
          paymentStatus: tbsPurchases.paymentStatus,
        })
        .from(tbsPurchases)
        .leftJoin(farmers, eq(tbsPurchases.farmerId, farmers.id))
        .where(
          and(
            eq(tbsPurchases.status, "active"),
            gte(tbsPurchases.purchaseDate, currentRange.start),
            lt(tbsPurchases.purchaseDate, currentRange.end),
          ),
        )
        .orderBy(desc(tbsPurchases.purchaseDate), desc(tbsPurchases.createdAt))
        .limit(8),
    ]);

  return {
    selectedDate,
    selectedDateLabel: formatDateLabel(selectedDate),
    previousDate,
    previousDateLabel: formatDateLabel(previousDate),
    metrics: {
      ...currentMetrics,
      totalDeduction: currentDeductions.totalDeduction,
    },
    previousMetrics: {
      ...previousMetrics,
      totalDeduction: previousDeductions.totalDeduction,
    },
    topFarmers: topFarmers.map((row) => ({
      farmerId: row.farmerId,
      farmerName: row.farmerName ?? "Tanpa nama",
      transactionCount: toNumber(row.transactionCount),
      netWeight: toNumber(row.netWeight),
      totalPurchase: toNumber(row.totalPurchase),
    })),
    purchases: purchases.map((row) => ({
      id: row.id,
      code: row.code,
      purchaseDate: row.purchaseDate,
      farmerName: row.farmerName ?? "Tanpa nama",
      grossWeight: toNumber(row.grossWeight),
      tareWeight: toNumber(row.tareWeight),
      netWeight: toNumber(row.netWeight),
      totalPurchase: toNumber(row.totalPurchase),
      paymentStatus: row.paymentStatus,
    })),
  };
}

export async function getTbsSaleDailySummary(selectedDateParam?: string) {
  const selectedDate = resolveSelectedDate(selectedDateParam);
  const previousDate = getPreviousDate(selectedDate);

  const currentRange = getDateRange(selectedDate);
  const previousRange = getDateRange(previousDate);

  const [currentMetrics, previousMetrics, topFactories, sales] = await Promise.all([
    getTbsSaleAggregate(currentRange.start, currentRange.end),
    getTbsSaleAggregate(previousRange.start, previousRange.end),
    db
      .select({
        factoryId: tbsSales.factoryId,
        factoryName: factories.name,
        transactionCount: sql<number>`count(*)`,
        netWeightFinal: sql<number>`coalesce(sum(${tbsSales.netWeightFinal}), 0)`,
        totalSales: sql<number>`coalesce(sum(${tbsSales.totalSales}), 0)`,
      })
      .from(tbsSales)
      .innerJoin(factories, eq(tbsSales.factoryId, factories.id))
      .where(
        and(
          eq(tbsSales.status, "active"),
          gte(tbsSales.saleDate, currentRange.start),
          lt(tbsSales.saleDate, currentRange.end),
        ),
      )
      .groupBy(tbsSales.factoryId, factories.name)
      .orderBy(
        desc(sql`coalesce(sum(${tbsSales.totalSales}), 0)`),
        desc(sql`count(*)`),
      )
      .limit(5),
    db
      .select({
        id: tbsSales.id,
        code: tbsSales.code,
        saleDate: tbsSales.saleDate,
        factoryName: factories.name,
        netWeightFinal: tbsSales.netWeightFinal,
        totalSales: tbsSales.totalSales,
        returnWeight: tbsSales.returnWeight,
        totalDeduction: tbsSales.totalDeduction,
        paymentStatus: tbsSales.paymentStatus,
      })
      .from(tbsSales)
      .leftJoin(factories, eq(tbsSales.factoryId, factories.id))
      .where(
        and(
          eq(tbsSales.status, "active"),
          gte(tbsSales.saleDate, currentRange.start),
          lt(tbsSales.saleDate, currentRange.end),
        ),
      )
      .orderBy(desc(tbsSales.saleDate), desc(tbsSales.createdAt))
      .limit(8),
  ]);

  return {
    selectedDate,
    selectedDateLabel: formatDateLabel(selectedDate),
    previousDate,
    previousDateLabel: formatDateLabel(previousDate),
    metrics: currentMetrics,
    previousMetrics,
    topFactories: topFactories.map((row) => ({
      factoryId: row.factoryId,
      factoryName: row.factoryName ?? "Tanpa nama",
      transactionCount: toNumber(row.transactionCount),
      netWeightFinal: toNumber(row.netWeightFinal),
      totalSales: toNumber(row.totalSales),
    })),
    sales: sales.map((row) => ({
      id: row.id,
      code: row.code,
      saleDate: row.saleDate,
      factoryName: row.factoryName ?? "Tanpa nama",
      netWeightFinal: toNumber(row.netWeightFinal),
      totalSales: toNumber(row.totalSales),
      returnWeight: toNumber(row.returnWeight),
      totalDeduction: toNumber(row.totalDeduction),
      paymentStatus: row.paymentStatus,
    })),
  };
}

export async function getFinanceInventorySummary() {
  const activeStatuses = ["unpaid", "partial", "overdue"] as const;

  const [
    [receivableRow],
    [payableRow],
    [stockRow],
    [criticalRow],
    nearestReceivables,
    nearestSupplierPayables,
    topFarmerPayables,
  ] = await Promise.all([
    db
      .select({
        outstandingAmount: sql<number>`coalesce(sum(${receivables.outstandingAmount}), 0)`,
        totalCount: sql<number>`count(*)`,
      })
      .from(receivables)
      .where(inArray(receivables.status, activeStatuses)),
    db
      .select({
        outstandingAmount: sql<number>`coalesce(sum(${payables.outstandingAmount}), 0)`,
        totalCount: sql<number>`count(*)`,
      })
      .from(payables)
      .where(inArray(payables.status, activeStatuses)),
    db
      .select({
        totalQuantity: sql<number>`coalesce(sum(${stockBalances.quantity}), 0)`,
        totalProducts: sql<number>`count(*)`,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .where(eq(products.isActive, true)),
    db
      .select({
        criticalCount: sql<number>`count(*)`,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`${stockBalances.quantity} <= ${products.minStock}`,
        ),
      ),
    db
      .select({
        id: receivables.id,
        code: receivables.code,
        dueDate: receivables.dueDate,
        outstandingAmount: receivables.outstandingAmount,
        status: receivables.status,
        partyType: receivables.partyType,
        factoryName: factories.name,
        customerName: customers.name,
      })
      .from(receivables)
      .leftJoin(factories, eq(receivables.factoryId, factories.id))
      .leftJoin(customers, eq(receivables.customerId, customers.id))
      .where(
        and(
          inArray(receivables.status, activeStatuses),
          sql`${receivables.dueDate} is not null`,
        ),
      )
      .orderBy(sql`${receivables.dueDate} asc`)
      .limit(5),
    db
      .select({
        id: payables.id,
        code: payables.code,
        dueDate: payables.dueDate,
        outstandingAmount: payables.outstandingAmount,
        status: payables.status,
        supplierName: suppliers.name,
      })
      .from(payables)
      .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
      .where(
        and(
          eq(payables.partyType, "supplier"),
          inArray(payables.status, activeStatuses),
          sql`${payables.dueDate} is not null`,
        ),
      )
      .orderBy(sql`${payables.dueDate} asc`)
      .limit(5),
    db
      .select({
        farmerId: farmers.id,
        farmerName: farmers.name,
        outstandingAmount: sql<number>`coalesce(sum(${payables.outstandingAmount}), 0)`,
        documentCount: sql<number>`count(${payables.id})`,
      })
      .from(payables)
      .innerJoin(farmers, eq(payables.farmerId, farmers.id))
      .where(
        and(
          eq(payables.partyType, "farmer"),
          inArray(payables.status, activeStatuses),
        ),
      )
      .groupBy(farmers.id, farmers.name)
      .orderBy(desc(sql`coalesce(sum(${payables.outstandingAmount}), 0)`))
      .limit(10),
  ]);

  return {
    metrics: {
      activeReceivables: toNumber(receivableRow?.outstandingAmount),
      activeReceivableCount: toNumber(receivableRow?.totalCount),
      activePayables: toNumber(payableRow?.outstandingAmount),
      activePayableCount: toNumber(payableRow?.totalCount),
      currentStockQuantity: toNumber(stockRow?.totalQuantity),
      activeStockProductCount: toNumber(stockRow?.totalProducts),
      criticalStockCount: toNumber(criticalRow?.criticalCount),
    },
    nearestReceivables: nearestReceivables.map((row) => ({
      id: row.id,
      code: row.code,
      dueDate: row.dueDate,
      outstandingAmount: toNumber(row.outstandingAmount),
      status: row.status,
      partyLabel:
        row.partyType === "factory"
          ? row.factoryName ?? "Pabrik"
          : row.customerName ?? "Pelanggan",
    })),
    nearestSupplierPayables: nearestSupplierPayables.map((row) => ({
      id: row.id,
      code: row.code,
      dueDate: row.dueDate,
      outstandingAmount: toNumber(row.outstandingAmount),
      status: row.status,
      supplierName: row.supplierName ?? "Supplier",
    })),
    topFarmerPayables: topFarmerPayables.map((row) => ({
      farmerId: row.farmerId,
      farmerName: row.farmerName ?? "Tanpa nama",
      outstandingAmount: toNumber(row.outstandingAmount),
      documentCount: toNumber(row.documentCount),
    })),
  };
}

export async function getDashboardSummary(selectedDateParam?: string) {
  const selectedDate = resolveSelectedDate(selectedDateParam);
  const currentRange = getDateRange(selectedDate);

  const [
    [purchaseRow],
    [salesRow],
    [marginRow],
    [payableRow],
    [receivableRow],
    [lowStockRow],
    [varianceRow],
    recentPalmPurchases,
    recentStoreSales,
    recentPalmSales,
  ] = await Promise.all([
    db
      .select({
        value: sql<number>`coalesce(sum(${tbsPurchases.totalPurchase}), 0)`,
      })
      .from(tbsPurchases)
      .where(
        and(
          eq(tbsPurchases.status, "active"),
          gte(tbsPurchases.purchaseDate, currentRange.start),
          lt(tbsPurchases.purchaseDate, currentRange.end),
        ),
      ),
    db
      .select({
        value: sql<number>`coalesce(sum(${tbsSales.totalSales}), 0)`,
      })
      .from(tbsSales)
      .where(
        and(
          eq(tbsSales.status, "active"),
          gte(tbsSales.saleDate, currentRange.start),
          lt(tbsSales.saleDate, currentRange.end),
        ),
      ),
    db
      .select({
        value: sql<number>`coalesce(sum(${tbsSales.margin}), 0)`,
      })
      .from(tbsSales)
      .where(
        and(
          eq(tbsSales.status, "active"),
          gte(tbsSales.saleDate, currentRange.start),
          lt(tbsSales.saleDate, currentRange.end),
        ),
      ),
    db
      .select({
        value: sql<number>`coalesce(sum(${payables.outstandingAmount}), 0)`,
      })
      .from(payables),
    db
      .select({
        value: sql<number>`coalesce(sum(${receivables.outstandingAmount}), 0)`,
      })
      .from(receivables),
    db
      .select({
        value: sql<number>`count(*)`,
      })
      .from(stockBalances)
      .where(sql`${stockBalances.quantity} <= 0`),
    db
      .select({
        value: sql<number>`coalesce(sum(abs(${stockTakeItems.varianceValue})), 0)`,
      })
      .from(stockTakeItems),
    db
      .select()
      .from(tbsPurchases)
      .where(eq(tbsPurchases.status, "active"))
      .orderBy(desc(tbsPurchases.purchaseDate), desc(tbsPurchases.createdAt))
      .limit(4),
    db
      .select()
      .from(storeSales)
      .orderBy(desc(storeSales.transactionDate), desc(storeSales.createdAt))
      .limit(4),
    db
      .select()
      .from(tbsSales)
      .orderBy(desc(tbsSales.saleDate), desc(tbsSales.createdAt))
      .limit(4),
  ]);

  const recentTransactions = [...recentPalmPurchases, ...recentPalmSales, ...recentStoreSales]
    .sort((left, right) => {
      const leftDate = new Date(
        String(
          (left as Record<string, unknown>).saleDate ??
            (left as Record<string, unknown>).transactionDate ??
            (left as Record<string, unknown>).purchaseDate ??
            0,
        ),
      ).getTime();
      const rightDate = new Date(
        String(
          (right as Record<string, unknown>).saleDate ??
            (right as Record<string, unknown>).transactionDate ??
            (right as Record<string, unknown>).purchaseDate ??
            0,
        ),
      ).getTime();

      return rightDate - leftDate;
    })
    .slice(0, 8);

  return {
    kpis: [
      { label: "TBS Purchase", value: purchaseRow?.value ?? 0 },
      { label: "TBS Sales", value: salesRow?.value ?? 0 },
      { label: "Margin", value: marginRow?.value ?? 0 },
      { label: "Payables", value: payableRow?.value ?? 0 },
      { label: "Receivables", value: receivableRow?.value ?? 0 },
      { label: "Low Stock Items", value: lowStockRow?.value ?? 0 },
      { label: "Stock Take Variance", value: varianceRow?.value ?? 0 },
    ],
    recentTransactions,
  };
}
