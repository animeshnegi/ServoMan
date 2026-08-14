import { NextRequest, NextResponse } from "next/server";

/**
 * Defense-in-depth gate for all panel/API traffic.
 * Authentication is delegated to a trusted proxy layer. The proxy must inject
 * x-servoman-user, x-servoman-role and x-servoman-proxy-secret after stripping
 * any client-supplied copies.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/api/") && !path.startsWith("/panel")) {
    return NextResponse.next();
  }

  const secret = process.env.SERVOMAN_TRUSTED_PROXY_SECRET;
  const supplied = req.headers.get("x-servoman-proxy-secret");
  const user = req.headers.get("x-servoman-user");

  if (!secret || supplied !== secret || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
