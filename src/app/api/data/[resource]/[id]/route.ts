// Generic CRUD API for panel entities (item operations).
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ENTITY_MAP } from "@/lib/entities";
import { audit } from "@/lib/audit";
import { tableMap, buildRow, firstLabel } from "@/lib/crud";
import { getAuthContext, getClientIp } from "@/lib/security";
import { redactValue } from "@/lib/redact";

export const dynamic = "force-dynamic";

function parseId(id: string) {
  const numericId = Number(id);
  return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  const table: any = tableMap[resource];
  if (!table) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try {
    const auth = getAuthContext(req);
    if (!auth.permissions.has("*") && !auth.permissions.has("sites.read") && resource !== "auditLogs") {
      // Resource-specific access is enforced by the collection route and middleware;
      // this fallback prevents accidental direct exposure of an unmapped table.
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const numericId = parseId(id);
    if (!numericId) return Response.json({ error: "Invalid id" }, { status: 400 });
    const rows = await db.select().from(table).where(eq(table.id, numericId)).limit(1);
    return Response.json(rows[0] ? redactValue(rows[0]) : null, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return Response.json({ error: e?.status ? e.message : "Query failed" }, { status: e?.status || 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  const table: any = tableMap[resource];
  const entity = ENTITY_MAP[resource];
  if (!table || !entity) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try {
    const auth = getAuthContext(req);
    const numericId = parseId(id);
    if (!numericId) return Response.json({ error: "Invalid id" }, { status: 400 });
    const body = await req.json();
    if (!body || typeof body !== "object" || !body.values || typeof body.values !== "object") {
      return Response.json({ error: "values object is required" }, { status: 400 });
    }
    const row = buildRow(entity, body.values);
    const result: any = await db.update(table).set(row).where(eq(table.id, numericId)).returning();
    const updated = Array.isArray(result) ? result[0] : result;
    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    await audit(`${entity.singular} updated`, firstLabel(entity, updated), "", auth.user, getClientIp(req));
    return Response.json(redactValue(updated));
  } catch (e: any) {
    return Response.json({ error: e?.status ? e.message : "Update failed" }, { status: e?.status || 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  const table: any = tableMap[resource];
  const entity = ENTITY_MAP[resource];
  if (!table || !entity) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try {
    const auth = getAuthContext(req);
    const numericId = parseId(id);
    if (!numericId) return Response.json({ error: "Invalid id" }, { status: 400 });
    const existing = await db.select().from(table).where(eq(table.id, numericId)).limit(1);
    if (!existing[0]) return Response.json({ error: "Not found" }, { status: 404 });
    await db.delete(table).where(eq(table.id, numericId));
    await audit(`${entity.singular} deleted`, firstLabel(entity, existing[0]), "", auth.user, getClientIp(req));
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.status ? e.message : "Delete failed" }, { status: e?.status || 500 });
  }
}
