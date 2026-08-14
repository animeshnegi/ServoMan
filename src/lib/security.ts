import { NextRequest } from "next/server";

export type Role = "admin" | "operator" | "viewer";

const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
  admin: new Set(["*"]),
  operator: new Set([
    "dashboard.read",
    "sites.read", "sites.write",
    "dns.read", "dns.write",
    "databases.read", "databases.write",
    "deployments.read", "deployments.write",
    "containers.read", "containers.write",
    "services.read", "services.write",
    "backups.read", "backups.write",
    "monitoring.read",
    "logs.read",
  ]),
  viewer: new Set(["dashboard.read", "monitoring.read", "logs.read"]),
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Resolve the authenticated panel identity.
 *
 * ServoMan intentionally supports an external reverse-proxy auth layer through
 * trusted headers. Never expose this route directly to the Internet without a
 * trusted proxy that strips/replaces these headers. In production, set
 * SERVOMAN_TRUSTED_PROXY_SECRET and require the matching secret header.
 */
export function getAuthContext(req: NextRequest) {
  const secret = process.env.SERVOMAN_TRUSTED_PROXY_SECRET;
  const supplied = req.headers.get("x-servoman-proxy-secret");
  const user = req.headers.get("x-servoman-user");
  const role = (req.headers.get("x-servoman-role") || "viewer") as Role;

  if (!secret || !supplied || supplied !== secret || !user) {
    throw new AuthError("Authentication required");
  }
  if (!(role in ROLE_PERMISSIONS)) throw new AuthError("Invalid role", 403);

  return { user, role, permissions: ROLE_PERMISSIONS[role] };
}

export function requirePermission(req: NextRequest, permission: string) {
  const ctx = getAuthContext(req);
  if (!ctx.permissions.has("*") && !ctx.permissions.has(permission)) {
    throw new AuthError("Insufficient permissions", 403);
  }
  return ctx;
}

export function jsonAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export function getClientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") || "unknown";
}
