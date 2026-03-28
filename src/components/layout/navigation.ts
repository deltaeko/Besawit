import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Leaf,
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
  group: "Dashboard" | "Transactions" | "Finance" | "Inventory" | "Master Data" | "Reports";
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
  permission?: AppPermissionKey;
  children?: NavigationChild[];
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
    href: "/finance/payables",
    icon: CreditCard,
    permission: "finance.view",
    roles: ["owner", "finance", "supervisor"],
  },
  {
    group: "Reports",
    title: "Reports",
    href: "/reports/transactions",
    icon: BarChart3,
    permission: "reports.view",
    roles: ["owner", "finance", "supervisor"],
  },
] satisfies NavigationItem[];
