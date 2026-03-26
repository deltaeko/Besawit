export const appRoles = [
  "owner",
  "admin_sawit",
  "admin_store",
  "finance",
  "supervisor",
] as const;

export type AppRole = (typeof appRoles)[number];

export const paymentStatuses = [
  "unpaid",
  "partial",
  "paid",
  "overdue",
] as const;

export const approvalStatuses = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
export type ApprovalStatus = (typeof approvalStatuses)[number];

export type MasterEntityKey =
  | "farmers"
  | "factories"
  | "customers"
  | "suppliers"
  | "transport-personnel"
  | "vehicles"
  | "warehouses"
  | "products"
  | "categories"
  | "users"
  | "roles";

export type PalmEntityKey = "purchases" | "sales";
export type StoreEntityKey = "purchases" | "sales";

export type RouteAccessRule = {
  href: string;
  roles: AppRole[];
};
