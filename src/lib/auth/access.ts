import { canAccessPermission, findPermissionByPath, type RolePermissionMap } from "@/lib/auth/permissions";
import type { AppRole, RouteAccessRule } from "@/types/domain";

export const routeAccessRules: RouteAccessRule[] = [
  {
    href: "/dashboard",
    roles: ["owner", "admin_sawit", "admin_store", "finance", "supervisor"],
  },
  {
    href: "/master",
    roles: ["owner", "admin_sawit", "admin_store", "supervisor"],
  },
  {
    href: "/palm",
    roles: ["owner", "admin_sawit", "finance", "supervisor"],
  },
  {
    href: "/store",
    roles: ["owner", "admin_store", "finance", "supervisor"],
  },
  {
    href: "/inventory",
    roles: ["owner", "admin_store", "admin_sawit", "supervisor"],
  },
  {
    href: "/finance",
    roles: ["owner", "finance", "supervisor"],
  },
  {
    href: "/reports",
    roles: ["owner", "finance", "supervisor"],
  },
];

export function canAccessPath(
  role: AppRole,
  permissions: RolePermissionMap | undefined,
  pathname: string,
) {
  const matchedPermission = findPermissionByPath(pathname);

  if (matchedPermission) {
    return canAccessPermission(role, permissions, matchedPermission.key);
  }

  const matchedRule = routeAccessRules.find((rule) => pathname.startsWith(rule.href));

  if (!matchedRule) return true;

  return matchedRule.roles.includes(role);
}
