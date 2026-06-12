import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Leaf,
  Palette,
  Package2,
  Settings2,
} from "lucide-react";

import type { AppPermissionKey } from "@/lib/auth/permissions";
import type { AppRole } from "@/types/domain";

export type NavigationChild = {
  title: string;
  href: string;
  roles: AppRole[];
  permission: AppPermissionKey;
};

export type NavigationItem = {
  group:
    | "Dashboard"
    | "Transactions"
    | "Finance"
    | "Inventory"
    | "Master Data"
    | "Settings"
    | "Reports"
    | "Platform";
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
  permission?: AppPermissionKey;
  children?: NavigationChild[];
};

export type ResolvedNavigationContext = {
  group: NavigationItem["group"];
  pageTitle: string;
  sectionTitle: string;
};

export const appNavigation = [
  {
    group: "Dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
    roles: ["owner", "admin_sawit", "admin_store", "finance", "supervisor"],
  },
  {
    group: "Platform",
    title: "Platform Trials",
    href: "/platform/trials",
    icon: Settings2,
    permission: "dashboard.view",
    roles: ["owner"],
  },
  {
    group: "Platform",
    title: "Platform SMTP",
    href: "/platform/smtp",
    icon: Settings2,
    permission: "dashboard.view",
    roles: ["owner"],
  },
  {
    group: "Settings",
    title: "Branding",
    href: "/settings/branding",
    icon: Palette,
    permission: "settings.branding",
    roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
  },
  {
    group: "Master Data",
    title: "Master Data",
    icon: Settings2,
    roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
    children: [
      {
        title: "Petani",
        href: "/master/farmers",
        permission: "master.farmers",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Pabrik",
        href: "/master/factories",
        permission: "master.factories",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Pelanggan",
        href: "/master/customers",
        permission: "master.customers",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Supplier",
        href: "/master/suppliers",
        permission: "master.suppliers",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Personel Armada",
        href: "/master/transport-personnel",
        permission: "master.transport_personnel",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Kendaraan",
        href: "/master/vehicles",
        permission: "master.vehicles",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Gudang",
        href: "/master/warehouses",
        permission: "master.warehouses",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Produk",
        href: "/master/products",
        permission: "master.products",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Kategori",
        href: "/master/categories",
        permission: "master.categories",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Pengguna",
        href: "/master/users",
        permission: "master.users",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
      {
        title: "Peran",
        href: "/master/roles",
        permission: "master.roles",
        roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
      },
    ],
  },
  {
    group: "Transactions",
    title: "Palm Agent",
    icon: Leaf,
    roles: ["owner", "admin_sawit", "finance", "supervisor"],
    children: [
      {
        title: "Pembelian TBS",
        href: "/palm/purchases",
        permission: "palm.purchases",
        roles: ["owner", "admin_sawit", "finance", "supervisor"],
      },
      {
        title: "Penjualan ke Pabrik",
        href: "/palm/sales",
        permission: "palm.sales",
        roles: ["owner", "admin_sawit", "finance", "supervisor"],
      },
    ],
  },
  {
    group: "Transactions",
    title: "Store",
    icon: Package2,
    roles: ["owner", "admin_store", "finance", "supervisor"],
    children: [
      {
        title: "Pembelian Barang",
        href: "/store/purchases",
        permission: "store.purchases",
        roles: ["owner", "admin_store", "finance", "supervisor"],
      },
      {
        title: "Penjualan Toko",
        href: "/store/sales",
        permission: "store.sales",
        roles: ["owner", "admin_store", "finance", "supervisor"],
      },
    ],
  },
  {
    group: "Inventory",
    title: "Inventory",
    icon: Boxes,
    roles: ["owner", "admin_store", "admin_sawit", "supervisor"],
    children: [
      {
        title: "Stok",
        href: "/inventory/stock",
        permission: "inventory.stock",
        roles: ["owner", "admin_store", "admin_sawit", "supervisor"],
      },
      {
        title: "Stock Take",
        href: "/inventory/stock-takes",
        permission: "inventory.stock_takes",
        roles: ["owner", "admin_store", "admin_sawit", "supervisor"],
      },
      {
        title: "Adjustment",
        href: "/inventory/adjustments",
        permission: "inventory.adjustments",
        roles: ["owner", "admin_store", "admin_sawit", "supervisor"],
      },
      {
        title: "Histori Mutasi",
        href: "/inventory/movements",
        permission: "inventory.movements",
        roles: ["owner", "admin_store", "admin_sawit", "finance", "supervisor"],
      },
    ],
  },
  {
    group: "Finance",
    title: "Finance",
    icon: CreditCard,
    roles: ["owner", "finance", "supervisor"],
    children: [
      {
        title: "Hutang",
        href: "/finance/payables",
        permission: "finance.payables.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Piutang",
        href: "/finance/receivables",
        permission: "finance.receivables.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Pembayaran",
        href: "/finance/payments",
        permission: "finance.payments.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Cash Ledger",
        href: "/finance/cash-ledger",
        permission: "finance.cash_ledger.view",
        roles: ["owner", "finance", "supervisor"],
      },
    ],
  },
  {
    group: "Reports",
    title: "Reports",
    icon: BarChart3,
    roles: ["owner", "finance", "supervisor"],
    children: [
      {
        title: "Transaksi",
        href: "/reports/transactions",
        permission: "reports.transactions.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Margin",
        href: "/reports/margin",
        permission: "reports.margin.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Hutang",
        href: "/reports/payables",
        permission: "reports.payables.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Piutang",
        href: "/reports/receivables",
        permission: "reports.receivables.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Laba Rugi",
        href: "/reports/profit-loss",
        permission: "reports.profit_loss.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Stok",
        href: "/reports/stock",
        permission: "reports.stock.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Stock Take",
        href: "/reports/stock-take",
        permission: "reports.stock_take.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Retur",
        href: "/reports/returns",
        permission: "reports.returns.view",
        roles: ["owner", "finance", "supervisor"],
      },
      {
        title: "Potongan",
        href: "/reports/deductions",
        permission: "reports.deductions.view",
        roles: ["owner", "finance", "supervisor"],
      },
    ],
  },
] satisfies NavigationItem[];

export function resolveNavigationContext(
  pathname: string,
  items: NavigationItem[],
): ResolvedNavigationContext | null {
  const directMatches = items
    .filter((item) => item.href && pathname.startsWith(item.href))
    .sort((left, right) => (right.href?.length ?? 0) - (left.href?.length ?? 0));

  const directMatch = directMatches[0];
  if (directMatch?.href) {
    return {
      group: directMatch.group,
      pageTitle: directMatch.title,
      sectionTitle: directMatch.title,
    };
  }

  for (const item of items) {
    const matchingChildren =
      item.children
        ?.filter((child) => pathname.startsWith(child.href))
        .sort((left, right) => right.href.length - left.href.length) ?? [];
    const child = matchingChildren[0];

    if (child) {
      return {
        group: item.group,
        pageTitle: child.title,
        sectionTitle: item.title,
      };
    }
  }

  return null;
}
