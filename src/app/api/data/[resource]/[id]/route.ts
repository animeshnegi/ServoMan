// Generic CRUD API for panel entities (item operations).
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ENTITY_MAP } from "@/lib/entities";
import { audit } from "@/lib/audit";
import { tableMap, buildRow, firstLabel } from "@/lib/crud";
import { getAuthContext, getClientIp } from "@/lib/security";
import { permissionForResource } from "@/lib/resource-permissions";
import { redactValue } from "@/lib/redact";
import { createOrUpdateNginxSite, deleteNginxSite } from "@/lib/nginx-sites";
import { dropDatabase, dropDatabaseUser, createDatabaseUser } from "@/lib/database-ops";
import { databases } from "@/db/schema";
export const dynamic = "force-dynamic";
function authorize(req: NextRequest, resource: string, method: string) { const ctx = getAuthContext(req); const permission = permissionForResource(resource, method); if (!permission) return null; if (!ctx.permissions.has("*") && !ctx.permissions.has(permission)) return null; return ctx; }
function parseId(id: string) { const numericId = Number(id); return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null; }
export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) { const { resource, id } = await ctx.params; const table: any = tableMap[resource]; if (!table) return Response.json({ error: "Unknown resource" }, { status: 404 }); try { const auth = authorize(req, resource, "GET"); if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 }); const numericId = parseId(id); if (!numericId) return Response.json({ error: "Invalid id" }, { status: 400 }); const rows = await db.select().from(table).where(eq(table.id, numericId)).limit(1); return Response.json(rows[0] ? redactValue(rows[0]) : null, { headers: { "Cache-Control": "no-store" } }); } catch (e: any) { return Response.json({ error: e?.status ? e.message : "Query failed" }, { status: e?.status || 500 }); } }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params; const table: any = tableMap[resource]; const entity = ENTITY_MAP[resource]; if (!table || !entity) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try { const auth = authorize(req, resource, "PATCH"); if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 }); const numericId = parseId(id); if (!numericId) return Response.json({ error: "Invalid id" }, { status: 400 }); const body = await req.json(); if (!body || typeof body !== "object" || !body.values || typeof body.values !== "object") return Response.json({ error: "values object is required" }, { status: 400 }); const existingRows: any[] = await db.select().from(table).where(eq(table.id, numericId)).limit(1); if (!existingRows[0]) return Response.json({ error: "Not found" }, { status: 404 }); const row: any = buildRow(entity, body.values);
    if (resource === "sites") { const merged = { ...existingRows[0], ...row }; await createOrUpdateNginxSite({ domain: String(merged.domain), rootPath: String(merged.rootPath), type: String(merged.type || "static"), port: Number(merged.port || 3000), phpVersion: String(merged.phpVersion || "8.3") }); }
    if (resource === "dbUsers") { const merged = { ...existingRows[0], ...row }; const d = (await db.select().from(databases).where(eq(databases.id, Number(merged.dbId))).limit(1))[0]; if (!d) return Response.json({ error: "Target database not found" }, { status: 404 }); if (merged.password) await createDatabaseUser(String(merged.username), String(merged.password), d.name, d.engine, String(merged.privileges || "ALL")); }
    const result: any = await db.update(table).set(row).where(eq(table.id, numericId)).returning(); const updated = Array.isArray(result) ? result[0] : result; if (!updated) return Response.json({ error: "Not found" }, { status: 404 }); await audit(`${entity.singular} updated`, firstLabel(entity, updated), "", auth.user, getClientIp(req)); return Response.json(redactValue(updated));
  } catch (e: any) { return Response.json({ error: e?.status ? e.message : String(e?.message || "Update failed") }, { status: e?.status || 500 }); }
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params; const table: any = tableMap[resource]; const entity = ENTITY_MAP[resource]; if (!table || !entity) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try { const auth = authorize(req, resource, "DELETE"); if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 }); const numericId = parseId(id); if (!numericId) return Response.json({ error: "Invalid id" }, { status: 400 }); const existing: any[] = await db.select().from(table).where(eq(table.id, numericId)).limit(1); if (!existing[0]) return Response.json({ error: "Not found" }, { status: 404 });
    if (resource === "sites") await deleteNginxSite(String(existing[0].domain));
    if (resource === "databases") await dropDatabase(String(existing[0].name), String(existing[0].engine));
    if (resource === "dbUsers") { const d = (await db.select().from(databases).where(eq(databases.id, Number(existing[0].dbId))).limit(1))[0]; if (d) await dropDatabaseUser(String(existing[0].username), d.engine); }
    await db.delete(table).where(eq(table.id, numericId)); await audit(`${entity.singular} deleted`, firstLabel(entity, existing[0]), "", auth.user, getClientIp(req)); return Response.json({ ok: true });
  } catch (e: any) { return Response.json({ error: e?.status ? e.message : String(e?.message || "Delete failed") }, { status: e?.status || 500 }); }
}
