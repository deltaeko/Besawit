import { canAccessPermission, type AppPermissionKey, type RolePermissionMap } from "@/lib/auth/permissions";
import type { AppRole } from "@/types/domain";

export const dashboardPageKey = "main_dashboard" as const;

export const dashboardWidgetIds = [
  "operational-trend",
  "quick-kpis",
  "onboarding-checklist",
  "recent-activity",
  "due-items",
  "operational-alerts",
  "support-help",
  "tbs-purchase-daily",
  "tbs-sale-daily",
  "finance-inventory",
  "additional-kpis",
] as const;

export type DashboardWidgetId = (typeof dashboardWidgetIds)[number];
export type DashboardWidgetSize = "full" | "wide" | "half" | "narrow";
export const dashboardWidgetSizeOptions = ["full", "wide", "half", "narrow"] as const;
export type DashboardLayoutItem = {
  widgetId: DashboardWidgetId;
  visible: boolean;
  size?: DashboardWidgetSize;
};

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  title: string;
  description: string;
  defaultVisible: boolean;
  size: DashboardWidgetSize;
  permissionsAll?: AppPermissionKey[];
  permissionsAny?: AppPermissionKey[];
};

export const dashboardWidgetRegistry = [
  {
    id: "operational-trend",
    title: "Tren Operasional 7 Hari",
    description: "Pergerakan pembelian, penjualan, dan margin untuk membaca ritme operasional.",
    defaultVisible: true,
    size: "full",
  },
  {
    id: "quick-kpis",
    title: "Stat Kunci Hari Ini",
    description: "KPI cepat untuk owner dan admin agar tidak perlu buka banyak modul lebih dulu.",
    defaultVisible: true,
    size: "full",
  },
  {
    id: "onboarding-checklist",
    title: "Checklist Onboarding",
    description: "Bantu user trial menyelesaikan setup inti sampai transaksi pertama.",
    defaultVisible: true,
    size: "full",
  },
  {
    id: "recent-activity",
    title: "Aktivitas Terbaru",
    description: "Feed transaksi paling baru untuk pengecekan cepat dan follow-up harian.",
    defaultVisible: true,
    size: "wide",
  },
  {
    id: "due-items",
    title: "Jatuh Tempo Terdekat",
    description: "Pantau hutang dan piutang yang paling dekat jatuh tempo.",
    defaultVisible: true,
    size: "narrow",
    permissionsAny: ["finance.payables.view", "finance.receivables.view"],
  },
  {
    id: "operational-alerts",
    title: "Peringatan Operasional",
    description: "Sorot stok kritis dan posisi keuangan aktif yang perlu diawasi.",
    defaultVisible: true,
    size: "half",
    permissionsAny: ["inventory.stock", "finance.payables.view", "finance.receivables.view"],
  },
  {
    id: "support-help",
    title: "Bantuan Cepat",
    description: "Jalur cepat ke WhatsApp support agar user tidak berhenti saat bingung.",
    defaultVisible: true,
    size: "half",
  },
  {
    id: "tbs-purchase-daily",
    title: "Pembelian TBS Harian",
    description: "Detail pembelian TBS lengkap dengan ranking petani dan kualitas transaksi.",
    defaultVisible: true,
    size: "full",
    permissionsAny: ["palm.purchases"],
  },
  {
    id: "tbs-sale-daily",
    title: "Penjualan ke Pabrik Harian",
    description: "Pantau volume, nilai jual, margin, dan ranking pabrik secara operasional.",
    defaultVisible: true,
    size: "full",
    permissionsAny: ["palm.sales"],
  },
  {
    id: "finance-inventory",
    title: "Keuangan dan Stok",
    description: "Gabungkan eksposur hutang, piutang, stok kritis, dan tren finance.",
    defaultVisible: true,
    size: "full",
    permissionsAny: ["finance.payables.view", "finance.receivables.view", "inventory.stock"],
  },
  {
    id: "additional-kpis",
    title: "KPI Tambahan",
    description: "Metrik tambahan yang belum masuk ke ringkasan harian utama.",
    defaultVisible: true,
    size: "full",
  },
] as const satisfies readonly DashboardWidgetDefinition[];

export function buildDefaultDashboardLayout(
  widgets: readonly DashboardWidgetDefinition[] = dashboardWidgetRegistry,
): DashboardLayoutItem[] {
  return widgets.map((widget) => ({
    widgetId: widget.id,
    visible: widget.defaultVisible,
    size: widget.size,
  }));
}

export function getDashboardWidgetClassName(size: DashboardWidgetSize) {
  switch (size) {
    case "wide":
      return "xl:col-span-8";
    case "half":
      return "xl:col-span-6";
    case "narrow":
      return "xl:col-span-4";
    case "full":
    default:
      return "xl:col-span-12";
  }
}

export function canAccessDashboardWidget(
  role: AppRole,
  permissions: RolePermissionMap,
  widget: DashboardWidgetDefinition,
) {
  if (widget.permissionsAll?.length) {
    const hasAllPermissions = widget.permissionsAll.every((key) =>
      canAccessPermission(role, permissions, key),
    );

    if (!hasAllPermissions) {
      return false;
    }
  }

  if (widget.permissionsAny?.length) {
    return widget.permissionsAny.some((key) => canAccessPermission(role, permissions, key));
  }

  return true;
}

export function getAvailableDashboardWidgets(
  role: AppRole,
  permissions: RolePermissionMap,
) {
  return dashboardWidgetRegistry.filter((widget) =>
    canAccessDashboardWidget(role, permissions, widget),
  );
}
