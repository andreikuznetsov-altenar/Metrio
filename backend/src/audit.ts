import type { MetrioDb } from "./db/store.ts";

export function appendAudit(
  db: MetrioDb,
  actorId: string,
  action: string,
  entity: string,
): void {
  db.audit.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorId,
    action,
    entity,
    at: new Date().toISOString(),
  });
  if (db.audit.length > 500) db.audit.length = 500;
}
