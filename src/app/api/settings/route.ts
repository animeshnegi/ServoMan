// Key/value settings store.
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return Response.json(map);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: Record<string, string> = body.items || {};
    for (const [key, value] of Object.entries(items)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing[0]) {
        await db.update(settings).set({ value: String(value) }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: String(value) });
      }
    }
    await audit("Settings updated", `${Object.keys(items).length} key(s)`);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
