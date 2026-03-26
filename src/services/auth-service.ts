import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { roles, users } from "@/lib/db/schema";

export async function authenticateUser(email: string, password: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      roleCode: roles.code,
      roleName: roles.name,
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
