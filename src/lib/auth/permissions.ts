import type { AppRole } from "@/types/domain";

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
  { key: "finance.view", group: "Finance", label: "Finance", routePrefix: "/finance" },
  { key: "reports.view", group: "Reports", label: "Reports", routePrefix: "/reports" },
] as const;

export type AppPermissionKey = (typeof appPermissionDefinitions)[number]["key"];
export type RolePermissionMap = Partial<Record<AppPermissionKey, boolean>>;

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
    "finance.view",
    "reports.view",
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
    "finance.view",
    "reports.view",
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
  return Object.keys(normalized).length ? normalized : getDefaultPermissionsForRole(role);
}

export function canAccessPermission(
  role: AppRole,
  permissions: RolePermissionMap | undefined | null,
  key: AppPermissionKey,
) {
  const effectivePermissions = getEffectivePermissions(role, permissions);
  return Boolean(effectivePermissions[key]);
}

export function findPermissionByPath(pathname: string) {
  return appPermissionDefinitions
    .slice()
    .sort((a, b) => b.routePrefix.length - a.routePrefix.length)
    .find((item) => pathname.startsWith(item.routePrefix));
}

export function formatPermissionLabel(key: string) {
  const definition = appPermissionDefinitions.find((item) => item.key === key);
  return definition ? `${definition.group} / ${definition.label}` : key;
}
