import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
}

/**
 * Fire-and-forget audit write. We swallow any error so a logging failure
 * never breaks the primary operation — auditability matters but not at
 * the cost of refusing the write the dispatcher actually wanted.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      meta: entry.meta ?? null,
      ip: entry.ip ?? null,
    });
  } catch (err) {
    console.error("[audit] write failed", err);
  }
}
