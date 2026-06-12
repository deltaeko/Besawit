import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";

import { normalizeRolePermissions } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db/client";
import { roles, users } from "@/lib/db/schema";

export async function authenticateUser(email: string, password: string) {
  const db = await getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      roleCode: roles.code,
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.isActive) {
    return null;
  }

  const passwordMatched = await compare(password, user.passwordHash);
  if (!passwordMatched) {
    return null;
  }

  return user;
}

export async function recordSuccessfulLogin(userId: string) {
  const db = await getDb();
  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export function resolveUserPermissions(user: { permissions?: unknown }) {
  return normalizeRolePermissions(user.permissions);
}
