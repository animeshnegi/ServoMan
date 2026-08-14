import { NextRequest } from "next/server";
import { getAuthContext, getClientIp } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export function authorizeAction(req: NextRequest, action: string) {
  const auth = getAuthContext(req);
  const limited = rateLimit(`action:${getClientIp(req)}:${auth.user}`, 30, 60_000);
  if (!limited.allowed) throw Object.assign(new Error("Too many requests"), { status: 429 });

  const permission = action.startsWith("firewall.") || action.startsWith("service.")
    ? "services.write"
    : action.startsWith("docker.")
      ? "containers.write"
      : action.startsWith("backup.")
        ? "backups.write"
        : action.startsWith("deploy.")
          ? "deployments.write"
          : action.startsWith("dns.")
            ? "dns.write"
            : action.startsWith("cert.")
              ? "sites.write"
              : action.startsWith("terminal.") || action.startsWith("file.")
                ? "admin.shell"
                : "admin.actions";

  if (!auth.permissions.has("*") && !auth.permissions.has(permission)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return auth;
}
