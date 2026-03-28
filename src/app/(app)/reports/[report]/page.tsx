import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileClock, Wallet } from "lucide-react";

import { BrowserPrintButton } from "@/components/shared/browser-print-button";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { reportConfig, isReportKey } from "@/modules/reports/config";
import { getFinanceInventorySummary } from "@/services/dashboard-service";
import {
  getCashLedgerPage,
  getPayableAging,
  getPayablePage,
  getReceivableAging,
  getReceivablePage,
  getStoreDebtOffsetReport,
} from "@/services/finance-service";
import {
  getStockAdjustmentSummary,
  getStockAdjustmentPage,
  getStockBalanceSummary,
  getStockBalancePage,
  getStockMovementPage,
  getStockTakeSummary,
  getStockTakePage,
} from "@/services/inventory-service";
import { getAllPalmPurchaseList, getAllPalmSaleList } from "@/services/palm-service";
import { getAllStorePurchaseList, getAllStoreSaleList } from "@/services/store-service";

type AgingSummary = {
  current: number;
  due1to7: number;
  due8to14: number;
  due15to30: number;
  dueOver30: number;
};

type ReportData =
  | {
      kind: "transactions";
      palmPurchases: Awaited<ReturnType<typeof getAllPalmPurchaseList>>;
      palmSales: Awaited<ReturnType<typeof getAllPalmSaleList>>;
      storePurchases: Awaited<ReturnType<typeof getAllStorePurchaseList>>;
      storeSales: Awaited<ReturnType<typeof getAllStoreSaleList>>;
    }
  | {
      kind: "profit-loss";
      finance: Awaited<ReturnType<typeof getFinanceInventorySummary>>;
      palmPurchases: Awaited<ReturnType<typeof getAllPalmPurchaseList>>;
      palmSales: Awaited<ReturnType<typeof getAllPalmSaleList>>;
      cashLedger: Awaited<ReturnType<typeof getCashLedgerPage>>;
      payableAging: AgingSummary;
      receivableAging: AgingSummary;
    }
  | {
      kind: "payables";
      payables: Awaited<ReturnType<typeof getPayablePage>>;
      aging: AgingSummary;
      finance: Awaited<ReturnType<typeof getFinanceInventorySummary>>;
    }
  | {
      kind: "receivables";
      receivables: Awaited<ReturnType<typeof getReceivablePage>>;
      aging: AgingSummary;
      finance: Awaited<ReturnType<typeof getFinanceInventorySummary>>;
    }
  | {
      kind: "store-debt-offsets";
      storeDebtOffsets: Awaited<ReturnType<typeof getStoreDebtOffsetReport>>;
    }
  | {
      kind: "snapshot";
      data: Record<string, unknown>;
    };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { report } = await params;
  const query = await searchParams;
  if (!isReportKey(report)) notFound();

  const dateFrom = typeof query.dateFrom === "string" ? query.dateFrom : "";
  const dateTo = typeof query.dateTo === "string" ? query.dateTo : "";
  const config = reportConfig[report];
  const reportData = await getReportData(report, { dateFrom, dateTo });
  const showPeriodFilter = isPeriodFilterableReport(report);

  return (
    <div className="space-y-6">
      <ReportPrintStyles />
      <PageHeader
        eyebrow="Reports"
        title={config.title}
        description={config.description}
        action={getHeaderActions(reportData)}
      />

      <div className="hidden rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm print:block">
        <div className="font-semibold tracking-tight">{config.title}</div>
        <div className="mt-1 text-muted-foreground">{config.description}</div>
        <div className="mt-3 grid gap-2 text-[12px] text-muted-foreground md:grid-cols-3">
          <div>
            <span className="font-medium text-foreground">Periode:</span>{" "}
            {buildPeriodLabel(dateFrom, dateTo)}
          </div>
          <div>
            <span className="font-medium text-foreground">Dicetak:</span>{" "}
            {formatDateTime(new Date())}
          </div>
          <div>
            <span className="font-medium text-foreground">Tipe:</span> {config.title}
          </div>
        </div>
      </div>

      {showPeriodFilter ? (
        <FilterBar
          left={
            <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
              <div className="min-w-[180px] space-y-2">
                <label className="text-sm font-medium">Dari Tanggal</label>
                <Input defaultValue={dateFrom} name="dateFrom" type="date" />
              </div>
              <div className="min-w-[180px] space-y-2">
                <label className="text-sm font-medium">Sampai Tanggal</label>
                <Input defaultValue={dateTo} name="dateTo" type="date" />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">Terapkan</Button>
                {(dateFrom || dateTo) ? (
                  <Button asChild type="button" variant="outline">
                    <Link href={`/reports/${report}`}>Reset</Link>
                  </Button>
                ) : null}
              </div>
            </form>
          }
          right={
            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {buildPeriodLabel(dateFrom, dateTo)}
            </div>
          }
        />
      ) : null}

      {reportData.kind === "payables" ? renderPayablesReport(reportData) : null}
      {reportData.kind === "receivables" ? renderReceivablesReport(reportData) : null}
      {reportData.kind === "profit-loss" ? renderProfitLossReport(reportData) : null}
      {reportData.kind === "store-debt-offsets"
        ? renderStoreDebtOffsetReport(reportData.storeDebtOffsets)
        : null}
      {reportData.kind === "transactions" ? renderTransactionsReport(reportData) : null}
      {reportData.kind === "snapshot" ? renderSnapshotReport(report, reportData.data) : null}
    </div>
  );
}

async function getReportData(
  report: keyof typeof reportConfig,
  period?: { dateFrom?: string; dateTo?: string },
): Promise<ReportData> {
  switch (report) {
    case "transactions":
      return {
        kind: "transactions",
        palmPurchases: filterRowsByDateRange(
          await getAllPalmPurchaseList().catch(() => []),
          "purchaseDate",
          period,
        ),
        palmSales: filterRowsByDateRange(
          await getAllPalmSaleList().catch(() => []),
          "saleDate",
          period,
        ),
        storePurchases: filterRowsByDateRange(
          await getAllStorePurchaseList().catch(() => []),
          "transactionDate",
          period,
        ),
        storeSales: filterRowsByDateRange(
          await getAllStoreSaleList().catch(() => []),
          "transactionDate",
          period,
        ),
      };
    case "profit-loss":
      {
        const cashLedger = await getCashLedgerPage(1, 200).catch(() => emptyCashLedgerPage());

      return {
        kind: "profit-loss",
        finance: await getFinanceInventorySummary().catch(() => emptyFinanceSummary()),
        palmPurchases: filterRowsByDateRange(
          await getAllPalmPurchaseList().catch(() => []),
          "purchaseDate",
          period,
        ),
        palmSales: filterRowsByDateRange(
          await getAllPalmSaleList().catch(() => []),
          "saleDate",
          period,
        ),
        cashLedger: {
          ...cashLedger,
          items: filterRowsByDateRange(cashLedger.items, "transactionDate", period),
        },
        payableAging: await getPayableAging().catch(() => emptyAging()),
        receivableAging: await getReceivableAging().catch(() => emptyAging()),
      };
      }
    case "payables":
      return {
        kind: "payables",
        payables: await getPayablePage(1, 12).catch(() => emptyDocumentPage()),
        aging: await getPayableAging().catch(() => emptyAging()),
        finance: await getFinanceInventorySummary().catch(() => emptyFinanceSummary()),
      };
    case "receivables":
      return {
        kind: "receivables",
        receivables: await getReceivablePage(1, 12).catch(() => emptyDocumentPage()),
        aging: await getReceivableAging().catch(() => emptyAging()),
        finance: await getFinanceInventorySummary().catch(() => emptyFinanceSummary()),
      };
    case "store-debt-offsets":
      return {
        kind: "store-debt-offsets",
        storeDebtOffsets: await getStoreDebtOffsetReport(200).catch(() => ({
          rows: [],
          summary: {
            offsetCount: 0,
            purchaseCount: 0,
            farmerCount: 0,
            totalRequested: "0.00",
            totalApplied: "0.00",
          },
        })),
      };
    case "stock":
      return {
        kind: "snapshot",
        data: {
          balances: await getStockBalancePage(1, 12).catch(() => emptyDocumentPage()),
          movements: await getStockMovementPage(1, 12).catch(() => emptyDocumentPage()),
          summary: await getStockBalanceSummary().catch(() => emptyStockSummary()),
        },
      };
    case "stock-take":
      return {
        kind: "snapshot",
        data: {
          stockTakes: await getStockTakePage(1, 12).catch(() => emptyDocumentPage()),
          adjustments: await getStockAdjustmentPage(1, 12).catch(() => emptyDocumentPage()),
          stockTakeSummary: await getStockTakeSummary().catch(() => emptyStockTakeSummary()),
          adjustmentSummary: await getStockAdjustmentSummary().catch(() => emptyStockAdjustmentSummary()),
        },
      };
    case "margin":
      return {
        kind: "snapshot",
        data: {
          palmSales: filterRowsByDateRange(
            await getAllPalmSaleList().catch(() => []),
            "saleDate",
            period,
          ),
        },
      };
    case "deductions":
    case "returns":
      return {
        kind: "snapshot",
        data: {
          palmSales: filterRowsByDateRange(
            await getAllPalmSaleList().catch(() => []),
            "saleDate",
            period,
          ),
        },
      };
    default:
      return { kind: "snapshot", data: {} };
  }
}

function getHeaderActions(reportData: ReportData) {
  if (reportData.kind === "payables") {
    return (
      <div className="flex flex-wrap gap-2 print:hidden">
        <BrowserPrintButton label="Cetak Laporan" />
        <Button disabled size="sm" type="button" variant="outline">
          Export PDF
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/finance/payables">
            Buka Modul Hutang
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (reportData.kind === "receivables") {
    return (
      <div className="flex flex-wrap gap-2 print:hidden">
        <BrowserPrintButton label="Cetak Laporan" />
        <Button disabled size="sm" type="button" variant="outline">
          Export PDF
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/finance/receivables">
            Buka Modul Piutang
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (reportData.kind === "profit-loss") {
    return (
      <div className="flex flex-wrap gap-2 print:hidden">
        <BrowserPrintButton label="Cetak Laporan" />
        <Button disabled size="sm" type="button" variant="outline">
          Export PDF
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/finance/payments">Lihat Payments</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/finance/cash-ledger">Buka Cash Ledger</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <BrowserPrintButton label="Cetak Laporan" />
      <Button disabled size="sm" type="button" variant="outline">
        Export PDF
      </Button>
    </div>
  );
}

function renderPayablesReport(data: Extract<ReportData, { kind: "payables" }>) {
  const topFarmer = data.finance.topFarmerPayables[0];
  const payablesSnapshotLabel = buildSnapshotDescription(
    data.payables.meta.total,
    data.payables.items.length,
    "dokumen hutang",
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          emphasis
          label="Outstanding Aktif"
          value={formatCurrency(data.finance.metrics.activePayables)}
        />
        <MetricCard
          label="Dokumen Aktif"
          value={formatNumber(data.finance.metrics.activePayableCount, 0)}
        />
        <MetricCard label="Belum Jatuh Tempo" value={formatCurrency(data.aging.current)} />
        <MetricCard
          label="Terlambat > 30 Hari"
          value={formatCurrency(data.aging.dueOver30)}
          tone="warning"
        />
      </div>

      <SectionCard
        title="Distribusi Aging Hutang"
        description="Pisahkan outstanding hutang berdasarkan bucket keterlambatan untuk kontrol cashflow."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AgingMetricCard label="Belum jatuh tempo" value={data.aging.current} />
          <AgingMetricCard label="1-7 hari" value={data.aging.due1to7} />
          <AgingMetricCard label="8-14 hari" value={data.aging.due8to14} />
          <AgingMetricCard label="15-30 hari" value={data.aging.due15to30} />
          <AgingMetricCard label="> 30 hari" value={data.aging.dueOver30} warning />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Dokumen Hutang Terbaru (Snapshot)"
          description={payablesSnapshotLabel}
        >
          <SimpleTable
            cellRenderers={{
              amount: (value) => formatCurrency(Number(value ?? 0)),
              outstandingAmount: (value) => formatCurrency(Number(value ?? 0)),
              status: (value) => (
                <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "unpaid"))}>
                  {formatPalmStatusLabel(String(value ?? "unpaid"))}
                </Badge>
              ),
            }}
            columnLabels={{
              code: "Kode Hutang",
              party: "Pihak",
              sourceCode: "Referensi",
              amount: "Total",
              outstandingAmount: "Sisa",
              dueDate: "Jatuh Tempo",
              status: "Status",
            }}
            columns={["code", "party", "sourceCode", "amount", "outstandingAmount", "dueDate", "status"]}
            getHref={(row) => `/finance/payables/${String(row.id)}`}
            linkColumn="code"
            numericColumns={["amount", "outstandingAmount"]}
            rows={data.payables.items.map((item) => ({
              id: String(item.id),
              code: String(item.code ?? "-"),
              party: String(item.farmerName ?? item.supplierName ?? "-"),
              sourceCode: String(item.sourceCode ?? "-"),
              amount: Number(item.amount ?? 0),
              outstandingAmount: Number(item.outstandingAmount ?? 0),
              dueDate: formatDate(item.dueDate),
              status: String(item.status ?? "unpaid"),
            }))}
          />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Supplier Jatuh Tempo Terdekat"
            description="Dokumen supplier yang perlu diprioritaskan untuk pembayaran."
          >
            <div className="space-y-3">
              {data.finance.nearestSupplierPayables.length ? (
                data.finance.nearestSupplierPayables.map((item) => (
                  <DueItemCard
                    key={item.id}
                    href={`/finance/payables/${item.id}`}
                    code={item.code}
                    label={item.supplierName}
                    amount={item.outstandingAmount}
                    date={item.dueDate}
                  />
                ))
              ) : (
                <MutedEmptyState text="Belum ada hutang supplier dengan jatuh tempo aktif." />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Petani Outstanding Terbesar"
            description="Lihat petani dengan posisi hutang paling besar untuk monitoring owner."
          >
            <div className="space-y-3">
              {topFarmer ? (
                <>
                  <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      Outstanding Terbesar
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {topFarmer.farmerName}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">
                      {formatCurrency(topFarmer.outstandingAmount)}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatNumber(topFarmer.documentCount, 0)} dokumen hutang aktif
                    </div>
                  </div>
                  <div className="space-y-2">
                    {data.finance.topFarmerPayables.slice(1, 6).map((item) => (
                      <div
                        key={item.farmerId}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3"
                      >
                        <div>
                          <div className="font-medium text-foreground">{item.farmerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(item.documentCount, 0)} dokumen
                          </div>
                        </div>
                        <div className="text-right font-semibold text-foreground">
                          {formatCurrency(item.outstandingAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <MutedEmptyState text="Belum ada hutang petani aktif untuk dirangking." />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function renderReceivablesReport(data: Extract<ReportData, { kind: "receivables" }>) {
  const overdueHeavy = data.aging.dueOver30 + data.aging.due15to30;
  const receivablesSnapshotLabel = buildSnapshotDescription(
    data.receivables.meta.total,
    data.receivables.items.length,
    "dokumen piutang",
  );
  const topReceivables = [...data.receivables.items]
    .sort((left, right) => Number(right.outstandingAmount ?? 0) - Number(left.outstandingAmount ?? 0))
    .slice(0, 5);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          emphasis
          label="Outstanding Aktif"
          value={formatCurrency(data.finance.metrics.activeReceivables)}
        />
        <MetricCard
          label="Dokumen Aktif"
          value={formatNumber(data.finance.metrics.activeReceivableCount, 0)}
        />
        <MetricCard label="Belum Jatuh Tempo" value={formatCurrency(data.aging.current)} />
        <MetricCard
          label="Terlambat 15+ Hari"
          value={formatCurrency(overdueHeavy)}
          tone="warning"
        />
      </div>

      <SectionCard
        title="Distribusi Aging Piutang"
        description="Gunakan bucket aging untuk menentukan prioritas penagihan pabrik dan pelanggan."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AgingMetricCard label="Belum jatuh tempo" value={data.aging.current} />
          <AgingMetricCard label="1-7 hari" value={data.aging.due1to7} />
          <AgingMetricCard label="8-14 hari" value={data.aging.due8to14} />
          <AgingMetricCard label="15-30 hari" value={data.aging.due15to30} />
          <AgingMetricCard label="> 30 hari" value={data.aging.dueOver30} warning />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          title="Dokumen Piutang Terbaru (Snapshot)"
          description={receivablesSnapshotLabel}
        >
          <SimpleTable
            cellRenderers={{
              amount: (value) => formatCurrency(Number(value ?? 0)),
              outstandingAmount: (value) => formatCurrency(Number(value ?? 0)),
              status: (value) => (
                <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "unpaid"))}>
                  {formatPalmStatusLabel(String(value ?? "unpaid"))}
                </Badge>
              ),
            }}
            columnLabels={{
              code: "Kode Piutang",
              party: "Pihak",
              farmerName: "Petani Terkait",
              sourceCode: "Referensi",
              amount: "Total",
              outstandingAmount: "Sisa",
              dueDate: "Jatuh Tempo",
              status: "Status",
            }}
            columns={["code", "party", "farmerName", "sourceCode", "amount", "outstandingAmount", "dueDate", "status"]}
            getHref={(row) => `/finance/receivables/${String(row.id)}`}
            linkColumn="code"
            numericColumns={["amount", "outstandingAmount"]}
            rows={data.receivables.items.map((item) => ({
              id: String(item.id),
              code: String(item.code ?? "-"),
              party: String(item.factoryName ?? item.customerName ?? "-"),
              farmerName: String(item.farmerName ?? "-"),
              sourceCode: String(item.sourceCode ?? "-"),
              amount: Number(item.amount ?? 0),
              outstandingAmount: Number(item.outstandingAmount ?? 0),
              dueDate: formatDate(item.dueDate),
              status: String(item.status ?? "unpaid"),
            }))}
          />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Piutang Jatuh Tempo Terdekat"
            description="Dokumen yang perlu diprioritaskan untuk follow-up penagihan."
          >
            <div className="space-y-3">
              {data.finance.nearestReceivables.length ? (
                data.finance.nearestReceivables.map((item) => (
                  <DueItemCard
                    key={item.id}
                    href={`/finance/receivables/${item.id}`}
                    code={item.code}
                    label={item.partyLabel}
                    amount={item.outstandingAmount}
                    date={item.dueDate}
                  />
                ))
              ) : (
                <MutedEmptyState text="Belum ada piutang aktif dengan jatuh tempo terdekat." />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Outstanding Terbesar pada Snapshot"
            description="Ringkasan cepat untuk dokumen piutang dengan nilai terbesar di laporan saat ini."
          >
            <div className="space-y-2">
              {topReceivables.length ? (
                topReceivables.map((item, index) => (
                  <div
                    key={String(item.id)}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3"
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Peringkat {index + 1}
                      </div>
                      <div className="font-medium text-foreground">
                        {String(item.factoryName ?? item.customerName ?? "-")}
                      </div>
                      <div className="text-sm text-muted-foreground">{String(item.code ?? "-")}</div>
                    </div>
                    <div className="text-right font-semibold text-foreground">
                      {formatCurrency(Number(item.outstandingAmount ?? 0))}
                    </div>
                  </div>
                ))
              ) : (
                <MutedEmptyState text="Belum ada piutang yang bisa ditampilkan di snapshot ini." />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function renderProfitLossReport(data: Extract<ReportData, { kind: "profit-loss" }>) {
  const purchaseTotal = data.palmPurchases.reduce(
    (sum: number, item: (typeof data.palmPurchases)[number]) => sum + Number(item.totalPurchase ?? 0),
    0,
  );
  const salesTotal = data.palmSales.reduce(
    (sum: number, item: (typeof data.palmSales)[number]) => sum + Number(item.totalSales ?? 0),
    0,
  );
  const marginTotal = data.palmSales.reduce(
    (sum: number, item: (typeof data.palmSales)[number]) => sum + Number(item.margin ?? 0),
    0,
  );
  const dueItems = [...data.finance.nearestReceivables, ...data.finance.nearestSupplierPayables]
    .sort((left, right) => {
      const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 8);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Ringkasan Periode"
          description="Angka di blok ini mengikuti filter periode yang sedang aktif pada report."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Pembelian TBS Periode" value={formatCurrency(purchaseTotal)} />
            <MetricCard label="Penjualan TBS Periode" value={formatCurrency(salesTotal)} />
            <MetricCard emphasis label="Margin Periode" value={formatCurrency(marginTotal)} />
          </div>
        </SectionCard>

        <SectionCard
          title="Snapshot Saat Ini"
          description="Angka di blok ini menunjukkan posisi finance dan stok terakhir saat report dibuka."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Piutang Aktif Saat Ini" value={formatCurrency(data.finance.metrics.activeReceivables)} />
            <MetricCard label="Hutang Aktif Saat Ini" value={formatCurrency(data.finance.metrics.activePayables)} />
            <MetricCard label="Stok Kritis Saat Ini" value={formatNumber(data.finance.metrics.criticalStockCount, 0)} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard
          title="Snapshot Cashflow & Aging Saat Ini"
          description="Owner dapat melihat posisi hutang, piutang, dan risiko keterlambatan terakhir dari satu layar."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="size-4 text-primary" />
                Aging Piutang
              </div>
              <div className="mt-4 space-y-3">
                <InlineSummaryRow label="Belum jatuh tempo" value={data.receivableAging.current} />
                <InlineSummaryRow
                  label="1-14 hari"
                  value={data.receivableAging.due1to7 + data.receivableAging.due8to14}
                />
                <InlineSummaryRow label="15-30 hari" value={data.receivableAging.due15to30} />
                <InlineSummaryRow label="> 30 hari" value={data.receivableAging.dueOver30} warning />
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileClock className="size-4 text-primary" />
                Aging Hutang
              </div>
              <div className="mt-4 space-y-3">
                <InlineSummaryRow label="Belum jatuh tempo" value={data.payableAging.current} />
                <InlineSummaryRow
                  label="1-14 hari"
                  value={data.payableAging.due1to7 + data.payableAging.due8to14}
                />
                <InlineSummaryRow label="15-30 hari" value={data.payableAging.due15to30} />
                <InlineSummaryRow label="> 30 hari" value={data.payableAging.dueOver30} warning />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Fokus Owner Saat Ini"
          description="Prioritas yang perlu ditindaklanjuti dari sisi cashflow dan partner usaha berdasarkan snapshot terbaru."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Petani Hutang Terbesar
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {data.finance.topFarmerPayables[0]?.farmerName ?? "Belum ada data"}
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {formatCurrency(data.finance.topFarmerPayables[0]?.outstandingAmount ?? 0)}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <LinkSummaryCard
                href="/reports/receivables"
                title="Piutang Jatuh Tempo"
                value={formatNumber(data.finance.nearestReceivables.length, 0)}
                description="dokumen perlu follow-up"
              />
              <LinkSummaryCard
                href="/reports/payables"
                title="Hutang Supplier"
                value={formatNumber(data.finance.nearestSupplierPayables.length, 0)}
                description="dokumen jatuh tempo aktif"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Cash Ledger Terbaru"
          description="Histori kas masuk dan kas keluar pada periode report yang sedang aktif."
        >
          <SimpleTable
            cellRenderers={{
              type: (value) => (
                <Badge variant={String(value) === "debit" ? "success" : "neutral"}>
                  {String(value) === "debit" ? "Kas Masuk" : "Kas Keluar"}
                </Badge>
              ),
              amount: (value) => formatCurrency(Number(value ?? 0)),
            }}
            columnLabels={{
              code: "Kode",
              transactionDate: "Tanggal",
              type: "Arah",
              category: "Kategori",
              amount: "Nominal",
              description: "Deskripsi",
              createdByName: "Dicatat Oleh",
            }}
            columns={["code", "transactionDate", "type", "category", "amount", "description", "createdByName"]}
            getHref={() => "/finance/cash-ledger"}
            linkColumn="code"
            numericColumns={["amount"]}
            rows={data.cashLedger.items.map((item) => ({
              id: String(item.id),
              code: String(item.code ?? "-"),
              transactionDate: formatDateTime(item.transactionDate),
              type: String(item.type ?? "credit"),
              category: String(item.category ?? "-"),
              amount: Number(item.amount ?? 0),
              description: String(item.description ?? "-"),
              createdByName: String(item.createdByName ?? "Sistem"),
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Jatuh Tempo Terdekat Saat Ini"
          description="Dokumen hutang dan piutang terakhir yang paling dekat memengaruhi posisi kas."
        >
          <div className="space-y-3">
            {dueItems.length ? (
              dueItems.map((item) => (
                <DueItemCard
                  key={item.id}
                  href={"partyLabel" in item ? `/finance/receivables/${item.id}` : `/finance/payables/${item.id}`}
                  code={item.code}
                  label={"partyLabel" in item ? item.partyLabel : item.supplierName}
                  amount={item.outstandingAmount}
                  date={item.dueDate}
                />
              ))
            ) : (
              <MutedEmptyState text="Belum ada dokumen jatuh tempo yang perlu diprioritaskan." />
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function renderStoreDebtOffsetReport(
  storeDebtOffsetReport: Awaited<ReturnType<typeof getStoreDebtOffsetReport>>,
) {
  return (
    <>
      <SectionCard
        title="Ringkasan Potong Hasil"
        description="Laporan ini menunjukkan kompensasi hasil panen petani yang digunakan untuk menutup piutang toko."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Dokumen Offset" value={formatNumber(storeDebtOffsetReport.summary.offsetCount, 0)} />
          <MetricCard
            label="Transaksi Pembelian"
            value={formatNumber(storeDebtOffsetReport.summary.purchaseCount, 0)}
          />
          <MetricCard
            label="Petani Terdampak"
            value={formatNumber(storeDebtOffsetReport.summary.farmerCount, 0)}
          />
          <MetricCard emphasis label="Total Dipotong" value={formatCurrency(storeDebtOffsetReport.summary.totalApplied)} />
        </div>
      </SectionCard>

      <SectionCard
        title="Rincian Potong Hasil"
        description="Gunakan tabel ini untuk audit alokasi potongan hasil panen ke piutang toko."
      >
        <SimpleTable
          columnLabels={{
            purchaseCode: "Kode Pembelian",
            purchaseDate: "Tanggal Pembelian",
            farmerName: "Petani",
            receivableCode: "Kode Piutang",
            customerName: "Pelanggan Toko",
            sourceCode: "Referensi Toko",
            itemAppliedAmount: "Nilai Potong",
          }}
          columns={["purchaseCode", "purchaseDate", "farmerName", "receivableCode", "customerName", "sourceCode", "itemAppliedAmount"]}
          numericColumns={["itemAppliedAmount"]}
          getHref={(row) => `/palm/purchases/${String(row.purchaseId)}`}
          linkColumn="purchaseCode"
          rows={storeDebtOffsetReport.rows.map((item) => ({
            ...item,
            purchaseCode: item.purchaseCode ?? "-",
            purchaseDate: formatDateTime(item.purchaseDate ?? item.createdAt),
            farmerName: item.farmerName ?? "-",
            receivableCode: item.receivableCode ?? "-",
            customerName: item.customerName ?? "-",
            sourceCode: item.sourceCode ?? "-",
            itemAppliedAmount: Number(item.itemAppliedAmount ?? 0),
          }))}
        />
      </SectionCard>
    </>
  );
}

function renderTransactionsReport(data: Extract<ReportData, { kind: "transactions" }>) {
  const palmPurchaseTotal = data.palmPurchases.reduce(
    (sum: number, item: (typeof data.palmPurchases)[number]) => sum + Number(item.totalPurchase ?? 0),
    0,
  );
  const palmSalesTotal = data.palmSales.reduce(
    (sum: number, item: (typeof data.palmSales)[number]) => sum + Number(item.totalSales ?? 0),
    0,
  );
  const storePurchaseTotal = data.storePurchases.reduce(
    (sum: number, item: (typeof data.storePurchases)[number]) => sum + Number(item.totalAmount ?? 0),
    0,
  );
  const storeSalesTotal = data.storeSales.reduce(
    (sum: number, item: (typeof data.storeSales)[number]) => sum + Number(item.totalAmount ?? 0),
    0,
  );
  const recentRows = [
    ...data.palmPurchases.map((item: (typeof data.palmPurchases)[number]) => ({
      id: item.id,
      code: item.code ?? "-",
      module: "Pembelian TBS",
      party: item.farmerName ?? "-",
      transactionDate: item.purchaseDate,
      amount: Number(item.totalPurchase ?? 0),
      href: `/palm/purchases/${item.id}`,
    })),
    ...data.palmSales.map((item) => ({
      id: item.id,
      code: item.code ?? "-",
      module: "Penjualan Pabrik",
      party: item.factoryName ?? "-",
      transactionDate: item.saleDate,
      amount: Number(item.totalSales ?? 0),
      href: `/palm/sales/${item.id}`,
    })),
    ...data.storePurchases.map((item) => ({
      id: item.id,
      code: item.code ?? "-",
      module: "Pembelian Toko",
      party: String(item.supplierName ?? "-"),
      transactionDate: item.transactionDate,
      amount: Number(item.totalAmount ?? 0),
      href: `/store/purchases/${item.id}`,
    })),
    ...data.storeSales.map((item) => ({
      id: item.id,
      code: item.code ?? "-",
      module: "Penjualan Toko",
      party: String(item.customerName ?? "Tunai Umum"),
      transactionDate: item.transactionDate,
      amount: Number(item.totalAmount ?? 0),
      href: `/store/sales/${item.id}`,
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.transactionDate ?? 0).getTime() - new Date(left.transactionDate ?? 0).getTime(),
    )
    .slice(0, 16);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pembelian TBS" value={formatCurrency(palmPurchaseTotal)} />
        <MetricCard label="Penjualan Pabrik" value={formatCurrency(palmSalesTotal)} />
        <MetricCard label="Pembelian Toko" value={formatCurrency(storePurchaseTotal)} />
        <MetricCard label="Penjualan Toko" value={formatCurrency(storeSalesTotal)} />
      </div>

      <SectionCard
        title="Transaksi Terbaru Lintas Modul"
        description="Ringkasan transaksi terbaru pembelian, penjualan sawit, dan toko dalam satu tampilan."
      >
        <SimpleTable
          columnLabels={{
            code: "Kode",
            module: "Modul",
            party: "Pihak",
            transactionDate: "Tanggal",
            amount: "Nilai",
          }}
          columns={["code", "module", "party", "transactionDate", "amount"]}
          getHref={(row) => String(row.href ?? "")}
          linkColumn="code"
          numericColumns={["amount"]}
          rows={recentRows.map((item) => ({
            ...item,
            transactionDate: formatDateTime(item.transactionDate),
          }))}
        />
      </SectionCard>
    </>
  );
}

function renderSnapshotReport(report: keyof typeof reportConfig, data: Record<string, unknown>) {
  switch (report) {
    case "stock":
      return renderStockReport(data);
    case "stock-take":
      return renderStockTakeReport(data);
    case "margin":
      return renderMarginReport(data);
    case "deductions":
      return renderDeductionsReport(data);
    case "returns":
      return renderReturnsReport(data);
    default:
      return (
        <SectionCard title="Report Snapshot">
          <pre className="overflow-x-auto rounded-2xl bg-[#1e241e] p-4 text-xs text-[#dbe7cc]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </SectionCard>
      );
  }
}

function isPeriodFilterableReport(report: keyof typeof reportConfig) {
  return ["transactions", "profit-loss", "margin", "deductions", "returns"].includes(report);
}

function buildPeriodLabel(dateFrom?: string, dateTo?: string) {
  if (dateFrom && dateTo) {
    return `Periode ${formatDate(dateFrom)} s.d. ${formatDate(dateTo)}`;
  }

  if (dateFrom) {
    return `Mulai ${formatDate(dateFrom)}`;
  }

  if (dateTo) {
    return `Sampai ${formatDate(dateTo)}`;
  }

  return "Periode semua data yang tersedia pada laporan ini";
}

function buildSnapshotDescription(total: number, shown: number, label: string) {
  if (total <= shown) {
    return `Menampilkan seluruh ${formatNumber(total, 0)} ${label} yang tersedia pada laporan ini.`;
  }

  return `Menampilkan ${formatNumber(shown, 0)} ${label} terbaru dari total ${formatNumber(total, 0)} data untuk follow-up cepat.`;
}

function ReportPrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        html, body {
          background: #ffffff !important;
        }

        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `}</style>
  );
}

function filterRowsByDateRange<T extends Record<string, unknown>>(
  rows: T[],
  dateField: keyof T,
  period?: { dateFrom?: string; dateTo?: string },
) {
  if (!period?.dateFrom && !period?.dateTo) return rows;

  const start = period?.dateFrom ? new Date(`${period.dateFrom}T00:00:00`) : null;
  const end = period?.dateTo ? new Date(`${period.dateTo}T23:59:59.999`) : null;

  return rows.filter((row) => {
    const value = row[dateField];
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return false;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
}

function renderStockReport(data: Record<string, unknown>) {
  const summary = (data.summary as {
    totalRows?: number;
    totalQuantity?: number;
    totalValue?: number;
    criticalCount?: number;
  } | undefined) ?? {};
  const balancesPage =
    (data.balances as {
      items?: Array<Record<string, unknown>>;
      meta?: { total?: number };
    } | undefined) ?? {};
  const movementsPage =
    (data.movements as {
      items?: Array<Record<string, unknown>>;
      meta?: { total?: number };
    } | undefined) ?? {};
  const balances = balancesPage.items ?? [];
  const movements = movementsPage.items ?? [];
  const balancesSnapshotLabel = buildSnapshotDescription(
    balancesPage.meta?.total ?? balances.length,
    balances.length,
    "baris saldo stok",
  );
  const movementsSnapshotLabel = buildSnapshotDescription(
    movementsPage.meta?.total ?? movements.length,
    movements.length,
    "mutasi stok",
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Baris Saldo" value={formatNumber(summary.totalRows ?? 0, 0)} />
        <MetricCard emphasis label="Qty Stok" value={formatNumber(summary.totalQuantity ?? 0)} />
        <MetricCard label="Nilai Stok" value={formatCurrency(summary.totalValue ?? 0)} />
        <MetricCard
          label="Stok Kritis"
          value={formatNumber(summary.criticalCount ?? 0, 0)}
          tone={(summary.criticalCount ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <SectionCard
        title="Ringkasan Saldo Saat Ini"
        description="Kartu KPI di atas dihitung dari seluruh saldo stok yang tersedia, sedangkan tabel di bawah menampilkan snapshot untuk penelusuran cepat."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Baris Saldo" value={formatNumber(summary.totalRows ?? 0, 0)} />
          <MetricCard label="Total Qty Tersedia" value={formatNumber(summary.totalQuantity ?? 0)} />
          <MetricCard label="Nilai Persediaan" value={formatCurrency(summary.totalValue ?? 0)} />
          <MetricCard
            label="Produk Stok Kritis"
            value={formatNumber(summary.criticalCount ?? 0, 0)}
            tone={(summary.criticalCount ?? 0) > 0 ? "warning" : "default"}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Posisi Stok Saat Ini (Snapshot)"
        description={balancesSnapshotLabel}
      >
        <SimpleTable
          columnLabels={{
            productCode: "Kode Produk",
            productName: "Produk",
            warehouseName: "Gudang",
            quantity: "Qty",
            unit: "Satuan",
            minStock: "Min Stok",
            averageCost: "Nilai / Unit",
          }}
          columns={["productCode", "productName", "warehouseName", "quantity", "unit", "minStock", "averageCost"]}
          numericColumns={["quantity", "minStock", "averageCost"]}
          rows={balances.map((item) => ({
            productCode: String(item.productCode ?? "-"),
            productName: String(item.productName ?? "-"),
            warehouseName: String(item.warehouseName ?? "-"),
            quantity: Number(item.quantity ?? 0),
            unit: String(item.unit ?? "-"),
            minStock: Number(item.minStock ?? 0),
            averageCost: Number(item.averageCost ?? 0),
          }))}
          cellRenderers={{
            averageCost: (value) => formatCurrency(Number(value ?? 0)),
          }}
        />
      </SectionCard>

      <SectionCard
        title="Mutasi Stok Terbaru (Snapshot)"
        description={movementsSnapshotLabel}
      >
        <SimpleTable
          columnLabels={{
            movementDate: "Tanggal",
            productName: "Produk",
            warehouseName: "Gudang",
            movementType: "Jenis",
            reason: "Alasan",
            quantity: "Qty",
            totalValue: "Nilai",
          }}
          columns={["movementDate", "productName", "warehouseName", "movementType", "reason", "quantity", "totalValue"]}
          numericColumns={["quantity", "totalValue"]}
          rows={movements.map((item) => ({
            movementDate: formatDateTime(item.movementDate as string | Date | null | undefined),
            productName: String(item.productName ?? "-"),
            warehouseName: String(item.warehouseName ?? "-"),
            movementType: String(item.movementType ?? "-"),
            reason: String(item.reason ?? "-"),
            quantity: Number(item.quantity ?? 0),
            totalValue: Number(item.totalValue ?? 0),
          }))}
          cellRenderers={{
            totalValue: (value) => formatCurrency(Number(value ?? 0)),
          }}
        />
      </SectionCard>
    </>
  );
}

function renderStockTakeReport(data: Record<string, unknown>) {
  const stockTakeSummary = (data.stockTakeSummary as {
    totalCount?: number;
    approvedCount?: number;
    totalVariance?: number;
  } | undefined) ?? {};
  const adjustmentSummary = (data.adjustmentSummary as {
    totalCount?: number;
    pendingCount?: number;
  } | undefined) ?? {};
  const stockTakePage =
    (data.stockTakes as {
      items?: Array<Record<string, unknown>>;
      meta?: { total?: number };
    } | undefined) ?? {};
  const adjustmentPage =
    (data.adjustments as {
      items?: Array<Record<string, unknown>>;
      meta?: { total?: number };
    } | undefined) ?? {};
  const stockTakes = stockTakePage.items ?? [];
  const adjustments = adjustmentPage.items ?? [];
  const stockTakeSnapshotLabel = buildSnapshotDescription(
    stockTakePage.meta?.total ?? stockTakes.length,
    stockTakes.length,
    "dokumen stock take",
  );
  const adjustmentSnapshotLabel = buildSnapshotDescription(
    adjustmentPage.meta?.total ?? adjustments.length,
    adjustments.length,
    "dokumen adjustment stok",
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dokumen Opname" value={formatNumber(stockTakeSummary.totalCount ?? 0, 0)} />
        <MetricCard label="Adjustment" value={formatNumber(adjustmentSummary.totalCount ?? 0, 0)} />
        <MetricCard label="Opname Disetujui" value={formatNumber(stockTakeSummary.approvedCount ?? 0, 0)} />
        <MetricCard
          emphasis
          label="Nilai Variance"
          value={formatCurrency(stockTakeSummary.totalVariance ?? 0)}
          tone={Math.abs(stockTakeSummary.totalVariance ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <SectionCard
        title="Ringkasan Kontrol Stok Saat Ini"
        description="Kartu KPI di atas dihitung dari seluruh dokumen stock take dan adjustment, sedangkan tabel di bawah menampilkan snapshot terbaru untuk follow-up operasional."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Stock Take" value={formatNumber(stockTakeSummary.totalCount ?? 0, 0)} />
          <MetricCard label="Total Adjustment" value={formatNumber(adjustmentSummary.totalCount ?? 0, 0)} />
          <MetricCard label="Stock Take Disetujui" value={formatNumber(stockTakeSummary.approvedCount ?? 0, 0)} />
          <MetricCard
            label="Adjustment Pending"
            value={formatNumber(adjustmentSummary.pendingCount ?? 0, 0)}
            tone={(adjustmentSummary.pendingCount ?? 0) > 0 ? "warning" : "default"}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Dokumen Stock Take Terbaru (Snapshot)"
        description={stockTakeSnapshotLabel}
      >
        <SimpleTable
          columnLabels={{
            code: "Kode",
            warehouseName: "Gudang",
            stockDate: "Tanggal",
            status: "Status",
            varianceValue: "Nilai Variance",
          }}
          columns={["code", "warehouseName", "stockDate", "status", "varianceValue"]}
          numericColumns={["varianceValue"]}
          rows={stockTakes.map((item) => ({
            code: String(item.code ?? "-"),
            warehouseName: String(item.warehouseName ?? String(item.warehouseId ?? "-")),
            stockDate: formatDateTime(item.stockDate as string | Date | null | undefined),
            status: String(item.status ?? "-"),
            varianceValue: Number(item.varianceValue ?? 0),
          }))}
          cellRenderers={{
            status: (value) => (
              <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "draft"))}>
                {formatPalmStatusLabel(String(value ?? "draft"))}
              </Badge>
            ),
            varianceValue: (value) => formatCurrency(Number(value ?? 0)),
          }}
        />
      </SectionCard>

      <SectionCard
        title="Adjustment Stok Terbaru (Snapshot)"
        description={adjustmentSnapshotLabel}
      >
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Pending Approval
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">
              {formatNumber(adjustmentSummary.pendingCount ?? 0, 0)}
            </div>
          </div>
        </div>
        <SimpleTable
          columnLabels={{
            code: "Kode",
            warehouseName: "Gudang",
            adjustmentType: "Jenis",
            status: "Status",
            totalValue: "Nilai",
            createdByName: "Dibuat Oleh",
          }}
          columns={["code", "warehouseName", "adjustmentType", "status", "totalValue", "createdByName"]}
          numericColumns={["totalValue"]}
          rows={adjustments.map((item) => ({
            code: String(item.code ?? "-"),
            warehouseName: String(item.warehouseName ?? "-"),
            adjustmentType: String(item.adjustmentType ?? "-"),
            status: String(item.status ?? "-"),
            totalValue: Number(item.totalValue ?? 0),
            createdByName: String(item.createdByName ?? "Sistem"),
          }))}
          cellRenderers={{
            status: (value) => (
              <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "pending"))}>
                {formatPalmStatusLabel(String(value ?? "pending"))}
              </Badge>
            ),
            totalValue: (value) => formatCurrency(Number(value ?? 0)),
          }}
        />
      </SectionCard>
    </>
  );
}

function renderMarginReport(data: Record<string, unknown>) {
  const palmSales = (data.palmSales as Array<Record<string, unknown>> | undefined) ?? [];

  const enrichedSales = palmSales.map((item) => {
    const totalSales = Number(item.totalSales ?? 0);
    const margin = Number(item.margin ?? 0);
    const stockCost = Math.max(totalSales - margin, 0);
    return {
      code: String(item.code ?? "-"),
      saleDate: item.saleDate as string | Date | null | undefined,
      factoryName: String(item.factoryName ?? "-"),
      warehouseName: String(item.warehouseName ?? "-"),
      netWeightFinal: Number(item.netWeightFinal ?? 0),
      totalSales,
      stockCost,
      margin,
    };
  });

  const totalSales = enrichedSales.reduce((sum, item) => sum + item.totalSales, 0);
  const totalPurchase = enrichedSales.reduce((sum, item) => sum + item.stockCost, 0);
  const totalMargin = enrichedSales.reduce((sum, item) => sum + item.margin, 0);
  const groupedByFactory = Array.from(
    enrichedSales.reduce((map, item) => {
      const current = map.get(item.factoryName) ?? {
        factoryName: item.factoryName,
        transactionCount: 0,
        netWeightFinal: 0,
        totalSales: 0,
        stockCost: 0,
        margin: 0,
      };
      current.transactionCount += 1;
      current.netWeightFinal += item.netWeightFinal;
      current.totalSales += item.totalSales;
      current.stockCost += item.stockCost;
      current.margin += item.margin;
      map.set(item.factoryName, current);
      return map;
    }, new Map<string, {
      factoryName: string;
      transactionCount: number;
      netWeightFinal: number;
      totalSales: number;
      stockCost: number;
      margin: number;
    }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.margin - left.margin);
  const groupedByWarehouse = Array.from(
    enrichedSales.reduce((map, item) => {
      const current = map.get(item.warehouseName) ?? {
        warehouseName: item.warehouseName,
        transactionCount: 0,
        netWeightFinal: 0,
        totalSales: 0,
        stockCost: 0,
        margin: 0,
      };
      current.transactionCount += 1;
      current.netWeightFinal += item.netWeightFinal;
      current.totalSales += item.totalSales;
      current.stockCost += item.stockCost;
      current.margin += item.margin;
      map.set(item.warehouseName, current);
      return map;
    }, new Map<string, {
      warehouseName: string;
      transactionCount: number;
      netWeightFinal: number;
      totalSales: number;
      stockCost: number;
      margin: number;
    }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.margin - left.margin);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Transaksi" value={formatNumber(enrichedSales.length, 0)} />
        <MetricCard label="Netto Final" value={`${formatNumber(enrichedSales.reduce((sum, item) => sum + item.netWeightFinal, 0))} kg`} />
        <MetricCard label="Nilai Jual" value={formatCurrency(totalSales)} />
        <MetricCard label="Nilai Beli" value={formatCurrency(totalPurchase)} />
        <MetricCard emphasis label="Margin" value={formatCurrency(totalMargin)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Margin per Pabrik"
          description="Kelompokkan performa penjualan berdasarkan pabrik untuk melihat kontribusi nilai dan margin."
        >
          <SimpleTable
            columnLabels={{
              factoryName: "Pabrik",
              transactionCount: "Transaksi",
              netWeightFinal: "Netto Final",
              totalSales: "Nilai Jual",
              stockCost: "Nilai Pokok",
              margin: "Margin",
            }}
            columns={["factoryName", "transactionCount", "netWeightFinal", "totalSales", "stockCost", "margin"]}
            numericColumns={["transactionCount", "netWeightFinal", "totalSales", "stockCost", "margin"]}
            rows={groupedByFactory}
            cellRenderers={{
              totalSales: (value) => formatCurrency(Number(value ?? 0)),
              stockCost: (value) => formatCurrency(Number(value ?? 0)),
              margin: (value) => formatCurrency(Number(value ?? 0)),
            }}
          />
        </SectionCard>

        <SectionCard
          title="Margin per Gudang Asal"
          description="Karena stok TBS dikelola sebagai pool gudang, margin diringkas berdasarkan gudang asal penjualan."
        >
          <SimpleTable
            columnLabels={{
              warehouseName: "Gudang",
              transactionCount: "Transaksi",
              netWeightFinal: "Netto Final",
              totalSales: "Nilai Jual",
              stockCost: "Nilai Pokok",
              margin: "Margin",
            }}
            columns={["warehouseName", "transactionCount", "netWeightFinal", "totalSales", "stockCost", "margin"]}
            numericColumns={["transactionCount", "netWeightFinal", "totalSales", "stockCost", "margin"]}
            rows={groupedByWarehouse}
            cellRenderers={{
              totalSales: (value) => formatCurrency(Number(value ?? 0)),
              stockCost: (value) => formatCurrency(Number(value ?? 0)),
              margin: (value) => formatCurrency(Number(value ?? 0)),
            }}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Margin Penjualan Pabrik"
        description="Snapshot margin transaksi penjualan TBS ke pabrik berdasarkan data penjualan aktif."
      >
        <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Nilai Pokok" value={formatCurrency(totalPurchase)} />
          <MetricCard
            label="Rata-rata Margin / Transaksi"
            value={formatCurrency(enrichedSales.length ? totalMargin / enrichedSales.length : 0)}
          />
          <MetricCard
            label="Margin / Kg"
            value={formatCurrency(
              enrichedSales.reduce((sum, item) => sum + item.netWeightFinal, 0) > 0
                ? totalMargin /
                    enrichedSales.reduce((sum, item) => sum + item.netWeightFinal, 0)
                : 0,
            )}
          />
          <MetricCard
            label="Margin Positif"
            value={formatNumber(enrichedSales.filter((item) => item.margin > 0).length, 0)}
          />
        </div>
        <SimpleTable
          columnLabels={{
            code: "Kode Sale",
            saleDate: "Tanggal",
            factoryName: "Pabrik",
            warehouseName: "Gudang Asal",
            netWeightFinal: "Netto Final",
            totalSales: "Nilai Jual",
            stockCost: "Nilai Pokok",
            margin: "Margin",
          }}
          columns={["code", "saleDate", "factoryName", "warehouseName", "netWeightFinal", "totalSales", "stockCost", "margin"]}
          numericColumns={["netWeightFinal", "totalSales", "stockCost", "margin"]}
          rows={enrichedSales.map((item) => ({
            ...item,
            saleDate: formatDateTime(item.saleDate),
          }))}
          cellRenderers={{
            totalSales: (value) => formatCurrency(Number(value ?? 0)),
            stockCost: (value) => formatCurrency(Number(value ?? 0)),
            margin: (value) => formatCurrency(Number(value ?? 0)),
          }}
        />
      </SectionCard>
    </>
  );
}

function renderDeductionsReport(data: Record<string, unknown>) {
  const allSales = (data.palmSales as Array<Record<string, unknown>> | undefined) ?? [];
  const palmSales = allSales.filter((item) => Number(item.totalDeduction ?? 0) > 0);
  const totalDeduction = palmSales.reduce((sum, item) => sum + Number(item.totalDeduction ?? 0), 0);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Transaksi Terdampak" value={formatNumber(palmSales.length, 0)} />
        <MetricCard emphasis label="Total Potongan" value={formatNumber(totalDeduction)} />
        <MetricCard
          label="Rata-rata / Transaksi"
          value={formatNumber(palmSales.length ? totalDeduction / palmSales.length : 0)}
        />
      </div>

      <SectionCard
        title="Potongan Penjualan Pabrik"
        description="Rincian transaksi penjualan yang memiliki potongan kualitas atau grading dari pabrik."
      >
        <SimpleTable
          columnLabels={{
            code: "Kode Sale",
            saleDate: "Tanggal",
            factoryName: "Pabrik",
            netWeightFinal: "Netto Final",
            totalDeduction: "Total Potongan",
            totalSales: "Nilai Jual",
          }}
          columns={["code", "saleDate", "factoryName", "netWeightFinal", "totalDeduction", "totalSales"]}
          numericColumns={["netWeightFinal", "totalDeduction", "totalSales"]}
          rows={palmSales.map((item) => ({
            code: String(item.code ?? "-"),
            saleDate: formatDateTime(item.saleDate as string | Date | null | undefined),
            factoryName: String(item.factoryName ?? "-"),
            netWeightFinal: Number(item.netWeightFinal ?? 0),
            totalDeduction: Number(item.totalDeduction ?? 0),
            totalSales: Number(item.totalSales ?? 0),
          }))}
          cellRenderers={{
            totalSales: (value) => formatCurrency(Number(value ?? 0)),
          }}
        />
      </SectionCard>
    </>
  );
}

function renderReturnsReport(data: Record<string, unknown>) {
  const allSales = (data.palmSales as Array<Record<string, unknown>> | undefined) ?? [];
  const palmSales = allSales.filter((item) => Number(item.returnWeight ?? 0) > 0);
  const totalReturnWeight = palmSales.reduce((sum, item) => sum + Number(item.returnWeight ?? 0), 0);
  const totalSales = palmSales.reduce((sum, item) => sum + Number(item.totalSales ?? 0), 0);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Transaksi Return" value={formatNumber(palmSales.length, 0)} />
        <MetricCard emphasis label="Total Return" value={`${formatNumber(totalReturnWeight)} kg`} />
        <MetricCard label="Nilai Jual Terkait" value={formatCurrency(totalSales)} />
      </div>

      <SectionCard
        title="Retur Penjualan ke Pabrik"
        description="Transaksi penjualan yang memiliki return atau pengembalian buah dari pabrik."
      >
        <SimpleTable
          columnLabels={{
            code: "Kode Sale",
            saleDate: "Tanggal",
            factoryName: "Pabrik",
            returnWeight: "Return",
            netWeightFinal: "Netto Final",
            totalSales: "Nilai Jual",
          }}
          columns={["code", "saleDate", "factoryName", "returnWeight", "netWeightFinal", "totalSales"]}
          numericColumns={["returnWeight", "netWeightFinal", "totalSales"]}
          rows={palmSales.map((item) => ({
            code: String(item.code ?? "-"),
            saleDate: formatDateTime(item.saleDate as string | Date | null | undefined),
            factoryName: String(item.factoryName ?? "-"),
            returnWeight: Number(item.returnWeight ?? 0),
            netWeightFinal: Number(item.netWeightFinal ?? 0),
            totalSales: Number(item.totalSales ?? 0),
          }))}
          cellRenderers={{
            totalSales: (value) => formatCurrency(Number(value ?? 0)),
          }}
        />
      </SectionCard>
    </>
  );
}

function emptyAging(): AgingSummary {
  return {
    current: 0,
    due1to7: 0,
    due8to14: 0,
    due15to30: 0,
    dueOver30: 0,
  };
}

function emptyDocumentPage() {
  return {
    items: [],
    meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
  };
}

function emptyCashLedgerPage() {
  return {
    items: [],
    meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
  };
}

function emptyFinanceSummary() {
  return {
    metrics: {
      activeReceivables: 0,
      activeReceivableCount: 0,
      activePayables: 0,
      activePayableCount: 0,
      currentStockQuantity: 0,
      activeStockProductCount: 0,
      criticalStockCount: 0,
    },
    nearestReceivables: [],
    nearestSupplierPayables: [],
    topFarmerPayables: [],
  };
}

function emptyStockSummary() {
  return {
    totalRows: 0,
    totalQuantity: 0,
    totalValue: 0,
    criticalCount: 0,
  };
}

function emptyStockTakeSummary() {
  return {
    totalCount: 0,
    approvedCount: 0,
    totalVariance: 0,
  };
}

function emptyStockAdjustmentSummary() {
  return {
    totalCount: 0,
    pendingCount: 0,
  };
}

function MetricCard({
  label,
  value,
  emphasis = false,
  tone = "default",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "default" | "warning";
}) {
  const className =
    tone === "warning"
      ? "rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm"
      : emphasis
        ? "rounded-2xl border border-primary/15 bg-primary/10 p-4 shadow-sm"
        : "rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm";

  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div
        className={emphasis ? "mt-2 text-2xl font-semibold tracking-tight" : "mt-2 text-xl font-semibold tracking-tight"}
      >
        {value}
      </div>
    </div>
  );
}

function AgingMetricCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      className={
        warning
          ? "rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4"
          : "rounded-2xl border border-border/80 bg-muted/20 px-4 py-4"
      }
    >
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function DueItemCard({
  href,
  code,
  label,
  amount,
  date,
}: {
  href: string;
  code: string;
  label: string;
  amount: number;
  date: Date | null;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border/70 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{code}</div>
          <div className="mt-1 truncate text-sm text-muted-foreground">{label}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-foreground">{formatCurrency(amount)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatDate(date)}</div>
        </div>
      </div>
    </Link>
  );
}

function LinkSummaryCard({
  href,
  title,
  value,
  description,
}: {
  href: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border/80 bg-muted/20 px-4 py-4 transition-colors hover:bg-muted/35"
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
    </Link>
  );
}

function InlineSummaryRow({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 last:border-b-0 last:pb-0">
      <div className={warning ? "text-sm text-amber-800" : "text-sm text-muted-foreground"}>{label}</div>
      <div className={warning ? "font-semibold text-amber-900" : "font-semibold text-foreground"}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function MutedEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
