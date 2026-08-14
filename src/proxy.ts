import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const ADMIN_PATHS = [
  "/api/action",
  "/api/terminal",
  "/api/files",
  "/api/git",
  "/api/settings",
];
const ADMIN_RESOURCES = new Set(["panelUsers", "auditLogs", "sshKeys", "settings"]);

/**
 * Server-side network boundary for panel/API traffic.
 * The reverse proxy must strip client-supplied x-servoman-* headers and inject
 * authenticated values. Git webhooks authenticate with their deployment token.
 */
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/api/health" || path.startsWith("/api/webhooks/git")) {
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  if (!path.startsWith("/api/") && !path.startsWith("/panel")) return NextResponse.next();

  const secret = process.env.SERVOMAN_TRUSTED_PROXY_SECRET;
  const supplied = req.headers.get("x-servoman-proxy-secret");
  const user = req.headers.get("x-servoman-user");
  const role = req.headers.get("x-servoman-role") || "viewer";

  if (!secret || supplied !== secret || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!new Set(["admin", "operator", "viewer"]).has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 403 });
  }

  const limited = rateLimit(`${user}:${req.method}:${path}`, path.startsWith("/api/action") ? 30 : 120, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const adminPath = ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (adminPath && role !== "admin") {
    return NextResponse.json({ error: "Administrator privileges required" }, { status: 403 });
  }

  if (path.startsWith("/api/data/")) {
    const parts = path.split("/").filter(Boolean);
    const resource = parts[2] || "";
    const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (ADMIN_RESOURCES.has(resource) && role !== "admin") {
      return NextResponse.json({ error: "Administrator privileges required" }, { status: 403 });
    }
    if (isMutation && role === "viewer") {
      return NextResponse.json({ error: "Operator privileges required" }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/panel/:path*"],
};
