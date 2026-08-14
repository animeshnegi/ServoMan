// Generic CRUD API for every panel entity (item operations).
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ENTITY_MAP } from "@/lib/entities";
import { audit } from "@/lib/audit";
import { tableMap, buildRow, firstLabel, clientIp } from "@/lib/crud";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await ctx.params;
  const table: any = tableMap[resource];
  if (!table) return Response.json({ error: "Unknown resource" }, { status: 404 });
  const rows = await db.select().from(table).where(eq(table.id, Number(id))).limit(1);
  return Response.json(rows[0] || null);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await ctx.params;
  const table: any = tableMap[resource];
  const entity = ENTITY_MAP[resource];
  if (!table || !entity) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    const body = await req.json();
    const row = buildRow(entity, body.values || {});
    const result: any = await db
      .update(table)
      .set(row)
      .where(eq(table.id, Number(id)))
      .returning();
    const updated = Array.isArray(result) ? result[0] : result;
    await audit(
      `${entity.singular} updated`,
      firstLabel(entity, updated),
      JSON.stringify(row).slice(0, 400),
      body.actor || "admin",
      clientIp(req)
    );
    return Response.json(updated);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await ctx.params;
  const table: any = tableMap[resource];
  const entity = ENTITY_MAP[resource];
  if (!table || !entity) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    const existing = await db.select().from(table).where(eq(table.id, Number(id))).limit(1);
    await db.delete(table).where(eq(table.id, Number(id)));
    await audit(
      `${entity.singular} deleted`,
      existing[0] ? firstLabel(entity, existing[0]) : `#${id}`,
      "",
      "admin",
      clientIp(req)
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
