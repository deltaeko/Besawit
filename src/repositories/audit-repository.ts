import { and, desc, eq, getTableColumns } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { auditLogs, users } from "@/lib/db/schema";

export async function listAuditLogsByEntity(
  entityType: string,
  entityId: string,
  limit = 20,
) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(auditLogs),
      actorName: users.fullName,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
