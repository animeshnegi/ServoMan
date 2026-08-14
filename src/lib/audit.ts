import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/**
 * Write a bounded audit event. Callers handling authenticated requests should
 * always pass the authenticated actor and client IP explicitly. The default is
 * intentionally `system` rather than `admin` so an omitted actor is never
 * misrepresented as a privileged human administrator.
 */
export async function audit(
  action: string,
  target: string,
  detail = "",
  actor = "system",
  ip = "unknown"
) {
  try {
    await db
      .insert(auditLogs)
      .values({ actor, action, target, detail: detail.slice(0, 500), ip });
  } catch {
    /* audit logging must never break the main operation */
  }
}
