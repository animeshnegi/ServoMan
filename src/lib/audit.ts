import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(
  action: string,
  target: string,
  detail = "",
  actor = "admin",
  ip = "127.0.0.1"
) {
  try {
    await db
      .insert(auditLogs)
      .values({ actor, action, target, detail: detail.slice(0, 500), ip });
  } catch {
    /* audit logging must never break the main operation */
  }
}
