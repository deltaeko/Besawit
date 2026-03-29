import type { AppRole } from "@/types/domain";

type AppPermissionDefinition = {
  key: string;
  group: string;
  label: string;
  routePrefix?: string;
};

export const appPermissionDefinitions = [
  { key: "dashboard.view", group: "Dashboard", label: "Dashboard", routePrefix: "/dashboard" },
  { key: "master.farmers", group: "Master Data", label: "Petani", routePrefix: "/master/farmers" },
  { key: "master.factories", group: "Master Data", label: "Pabrik", routePrefix: "/master/factories" },
  { key: "master.customers", group: "Master Data", label: "Pelanggan", routePrefix: "/master/customers" },
  { key: "master.suppliers", group: "Master Data", label: "Supplier", routePrefix: "/master/suppliers" },
  {
    key: "master.transport_personnel",
    group: "Master Data",
    label: "Personel Armada",
    routePrefix: "/master/transport-personnel",
  },
  { key: "master.vehicles", group: "Master Data", label: "Kendaraan", routePrefix: "/master/vehicles" },
  { key: "master.warehouses", group: "Master Data", label: "Gudang", routePrefix: "/master/warehouses" },
  { key: "master.products", group: "Master Data", label: "Produk", routePrefix: "/master/products" },
  { key: "master.categories", group: "Master Data", label: "Kategori", routePrefix: "/master/categories" },
  { key: "master.users", group: "Master Data", label: "Pengguna", routePrefix: "/master/users" },
  { key: "master.roles", group: "Master Data", label: "Peran", routePrefix: "/master/roles" },
  { key: "palm.purchases", group: "Transactions", label: "Pembelian TBS", routePrefix: "/palm/purchases" },
  {
    key: "palm.sales",
    group: "Transactions",
    label: "Penjualan ke Pabrik",
    routePrefix: "/palm/sales",
  },
  { key: "store.purchases", group: "Transactions", label: "Pembelian Barang", routePrefix: "/store/purchases" },
  { key: "store.sales", group: "Transactions", label: "Penjualan Toko", routePrefix: "/store/sales" },
  { key: "inventory.stock", group: "Inventory", label: "Stok", routePrefix: "/inventory/stock" },
  {
    key: "inventory.stock_takes",
    group: "Inventory",
    label: "Stock Take",
    routePrefix: "/inventory/stock-takes",
  },
  {
    key: "inventory.adjustments",
    group: "Inventory",
    label: "Adjustment",
    routePrefix: "/inventory/adjustments",
  },
  {
    key: "inventory.movements",
    group: "Inventory",
    label: "Histori Mutasi",
    routePrefix: "/inventory/movements",
  },
  {
    key: "finance.payables.view",
    group: "Finance",
    label: "Hutang",
    routePrefix: "/finance/payables",
  },
  {
    key: "finance.receivables.view",
    group: "Finance",
    label: "Piutang",
    routePrefix: "/finance/receivables",
  },
  {
    key: "finance.payments.view",
    group: "Finance",
    label: "Pembayaran & Penerimaan",
    routePrefix: "/finance/payments",
  },
  {
    key: "finance.cash_ledger.view",
    group: "Finance",
    label: "Cash Ledger",
    routePrefix: "/finance/cash-ledger",
  },
  {
    key: "reports.transactions.view",
    group: "Reports",
    label: "Laporan Transaksi",
    routePrefix: "/reports/transactions",
  },
  {
    key: "reports.margin.view",
    group: "Reports",
    label: "Laporan Margin",
    routePrefix: "/reports/margin",
  },
  {
    key: "reports.payables.view",
    group: "Reports",
    label: "Laporan Hutang",
    routePrefix: "/reports/payables",
  },
  {
    key: "reports.receivables.view",
    group: "Reports",
    label: "Laporan Piutang",
    routePrefix: "/reports/receivables",
  },
  {
    key: "reports.profit_loss.view",
    group: "Reports",
    label: "Laporan Laba Rugi",
    routePrefix: "/reports/profit-loss",
  },
  {
    key: "reports.stock.view",
    group: "Reports",
    label: "Laporan Stok",
    routePrefix: "/reports/stock",
  },
  {
    key: "reports.stock_take.view",
    group: "Reports",
    label: "Laporan Stock Take",
    routePrefix: "/reports/stock-take",
  },
  {
    key: "reports.returns.view",
    group: "Reports",
    label: "Laporan Retur",
    routePrefix: "/reports/returns",
  },
  {
    key: "reports.deductions.view",
    group: "Reports",
    label: "Laporan Potongan",
    routePrefix: "/reports/deductions",
  },
  {
    key: "finance.payments.manage",
    group: "Aksi Sensitif",
    label: "Catat Pembayaran & Penerimaan",
    routePrefix: "",
  },
  {
    key: "palm.purchases.void",
    group: "Aksi Sensitif",
    label: "Void Pembelian TBS",
    routePrefix: "",
  },
  {
    key: "palm.sales.void",
    group: "Aksi Sensitif",
    label: "Void Penjualan TBS",
    routePrefix: "",
  },
  {
    key: "store.purchases.return",
    group: "Aksi Sensitif",
    label: "Retur Pembelian Barang",
    routePrefix: "",
  },
  {
    key: "store.purchases.void",
    group: "Aksi Sensitif",
    label: "Void Pembelian Barang",
    routePrefix: "",
  },
  {
    key: "inventory.stock_takes.approve",
    group: "Aksi Sensitif",
    label: "Approve Stock Take",
    routePrefix: "",
  },
  {
    key: "inventory.adjustments.approve",
    group: "Aksi Sensitif",
    label: "Approve Adjustment",
    routePrefix: "",
  },
] as const satisfies readonly AppPermissionDefinition[];

export type AppPermissionKey = (typeof appPermissionDefinitions)[number]["key"];
export type RolePermissionMap = Partial<Record<AppPermissionKey, boolean>>;
export const actionPermissionKeys = [
  "finance.payments.manage",
  "palm.purchases.void",
  "palm.sales.void",
  "store.purchases.return",
  "store.purchases.void",
  "inventory.stock_takes.approve",
  "inventory.adjustments.approve",
] as const;
export type AppActionPermissionKey = (typeof actionPermissionKeys)[number];

const defaultPermissionsByRole: Record<string, AppPermissionKey[]> = {
  owner: appPermissionDefinitions.map((item) => item.key),
  admin_sawit: [
    "dashboard.view",
    "master.farmers",
    "master.factories",
    "master.customers",
    "master.suppliers",
    "master.transport_personnel",
    "master.vehicles",
    "master.warehouses",
    "master.products",
    "master.categories",
    "master.users",
    "master.roles",
    "palm.purchases",
    "palm.sales",
    "inventory.stock",
    "inventory.stock_takes",
    "inventory.adjustments",
    "inventory.movements",
  ],
  admin_store: [
    "dashboard.view",
    "master.farmers",
    "master.factories",
    "master.customers",
    "master.suppliers",
    "master.transport_personnel",
    "master.vehicles",
    "master.warehouses",
    "master.products",
    "master.categories",
    "master.users",
    "master.roles",
    "store.purchases",
    "store.sales",
    "store.purchases.return",
    "inventory.stock",
    "inventory.stock_takes",
    "inventory.adjustments",
    "inventory.movements",
  ],
  finance: [
    "dashboard.view",
    "palm.purchases",
    "palm.sales",
    "store.purchases",
    "store.sales",
    "inventory.movements",
    "finance.payables.view",
    "finance.receivables.view",
    "finance.payments.view",
    "finance.cash_ledger.view",
    "finance.payments.manage",
    "reports.transactions.view",
    "reports.margin.view",
    "reports.payables.view",
    "reports.receivables.view",
    "reports.profit_loss.view",
    "reports.stock.view",
    "reports.stock_take.view",
    "reports.returns.view",
    "reports.deductions.view",
  ],
  supervisor: [
    "dashboard.view",
    "master.farmers",
    "master.factories",
    "master.customers",
    "master.suppliers",
    "master.transport_personnel",
    "master.vehicles",
    "master.warehouses",
    "master.products",
    "master.categories",
    "master.users",
    "master.roles",
    "palm.purchases",
    "palm.sales",
    "store.purchases",
    "store.sales",
    "inventory.stock",
    "inventory.stock_takes",
    "inventory.adjustments",
    "inventory.movements",
    "finance.payables.view",
    "finance.receivables.view",
    "finance.payments.view",
    "finance.cash_ledger.view",
    "reports.transactions.view",
    "reports.margin.view",
    "reports.payables.view",
    "reports.receivables.view",
    "reports.profit_loss.view",
    "reports.stock.view",
    "reports.stock_take.view",
    "reports.returns.view",
    "reports.deductions.view",
    "finance.payments.manage",
    "palm.purchases.void",
    "palm.sales.void",
    "store.purchases.return",
    "store.purchases.void",
    "inventory.stock_takes.approve",
    "inventory.adjustments.approve",
  ],
};

export function normalizeRolePermissions(value: unknown): RolePermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, enabled]) => Boolean(enabled)),
  ) as RolePermissionMap;
}

export function getDefaultPermissionsForRole(role: AppRole): RolePermissionMap {
  const keys = defaultPermissionsByRole[role] ?? [];
  return Object.fromEntries(keys.map((key) => [key, true])) as RolePermissionMap;
}

export function getEffectivePermissions(
  role: AppRole,
  permissions?: RolePermissionMap | null,
): RolePermissionMap {
  const normalized = normalizeRolePermissions(permissions);
  if (!Object.keys(normalized).length) {
    return getDefaultPermissionsForRole(role);
  }

  const effectivePermissions = { ...normalized } as Record<string, boolean>;

  if (effectivePermissions["finance.view"]) {
    effectivePermissions["finance.payables.view"] = true;
    effectivePermissions["finance.receivables.view"] = true;
    effectivePermissions["finance.payments.view"] = true;
    effectivePermissions["finance.cash_ledger.view"] = true;
  }

  if (effectivePermissions["reports.view"]) {
    effectivePermissions["reports.transactions.view"] = true;
    effectivePermissions["reports.margin.view"] = true;
    effectivePermissions["reports.payables.view"] = true;
    effectivePermissions["reports.receivables.view"] = true;
    effectivePermissions["reports.profit_loss.view"] = true;
    effectivePermissions["reports.stock.view"] = true;
    effectivePermissions["reports.stock_take.view"] = true;
    effectivePermissions["reports.returns.view"] = true;
    effectivePermissions["reports.deductions.view"] = true;
  }

  return effectivePermissions as RolePermissionMap;
}

export function canAccessPermission(
  role: AppRole,
  permissions: RolePermissionMap | undefined | null,
  key: AppPermissionKey,
) {
  const effectivePermissions = getEffectivePermissions(role, permissions);
  return Boolean(effectivePermissions[key]);
}

export function canPerformAction(
  role: AppRole,
  permissions: RolePermissionMap | undefined | null,
  key: AppActionPermissionKey,
) {
  return canAccessPermission(role, permissions, key);
}

export function findPermissionByPath(pathname: string) {
  return appPermissionDefinitions
    .filter(
      (
        item,
      ): item is (typeof appPermissionDefinitions)[number] & {
        routePrefix: string;
      } => Boolean(item.routePrefix),
    )
    .slice()
    .sort((a, b) => b.routePrefix.length - a.routePrefix.length)
    .find((item) => pathname.startsWith(item.routePrefix));
}

export function formatPermissionLabel(key: string) {
  const definition = appPermissionDefinitions.find((item) => item.key === key);
  return definition ? `${definition.group} / ${definition.label}` : key;
}
