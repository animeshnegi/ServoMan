// Generic CRUD API for every panel entity (list + create).
import { NextRequest } from "next/server";
import { desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { ENTITY_MAP } from "@/lib/entities";
import { audit } from "@/lib/audit";
import { tableMap, buildRow, firstLabel, clientIp } from "@/lib/crud";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> }
) {
  const { resource } = await ctx.params;
  const table: any = tableMap[resource];
  if (!table) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try {
    const url = new URL(req.url);
    const sort = url.searchParams.get("sort") || "id";
    const order = url.searchParams.get("order") === "desc" ? desc : asc;
    const col = table[sort] ?? table.id;
    const rows = await db.select().from(table).orderBy(order(col));
    return Response.json(rows);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Query failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> }
) {
  const { resource } = await ctx.params;
  const table: any = tableMap[resource];
  const entity = ENTITY_MAP[resource];
  if (!table || !entity) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try {
    const body = await req.json();
    const row = buildRow(entity, body.values || {});
    const result: any = await db.insert(table).values(row).returning();
    const inserted = Array.isArray(result) ? result[0] : result;
    await audit(
      `${entity.singular} created`,
      firstLabel(entity, inserted),
      JSON.stringify(row).slice(0, 400),
      body.actor || "admin",
      clientIp(req)
    );
    return Response.json(inserted);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Create failed" }, { status: 500 });
  }
}
