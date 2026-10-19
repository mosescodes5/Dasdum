import { getDb } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

export async function logAdminAction(params: {
  adminUserId: string;
  action: string; // e.g. "product.create", "order.status_update"
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    adminUserId: params.adminUserId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    createdAt: new Date().toISOString(),
  });
}
