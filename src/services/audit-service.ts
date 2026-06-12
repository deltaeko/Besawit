import { getDb } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import { listAuditLogsByEntity } from "@/repositories/audit-repository";

export async function logAudit(input: {
  entityType: string;
  entityId?: string | null;
  action: string;
  actorId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    action: input.action,
    actorId: input.actorId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    metadata: input.metadata ?? null,
  });
}

export async function getAuditLogsByEntity(
  entityType: string,
  entityId: string,
  limit = 20,
) {
  return listAuditLogsByEntity(entityType, entityId, limit);
}
