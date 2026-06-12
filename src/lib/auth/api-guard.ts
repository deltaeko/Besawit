import { NextResponse } from "next/server";

import {
  canAccessPermission,
  type AppPermissionKey,
  type RolePermissionMap,
} from "@/lib/auth/permissions";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import type { MasterEntityKey } from "@/types/domain";

const masterEntityPermissionMap: Record<MasterEntityKey, AppPermissionKey> = {
  farmers: "master.farmers",
  factories: "master.factories",
  customers: "master.customers",
  suppliers: "master.suppliers",
  "transport-personnel": "master.transport_personnel",
  vehicles: "master.vehicles",
  warehouses: "master.warehouses",
  products: "master.products",
  categories: "master.categories",
  users: "master.users",
  roles: "master.roles",
};

const referenceTypePermissionMap = {
  tbs_purchase: "palm.purchases",
  tbs_sale: "palm.sales",
  store_purchase: "store.purchases",
  store_sale: "store.sales",
  stock_take: "inventory.stock_takes",
  stock_adjustment: "inventory.adjustments",
  payment: "finance.payments.view",
} as const satisfies Record<string, AppPermissionKey>;

const documentTypePermissionMap = {
  payable_statement: "finance.payables.view",
  receivable_statement: "finance.receivables.view",
  payment_receipt: "finance.payments.view",
  store_invoice: "store.sales",
  stock_take_report: "inventory.stock_takes",
} as const satisfies Record<string, AppPermissionKey>;

export async function requireSessionUser() {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  return { session, response: null };
}

export function hasPermission(
  session: SessionPayload,
  permission: AppPermissionKey,
  permissions?: RolePermissionMap | null,
) {
  return canAccessPermission(
    session.role,
    permissions ?? session.permissions,
    permission,
  );
}

export async function requirePermission(permission: AppPermissionKey) {
  const auth = await requireSessionUser();
  if (auth.response || !auth.session) {
    return auth;
  }

  if (!hasPermission(auth.session, permission)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Anda tidak memiliki hak akses untuk aksi ini." },
        { status: 403 },
      ),
    };
  }

  return auth;
}

export async function requireMasterEntityPermission(entity: MasterEntityKey) {
  return requirePermission(masterEntityPermissionMap[entity]);
}

export async function requireReferenceTypePermission(
  referenceType: keyof typeof referenceTypePermissionMap,
) {
  return requirePermission(referenceTypePermissionMap[referenceType]);
}

export async function requireDocumentPermission(
  input:
    | {
        referenceType: keyof typeof referenceTypePermissionMap;
        documentType?: never;
      }
    | {
        referenceType: "manual";
        documentType: keyof typeof documentTypePermissionMap;
      },
) {
  if (input.referenceType === "manual") {
    return requirePermission(documentTypePermissionMap[input.documentType]);
  }

  return requirePermission(referenceTypePermissionMap[input.referenceType]);
}
