import { connection } from "next/server";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  PackageSearch,
  Wallet,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { KpiCard } from "@/components/shared/kpi-card";
import { SupportWhatsappButton } from "@/components/shared/support-whatsapp-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canAccessPermission,
  type AppPermissionKey,
  type RolePermissionMap,
} from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { DashboardDateFilter } from "@/modules/dashboard/dashboard-date-filter";
import {
  type DashboardWidgetId,
} from "@/modules/dashboard/dashboard-widget-registry";
import { DashboardWorkspace } from "@/modules/dashboard/dashboard-workspace";
import { FinanceInventoryWidget } from "@/modules/dashboard/finance-inventory-widget";
import {
  DashboardOnboardingChecklist,
  type DashboardOnboardingItem,
} from "@/modules/dashboard/onboarding-checklist";
import { OperationalTrendChart } from "@/modules/dashboard/operational-trend-chart";
import { RecentActivityFeed } from "@/modules/dashboard/recent-activity-feed";
import { TbsPurchaseDailyWidget } from "@/modules/dashboard/tbs-purchase-daily-widget";
import { TbsSaleDailyWidget } from "@/modules/dashboard/tbs-sale-daily-widget";
import { WelcomeOnboardingModal } from "@/modules/dashboard/welcome-onboarding-modal";
import { getResolvedDashboardLayout } from "@/services/dashboard-layout-service";
import {
  getDashboardOnboardingSummary,
  getDashboardSummary,
  getDashboardTrendSummary,
  getFinanceExposureTrendSummary,
  getFinanceInventorySummary,
  getTbsPurchaseDailySummary,
  getTbsSaleDailySummary,
} from "@/services/dashboard-service";
import type { DashboardOnboardingSummary } from "@/services/dashboard-service";
import type { AppRole } from "@/types/domain";

type DashboardUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

function hasPermission(
  role: AppRole,
  permissions: RolePermissionMap,
  key: AppPermissionKey,
) {
  return canAccessPermission(role, permissions, key);
}

function resolvePartnerHref(role: AppRole, permissions: RolePermissionMap) {
  if (hasPermission(role, permissions, "master.farmers")) return "/master/farmers";
  if (hasPermission(role, permissions, "master.factories")) return "/master/factories";
  if (hasPermission(role, permissions, "master.suppliers")) return "/master/suppliers";
  if (hasPermission(role, permissions, "master.customers")) return "/master/customers";
  return null;
}

function resolveTransactionHref(role: AppRole, permissions: RolePermissionMap) {
  if (hasPermission(role, permissions, "palm.purchases")) return "/palm/purchases";
  if (hasPermission(role, permissions, "palm.sales")) return "/palm/sales";
  if (hasPermission(role, permissions, "store.purchases")) return "/store/purchases";
  if (hasPermission(role, permissions, "store.sales")) return "/store/sales";
  return null;
}

function buildOnboardingItems(
  currentUser: DashboardUser,
  summary: DashboardOnboardingSummary,
): DashboardOnboardingItem[] {
  const { role, permissions } = currentUser;
  const items: DashboardOnboardingItem[] = [];

  if (hasPermission(role, permissions, "master.warehouses")) {
    items.push({
      id: "warehouses",
      title: "Tambah Gudang Aktif",
      description:
        "Gudang dibutuhkan agar stok, pembelian, dan penjualan punya titik operasional yang jelas.",
      href: "/master/warehouses",
      completed: summary.activeWarehouseCount > 0,
      helper:
        summary.activeWarehouseCount > 0
          ? `${formatNumber(summary.activeWarehouseCount, 0)} gudang aktif sudah tersedia.`
          : "Belum ada gudang aktif. Tambahkan minimal satu gudang utama.",
    });
  }

  if (hasPermission(role, permissions, "master.products")) {
    items.push({
      id: "products",
      title: "Tambah Produk Inti",
      description:
        "Produk aktif membuat transaksi toko, stok, dan pelaporan bisa langsung digunakan.",
      href: "/master/products",
      completed: summary.activeProductCount > 0,
      helper:
        summary.activeProductCount > 0
          ? `${formatNumber(summary.activeProductCount, 0)} produk aktif sudah tercatat.`
          : "Belum ada produk aktif. Tambahkan item yang paling sering dijual atau dibeli dulu.",
    });
  }

  const partnerHref = resolvePartnerHref(role, permissions);
  if (partnerHref) {
    items.push({
      id: "partners",
      title: "Lengkapi Mitra Utama",
      description:
        "Minimal ada petani, pabrik, supplier, atau pelanggan agar alur pembelian dan penjualan bisa diuji.",
      href: partnerHref,
      completed: summary.activePartnerCount > 0,
      helper:
        summary.activePartnerCount > 0
          ? `Petani ${formatNumber(summary.activeFarmerCount, 0)}, pabrik ${formatNumber(summary.activeFactoryCount, 0)}, supplier ${formatNumber(summary.activeSupplierCount, 0)}, pelanggan ${formatNumber(summary.activeCustomerCount, 0)}.`
          : "Belum ada mitra aktif. Tambahkan satu data mitra yang paling relevan dengan usaha Anda.",
    });
  }

  if (hasPermission(role, permissions, "master.users")) {
    items.push({
      id: "users",
      title: "Tambahkan Pengguna Kerja",
      description:
        "Pisahkan akses owner dan operasional harian supaya audit trail dan tanggung jawab kerja lebih rapi.",
      href: "/master/users",
      completed: summary.activeUserCount > 1,
      helper:
        summary.activeUserCount > 1
          ? `${formatNumber(summary.activeUserCount, 0)} pengguna aktif sudah tersedia.`
          : "Saat ini baru ada 1 pengguna aktif. Tambahkan minimal satu akun operasional.",
    });
  }

  const transactionHref = resolveTransactionHref(role, permissions);
  if (transactionHref) {
    items.push({
      id: "transactions",
      title: "Jalankan Transaksi Pertama",
      description:
        "Transaksi pertama membuat dashboard, stok, hutang, atau piutang mulai terisi sehingga user langsung melihat manfaat aplikasi.",
      href: transactionHref,
      completed: summary.totalTransactionCount > 0,
      helper:
        summary.totalTransactionCount > 0
          ? `${formatNumber(summary.totalTransactionCount, 0)} transaksi aktif sudah tercatat di tenant ini.`
          : "Belum ada transaksi aktif. Buat satu transaksi contoh untuk uji alur kerja.",
    });
  }

  return items;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  const filters = await searchParams;
  const selectedDate = typeof filters.date === "string" ? filters.date : undefined;
  const showWelcomeModal = filters.welcome === "1";

  const [
    currentUser,
    onboardingSummary,
    purchaseDailySummary,
    saleDailySummary,
    trendSummary,
    financeInventorySummary,
    financeExposureTrend,
    snapshot,
  ] = await Promise.all([
    getCurrentUser(),
    getDashboardOnboardingSummary(),
    getTbsPurchaseDailySummary(selectedDate),
    getTbsSaleDailySummary(selectedDate),
    getDashboardTrendSummary(selectedDate),
    getFinanceInventorySummary(),
    getFinanceExposureTrendSummary(selectedDate),
    getDashboardSummary().catch(() => ({
      stockTakeVariance: 0,
      recentTransactions: [],
    })),
  ]);

  if (!currentUser) {
    return null;
  }

  const dashboardLayout = await getResolvedDashboardLayout(
    currentUser.id,
    currentUser.role,
    currentUser.permissions,
  );

  const onboardingItems = buildOnboardingItems(currentUser, onboardingSummary);
  const firstPendingOnboardingItem =
    onboardingItems.find((item) => !item.completed) ?? onboardingItems[0] ?? null;

  const quickKpis = [
    {
      label: "Pembelian TBS Hari Ini",
      value: purchaseDailySummary.metrics.totalPurchase,
      currency: true,
    },
    {
      label: "Penjualan Pabrik Hari Ini",
      value: saleDailySummary.metrics.totalSales,
      currency: true,
    },
    {
      label: "Margin Hari Ini",
      value: saleDailySummary.metrics.margin,
      currency: true,
    },
    {
      label: "Piutang Aktif",
      value: financeInventorySummary.metrics.activeReceivables,
      currency: true,
    },
    {
      label: "Hutang Aktif",
      value: financeInventorySummary.metrics.activePayables,
      currency: true,
    },
    {
      label: "Stok Kritis",
      value: financeInventorySummary.metrics.criticalStockCount,
      currency: false,
    },
  ];

  const dueItems = [
    ...financeInventorySummary.nearestReceivables.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.partyLabel,
      dueDate: item.dueDate,
      amount: item.outstandingAmount,
      href: `/finance/receivables/${item.id}`,
      type: "Piutang",
    })),
    ...financeInventorySummary.nearestSupplierPayables.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.supplierName,
      dueDate: item.dueDate,
      amount: item.outstandingAmount,
      href: `/finance/payables/${item.id}`,
      type: "Hutang",
    })),
  ]
    .sort((left, right) => {
      const leftTime = left.dueDate
        ? new Date(left.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueDate
        ? new Date(right.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 6);

  const dashboardWidgets: Record<DashboardWidgetId, ReactNode> = {
    "operational-trend": <OperationalTrendChart summary={trendSummary} />,
    "quick-kpis": (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Stat Kunci Hari Ini</CardTitle>
          <CardDescription>
            Ringkasan angka utama yang paling sering dipakai untuk membaca posisi operasional.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {quickKpis.map((kpi) => (
              <KpiCard
                key={kpi.label}
                currency={kpi.currency}
                label={kpi.label}
                value={Number(kpi.value)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    "onboarding-checklist": <DashboardOnboardingChecklist items={onboardingItems} />,
    "recent-activity": (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Transaksi Terbaru</CardTitle>
              <CardDescription className="mt-1">
                Ringkasan transaksi terakhir untuk pengecekan cepat owner dan admin.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/reports/transactions">
                Buka Laporan
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {snapshot.recentTransactions.length ? (
            <div className="p-4 md:p-6">
              <RecentActivityFeed
                items={snapshot.recentTransactions as Record<string, unknown>[]}
              />
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="Belum ada transaksi"
                description="Jalankan seed dan mulai input transaksi untuk menampilkan ringkasan dashboard."
              />
            </div>
          )}
        </CardContent>
      </Card>
    ),
    "due-items": (
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            <CardTitle>Jatuh Tempo Terdekat</CardTitle>
          </div>
          <CardDescription>
            Dokumen hutang dan piutang yang paling dekat jatuh tempo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueItems.length ? (
            dueItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="block rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors hover:bg-muted/35"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      {item.type}
                    </div>
                    <div className="mt-1 font-semibold text-foreground">{item.code}</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {item.label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.dueDate)}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-4 text-sm text-muted-foreground">
              Tidak ada dokumen jatuh tempo terdekat untuk dipantau saat ini.
            </div>
          )}
        </CardContent>
      </Card>
    ),
    "operational-alerts": (
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex items-center gap-2">
            <PackageSearch className="size-4 text-primary" />
            <CardTitle>Peringatan Operasional</CardTitle>
          </div>
          <CardDescription>
            Fokus cepat untuk tindak lanjut stok dan kontrol transaksi.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 size-4 text-primary" />
              <div>
                <div className="font-medium text-foreground">Stok kritis aktif</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {formatNumber(financeInventorySummary.metrics.criticalStockCount, 0)} item perlu
                  dicek. Gunakan modul stok untuk melihat detail item yang mendekati atau melewati
                  batas minimum.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 text-primary" />
              <div>
                <div className="font-medium text-foreground">Kontrol keuangan</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Posisi piutang {formatCurrency(financeInventorySummary.metrics.activeReceivables)}{" "}
                  dan hutang {formatCurrency(financeInventorySummary.metrics.activePayables)} sudah
                  sinkron dengan ledger aktif.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href="/inventory/stock">Cek Stok</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/finance/payables">Cek Hutang</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/finance/receivables">Cek Piutang</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    ),
    "support-help": (
      <Card>
        <CardHeader className="border-b border-border/70">
          <CardTitle>Butuh Bantuan Cepat?</CardTitle>
          <CardDescription>
            Saat user bingung di setup awal atau menemukan kendala operasional, arahkan langsung ke
            WhatsApp support agar tidak berhenti di dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
            Chat akan lebih efektif kalau user menyebut nama usaha, modul yang dibuka, dan kendala
            yang sedang terjadi.
          </div>
          <SupportWhatsappButton
            className="w-full justify-center"
            label="Hubungi WhatsApp Support"
            message={`Halo, saya butuh bantuan menggunakan dashboard untuk ${currentUser.fullName}. Mohon bantu arahan atau troubleshooting.`}
            showAvailability
            source="dashboard-help-card"
          />
        </CardContent>
      </Card>
    ),
    "tbs-purchase-daily": <TbsPurchaseDailyWidget summary={purchaseDailySummary} />,
    "tbs-sale-daily": <TbsSaleDailyWidget summary={saleDailySummary} />,
    "finance-inventory": (
      <FinanceInventoryWidget
        exposureTrend={financeExposureTrend}
        summary={financeInventorySummary}
      />
    ),
    "additional-kpis": (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <CardTitle>KPI Tambahan</CardTitle>
          <CardDescription>
            Metrik tambahan yang belum tercakup pada widget harian utama.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              currency
              label="Selisih Stok Opname"
              value={Number(snapshot.stockTakeVariance)}
            />
          </div>
        </CardContent>
      </Card>
    ),
  };

  return (
    <div className="space-y-6">
      <WelcomeOnboardingModal
        firstPendingHref={firstPendingOnboardingItem?.href ?? null}
        open={showWelcomeModal}
      />

      <FilterBar
        left={
          <>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Tanggal Operasional
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {purchaseDailySummary.selectedDateLabel}
              </div>
            </div>
            <div className="hidden h-8 w-px bg-border md:block" />
            <div className="text-sm text-muted-foreground">
              Dibandingkan dengan {purchaseDailySummary.previousDateLabel.toLowerCase()}.
            </div>
          </>
        }
        right={<DashboardDateFilter selectedDate={purchaseDailySummary.selectedDate} />}
      />

      <DashboardWorkspace
        defaultLayout={dashboardLayout.defaultLayout}
        initialLayout={dashboardLayout.layout}
        widgetItems={Object.entries(dashboardWidgets).map(([id, element]) => ({
          id: id as DashboardWidgetId,
          element,
        }))}
        widgets={dashboardLayout.availableWidgets}
      />
    </div>
  );
}
