import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  customers,
  factories,
  farmers,
  payables,
  products,
  receivables,
  stockBalances,
  stockTakeItems,
  storePurchases,
  storeSales,
  suppliers,
  tbsPurchases,
  tbsSales,
  users,
  warehouses,
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

function formatShortDateLabel(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

function getRollingDates(endDate: string, days: number) {
  const { start } = getDateRange(endDate);

  return Array.from({ length: days }, (_, index) =>
    getJakartaDateString(new Date(start.getTime() - (days - index - 1) * DAY_IN_MS)),
  );
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export type DashboardOnboardingSummary = {
  activeWarehouseCount: number;
  activeProductCount: number;
  activeUserCount: number;
  activePartnerCount: number;
  activeFarmerCount: number;
  activeFactoryCount: number;
  activeCustomerCount: number;
  activeSupplierCount: number;
  activePalmPurchaseCount: number;
  activePalmSaleCount: number;
  activeStorePurchaseCount: number;
  activeStoreSaleCount: number;
  totalTransactionCount: number;
};

export type DashboardTrendPoint = {
  date: string;
  shortLabel: string;
  purchaseValue: number;
  purchaseTransactionCount: number;
  salesValue: number;
  salesTransactionCount: number;
  marginValue: number;
};

export type FinanceExposureTrendPoint = {
  date: string;
  shortLabel: string;
  receivableValue: number;
  receivableCount: number;
  payableValue: number;
  payableCount: number;
};

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
  margin: number;
};

async function getTbsPurchaseAggregate(start: Date, end: Date) {
  const db = await getDb();
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

async function getTbsPurchaseAggregateComparison(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date,
) {
  const db = await getDb();
  const [row] = await db
    .select({
      currentTransactionCount: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${currentStart} and ${tbsPurchases.purchaseDate} < ${currentEnd} then 1 else 0 end), 0)`,
      currentGrossWeight: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${currentStart} and ${tbsPurchases.purchaseDate} < ${currentEnd} then ${tbsPurchases.grossWeight} else 0 end), 0)`,
      currentTareWeight: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${currentStart} and ${tbsPurchases.purchaseDate} < ${currentEnd} then ${tbsPurchases.tareWeight} else 0 end), 0)`,
      currentNetWeight: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${currentStart} and ${tbsPurchases.purchaseDate} < ${currentEnd} then ${tbsPurchases.netWeight} else 0 end), 0)`,
      currentTotalPurchase: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${currentStart} and ${tbsPurchases.purchaseDate} < ${currentEnd} then ${tbsPurchases.totalPurchase} else 0 end), 0)`,
      previousTransactionCount: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${previousStart} and ${tbsPurchases.purchaseDate} < ${previousEnd} then 1 else 0 end), 0)`,
      previousGrossWeight: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${previousStart} and ${tbsPurchases.purchaseDate} < ${previousEnd} then ${tbsPurchases.grossWeight} else 0 end), 0)`,
      previousTareWeight: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${previousStart} and ${tbsPurchases.purchaseDate} < ${previousEnd} then ${tbsPurchases.tareWeight} else 0 end), 0)`,
      previousNetWeight: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${previousStart} and ${tbsPurchases.purchaseDate} < ${previousEnd} then ${tbsPurchases.netWeight} else 0 end), 0)`,
      previousTotalPurchase: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${previousStart} and ${tbsPurchases.purchaseDate} < ${previousEnd} then ${tbsPurchases.totalPurchase} else 0 end), 0)`,
    })
    .from(tbsPurchases)
    .where(
      and(
        eq(tbsPurchases.status, "active"),
        gte(tbsPurchases.purchaseDate, previousStart),
        lt(tbsPurchases.purchaseDate, currentEnd),
      ),
    );

  return {
    current: {
      transactionCount: toNumber(row?.currentTransactionCount),
      grossWeight: toNumber(row?.currentGrossWeight),
      tareWeight: toNumber(row?.currentTareWeight),
      netWeight: toNumber(row?.currentNetWeight),
      totalPurchase: toNumber(row?.currentTotalPurchase),
    } satisfies TbsPurchaseAggregateRow,
    previous: {
      transactionCount: toNumber(row?.previousTransactionCount),
      grossWeight: toNumber(row?.previousGrossWeight),
      tareWeight: toNumber(row?.previousTareWeight),
      netWeight: toNumber(row?.previousNetWeight),
      totalPurchase: toNumber(row?.previousTotalPurchase),
    } satisfies TbsPurchaseAggregateRow,
  };
}

async function getTbsPurchaseDeductionAggregate(start: Date, end: Date) {
  const db = await getDb();
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

async function getTbsPurchaseDeductionAggregateComparison(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date,
) {
  const db = await getDb();
  const [row] = await db
    .select({
      currentTotalDeduction: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${currentStart} and ${tbsPurchases.purchaseDate} < ${currentEnd} then ${tbsSales.totalDeduction} else 0 end), 0)`,
      previousTotalDeduction: sql<number>`coalesce(sum(case when ${tbsPurchases.purchaseDate} >= ${previousStart} and ${tbsPurchases.purchaseDate} < ${previousEnd} then ${tbsSales.totalDeduction} else 0 end), 0)`,
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
        gte(tbsPurchases.purchaseDate, previousStart),
        lt(tbsPurchases.purchaseDate, currentEnd),
      ),
    );

  return {
    current: {
      totalDeduction: toNumber(row?.currentTotalDeduction),
    },
    previous: {
      totalDeduction: toNumber(row?.previousTotalDeduction),
    },
  };
}

async function getTbsSaleAggregate(start: Date, end: Date) {
  const db = await getDb();
  const [row] = await db
    .select({
      transactionCount: sql<number>`count(*)`,
      netWeightFinal: sql<number>`coalesce(sum(${tbsSales.netWeightFinal}), 0)`,
      totalSales: sql<number>`coalesce(sum(${tbsSales.totalSales}), 0)`,
      returnWeight: sql<number>`coalesce(sum(${tbsSales.returnWeight}), 0)`,
      totalDeduction: sql<number>`coalesce(sum(${tbsSales.totalDeduction}), 0)`,
      margin: sql<number>`coalesce(sum(${tbsSales.margin}), 0)`,
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
    margin: toNumber(row?.margin),
  } satisfies TbsSaleAggregateRow;
}

async function getTbsSaleAggregateComparison(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date,
) {
  const db = await getDb();
  const [row] = await db
    .select({
      currentTransactionCount: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${currentStart} and ${tbsSales.saleDate} < ${currentEnd} then 1 else 0 end), 0)`,
      currentNetWeightFinal: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${currentStart} and ${tbsSales.saleDate} < ${currentEnd} then ${tbsSales.netWeightFinal} else 0 end), 0)`,
      currentTotalSales: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${currentStart} and ${tbsSales.saleDate} < ${currentEnd} then ${tbsSales.totalSales} else 0 end), 0)`,
      currentReturnWeight: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${currentStart} and ${tbsSales.saleDate} < ${currentEnd} then ${tbsSales.returnWeight} else 0 end), 0)`,
      currentTotalDeduction: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${currentStart} and ${tbsSales.saleDate} < ${currentEnd} then ${tbsSales.totalDeduction} else 0 end), 0)`,
      currentMargin: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${currentStart} and ${tbsSales.saleDate} < ${currentEnd} then ${tbsSales.margin} else 0 end), 0)`,
      previousTransactionCount: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${previousStart} and ${tbsSales.saleDate} < ${previousEnd} then 1 else 0 end), 0)`,
      previousNetWeightFinal: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${previousStart} and ${tbsSales.saleDate} < ${previousEnd} then ${tbsSales.netWeightFinal} else 0 end), 0)`,
      previousTotalSales: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${previousStart} and ${tbsSales.saleDate} < ${previousEnd} then ${tbsSales.totalSales} else 0 end), 0)`,
      previousReturnWeight: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${previousStart} and ${tbsSales.saleDate} < ${previousEnd} then ${tbsSales.returnWeight} else 0 end), 0)`,
      previousTotalDeduction: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${previousStart} and ${tbsSales.saleDate} < ${previousEnd} then ${tbsSales.totalDeduction} else 0 end), 0)`,
      previousMargin: sql<number>`coalesce(sum(case when ${tbsSales.saleDate} >= ${previousStart} and ${tbsSales.saleDate} < ${previousEnd} then ${tbsSales.margin} else 0 end), 0)`,
    })
    .from(tbsSales)
    .where(
      and(
        eq(tbsSales.status, "active"),
        gte(tbsSales.saleDate, previousStart),
        lt(tbsSales.saleDate, currentEnd),
      ),
    );

  return {
    current: {
      transactionCount: toNumber(row?.currentTransactionCount),
      netWeightFinal: toNumber(row?.currentNetWeightFinal),
      totalSales: toNumber(row?.currentTotalSales),
      returnWeight: toNumber(row?.currentReturnWeight),
      totalDeduction: toNumber(row?.currentTotalDeduction),
      margin: toNumber(row?.currentMargin),
    } satisfies TbsSaleAggregateRow,
    previous: {
      transactionCount: toNumber(row?.previousTransactionCount),
      netWeightFinal: toNumber(row?.previousNetWeightFinal),
      totalSales: toNumber(row?.previousTotalSales),
      returnWeight: toNumber(row?.previousReturnWeight),
      totalDeduction: toNumber(row?.previousTotalDeduction),
      margin: toNumber(row?.previousMargin),
    } satisfies TbsSaleAggregateRow,
  };
}

export async function getTbsPurchaseDailySummary(selectedDateParam?: string) {
  const db = await getDb();
  const selectedDate = resolveSelectedDate(selectedDateParam);
  const previousDate = getPreviousDate(selectedDate);

  const currentRange = getDateRange(selectedDate);
  const previousRange = getDateRange(previousDate);

  const [aggregateComparison, deductionComparison, topFarmers, purchases] =
    await Promise.all([
      getTbsPurchaseAggregateComparison(
        currentRange.start,
        currentRange.end,
        previousRange.start,
        previousRange.end,
      ),
      getTbsPurchaseDeductionAggregateComparison(
        currentRange.start,
        currentRange.end,
        previousRange.start,
        previousRange.end,
      ),
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
      ...aggregateComparison.current,
      totalDeduction: deductionComparison.current.totalDeduction,
    },
    previousMetrics: {
      ...aggregateComparison.previous,
      totalDeduction: deductionComparison.previous.totalDeduction,
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
  const db = await getDb();
  const selectedDate = resolveSelectedDate(selectedDateParam);
  const previousDate = getPreviousDate(selectedDate);

  const currentRange = getDateRange(selectedDate);
  const previousRange = getDateRange(previousDate);

  const [aggregateComparison, topFactories, sales] = await Promise.all([
    getTbsSaleAggregateComparison(
      currentRange.start,
      currentRange.end,
      previousRange.start,
      previousRange.end,
    ),
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
    metrics: aggregateComparison.current,
    previousMetrics: aggregateComparison.previous,
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
  const db = await getDb();
  const activeStatuses = ["unpaid", "partial", "overdue"] as const;

  const [
    [receivableRow],
    [payableRow],
    [stockRow],
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
        criticalCount: sql<number>`coalesce(sum(case when ${stockBalances.quantity} <= ${products.minStock} then 1 else 0 end), 0)`,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .where(eq(products.isActive, true)),
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
      criticalStockCount: toNumber(stockRow?.criticalCount),
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

export async function getDashboardTrendSummary(selectedDateParam?: string) {
  const db = await getDb();
  const selectedDate = resolveSelectedDate(selectedDateParam);
  const dates = getRollingDates(selectedDate, 7);
  const firstRange = getDateRange(dates[0]);
  const selectedRange = getDateRange(selectedDate);

  const [purchaseRows, saleRows] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char((${tbsPurchases.purchaseDate} AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD')`,
        totalPurchase: sql<number>`coalesce(sum(${tbsPurchases.totalPurchase}), 0)`,
        transactionCount: sql<number>`count(*)`,
      })
      .from(tbsPurchases)
      .where(
        and(
          eq(tbsPurchases.status, "active"),
          gte(tbsPurchases.purchaseDate, firstRange.start),
          lt(tbsPurchases.purchaseDate, selectedRange.end),
        ),
      )
      .groupBy(sql`(${tbsPurchases.purchaseDate} AT TIME ZONE 'Asia/Jakarta')::date`)
      .orderBy(sql`(${tbsPurchases.purchaseDate} AT TIME ZONE 'Asia/Jakarta')::date asc`),
    db
      .select({
        day: sql<string>`to_char((${tbsSales.saleDate} AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD')`,
        totalSales: sql<number>`coalesce(sum(${tbsSales.totalSales}), 0)`,
        transactionCount: sql<number>`count(*)`,
        margin: sql<number>`coalesce(sum(${tbsSales.margin}), 0)`,
      })
      .from(tbsSales)
      .where(
        and(
          eq(tbsSales.status, "active"),
          gte(tbsSales.saleDate, firstRange.start),
          lt(tbsSales.saleDate, selectedRange.end),
        ),
      )
      .groupBy(sql`(${tbsSales.saleDate} AT TIME ZONE 'Asia/Jakarta')::date`)
      .orderBy(sql`(${tbsSales.saleDate} AT TIME ZONE 'Asia/Jakarta')::date asc`),
  ]);

  const purchaseMap = new Map(
    purchaseRows.map((row) => [
      row.day,
      {
        totalPurchase: toNumber(row.totalPurchase),
        transactionCount: toNumber(row.transactionCount),
      },
    ]),
  );
  const salesMap = new Map(
    saleRows.map((row) => [
      row.day,
      {
        totalSales: toNumber(row.totalSales),
        transactionCount: toNumber(row.transactionCount),
        margin: toNumber(row.margin),
      },
    ]),
  );

  const series = dates.map((date) => {
    const purchase = purchaseMap.get(date);
    const sale = salesMap.get(date);

    return {
      date,
      shortLabel: formatShortDateLabel(date),
      purchaseValue: purchase?.totalPurchase ?? 0,
      purchaseTransactionCount: purchase?.transactionCount ?? 0,
      salesValue: sale?.totalSales ?? 0,
      salesTransactionCount: sale?.transactionCount ?? 0,
      marginValue: sale?.margin ?? 0,
    } satisfies DashboardTrendPoint;
  });

  return {
    selectedDate,
    selectedDateLabel: formatDateLabel(selectedDate),
    periodStartLabel: formatDateLabel(dates[0]),
    periodEndLabel: formatDateLabel(selectedDate),
    series,
    summary: {
      totalPurchase: series.reduce((sum, item) => sum + item.purchaseValue, 0),
      totalSales: series.reduce((sum, item) => sum + item.salesValue, 0),
      totalMargin: series.reduce((sum, item) => sum + item.marginValue, 0),
      totalTransactions: series.reduce(
        (sum, item) => sum + item.purchaseTransactionCount + item.salesTransactionCount,
        0,
      ),
      maxValue: Math.max(
        0,
        ...series.map((item) => Math.max(item.purchaseValue, item.salesValue)),
      ),
    },
  };
}

export async function getFinanceExposureTrendSummary(selectedDateParam?: string) {
  const db = await getDb();
  const selectedDate = resolveSelectedDate(selectedDateParam);
  const dates = getRollingDates(selectedDate, 7);
  const firstRange = getDateRange(dates[0]);
  const selectedRange = getDateRange(selectedDate);
  const activeStatuses = ["unpaid", "partial", "overdue"] as const;

  const [receivableRows, payableRows] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char((${receivables.createdAt} AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD')`,
        amount: sql<number>`coalesce(sum(${receivables.outstandingAmount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(receivables)
      .where(
        and(
          inArray(receivables.status, activeStatuses),
          gte(receivables.createdAt, firstRange.start),
          lt(receivables.createdAt, selectedRange.end),
        ),
      )
      .groupBy(sql`(${receivables.createdAt} AT TIME ZONE 'Asia/Jakarta')::date`)
      .orderBy(sql`(${receivables.createdAt} AT TIME ZONE 'Asia/Jakarta')::date asc`),
    db
      .select({
        day: sql<string>`to_char((${payables.createdAt} AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD')`,
        amount: sql<number>`coalesce(sum(${payables.outstandingAmount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(payables)
      .where(
        and(
          inArray(payables.status, activeStatuses),
          gte(payables.createdAt, firstRange.start),
          lt(payables.createdAt, selectedRange.end),
        ),
      )
      .groupBy(sql`(${payables.createdAt} AT TIME ZONE 'Asia/Jakarta')::date`)
      .orderBy(sql`(${payables.createdAt} AT TIME ZONE 'Asia/Jakarta')::date asc`),
  ]);

  const receivableMap = new Map(
    receivableRows.map((row) => [
      row.day,
      {
        amount: toNumber(row.amount),
        count: toNumber(row.count),
      },
    ]),
  );
  const payableMap = new Map(
    payableRows.map((row) => [
      row.day,
      {
        amount: toNumber(row.amount),
        count: toNumber(row.count),
      },
    ]),
  );

  const series = dates.map((date) => {
    const receivable = receivableMap.get(date);
    const payable = payableMap.get(date);

    return {
      date,
      shortLabel: formatShortDateLabel(date),
      receivableValue: receivable?.amount ?? 0,
      receivableCount: receivable?.count ?? 0,
      payableValue: payable?.amount ?? 0,
      payableCount: payable?.count ?? 0,
    } satisfies FinanceExposureTrendPoint;
  });

  return {
    selectedDate,
    periodStartLabel: formatDateLabel(dates[0]),
    periodEndLabel: formatDateLabel(selectedDate),
    series,
    summary: {
      totalReceivableValue: series.reduce((sum, item) => sum + item.receivableValue, 0),
      totalPayableValue: series.reduce((sum, item) => sum + item.payableValue, 0),
      totalReceivableCount: series.reduce((sum, item) => sum + item.receivableCount, 0),
      totalPayableCount: series.reduce((sum, item) => sum + item.payableCount, 0),
      maxValue: Math.max(
        0,
        ...series.map((item) => Math.max(item.receivableValue, item.payableValue)),
      ),
    },
  };
}

export async function getDashboardSummary() {
  const db = await getDb();

  const [
    [varianceRow],
    recentPalmPurchases,
    recentStoreSales,
    recentPalmSales,
  ] = await Promise.all([
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
    stockTakeVariance: toNumber(varianceRow?.value),
    recentTransactions,
  };
}

export async function getDashboardOnboardingSummary(): Promise<DashboardOnboardingSummary> {
  const db = await getDb();

  const [
    [warehouseRow],
    [productRow],
    [userRow],
    [farmerRow],
    [factoryRow],
    [customerRow],
    [supplierRow],
    [palmPurchaseRow],
    [palmSaleRow],
    [storePurchaseRow],
    [storeSaleRow],
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(warehouses)
      .where(eq(warehouses.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(farmers)
      .where(eq(farmers.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(factories)
      .where(eq(factories.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(eq(suppliers.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tbsPurchases)
      .where(eq(tbsPurchases.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tbsSales)
      .where(eq(tbsSales.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(storePurchases)
      .where(eq(storePurchases.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(storeSales)
      .where(eq(storeSales.status, "active")),
  ]);

  const activeWarehouseCount = toNumber(warehouseRow?.count);
  const activeProductCount = toNumber(productRow?.count);
  const activeUserCount = toNumber(userRow?.count);
  const activeFarmerCount = toNumber(farmerRow?.count);
  const activeFactoryCount = toNumber(factoryRow?.count);
  const activeCustomerCount = toNumber(customerRow?.count);
  const activeSupplierCount = toNumber(supplierRow?.count);
  const activePalmPurchaseCount = toNumber(palmPurchaseRow?.count);
  const activePalmSaleCount = toNumber(palmSaleRow?.count);
  const activeStorePurchaseCount = toNumber(storePurchaseRow?.count);
  const activeStoreSaleCount = toNumber(storeSaleRow?.count);

  return {
    activeWarehouseCount,
    activeProductCount,
    activeUserCount,
    activePartnerCount:
      activeFarmerCount +
      activeFactoryCount +
      activeCustomerCount +
      activeSupplierCount,
    activeFarmerCount,
    activeFactoryCount,
    activeCustomerCount,
    activeSupplierCount,
    activePalmPurchaseCount,
    activePalmSaleCount,
    activeStorePurchaseCount,
    activeStoreSaleCount,
    totalTransactionCount:
      activePalmPurchaseCount +
      activePalmSaleCount +
      activeStorePurchaseCount +
      activeStoreSaleCount,
  };
}
