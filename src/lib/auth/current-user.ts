import { eq } from "drizzle-orm";

import { normalizeRolePermissions } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { roles, users } from "@/lib/db/schema";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      roleCode: roles.code,
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, session.sub))
    .limit(1);

  if (!user) return null;

  return {
    ...user,
    permissions: normalizeRolePermissions(user.permissions),
    role: session.role,
  };
}
