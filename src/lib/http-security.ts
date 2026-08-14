import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export function protectRequest(req: NextRequest) {
  const result = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 120, 60_000);
  if (!result.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  return null;
}
