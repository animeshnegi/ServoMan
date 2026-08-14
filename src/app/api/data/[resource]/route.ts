// Generic CRUD API for panel entities (list + create).
import { NextRequest } from "next/server";
import { desc, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ENTITY_MAP } from "@/lib/entities";
import { audit } from "@/lib/audit";
import { tableMap, buildRow, firstLabel } from "@/lib/crud";
import { getAuthContext, getClientIp } from "@/lib/security";
import { permissionForResource } from "@/lib/resource-permissions";
import { redactValue } from "@/lib/redact";
import { createOrUpdateNginxSite } from "@/lib/nginx-sites";
import { createDatabase, createDatabaseUser } from "@/lib/database-ops";
import { firewallRule } from "@/lib/server-ops";
import { databases } from "@/db/schema";
export const dynamic = "force-dynamic";
function authorize(req: NextRequest, resource: string, method: string) { const ctx = getAuthContext(req); const permission = permissionForResource(resource, method); if (!permission) return null; if (!ctx.permissions.has("*") && !ctx.permissions.has(permission)) return null; return ctx; }
export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) { const { resource } = await ctx.params; const table: any = tableMap[resource]; if (!table) return Response.json({ error: "Unknown resource" }, { status: 404 }); try { const auth = authorize(req, resource, "GET"); if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 }); const url = new URL(req.url); const sort = url.searchParams.get("sort") || "id"; const order = url.searchParams.get("order") === "desc" ? desc : asc; const col = table[sort] ?? table.id; const rows = await db.select().from(table).orderBy(order(col)); return Response.json(rows.map(redactValue), { headers: { "Cache-Control": "no-store" } }); } catch (e: any) { return Response.json({ error: e?.status ? e.message : "Query failed" }, { status: e?.status || 500 }); } }
export async function POST(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params; const table: any = tableMap[resource]; const entity = ENTITY_MAP[resource]; if (!table || !entity) return Response.json({ error: "Unknown resource" }, { status: 404 });
  try { const auth = authorize(req, resource, "POST"); if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 }); const body = await req.json(); if (!body || typeof body !== "object" || !body.values || typeof body.values !== "object") return Response.json({ error: "values object is required" }, { status: 400 }); const row: any = buildRow(entity, body.values);
    if (resource === "sites") await createOrUpdateNginxSite({ domain: String(row.domain), rootPath: String(row.rootPath), type: String(row.type || "static"), port: Number(row.port || 3000), phpVersion: String(row.phpVersion || "8.3") });
    if (resource === "databases") await createDatabase(String(row.name), String(row.engine || "postgresql"));
    if (resource === "dbUsers") { const d = (await db.select().from(databases).where(eq(databases.id, Number(row.dbId))).limit(1))[0]; if (!d) return Response.json({ error: "Target database not found" }, { status: 404 }); await createDatabaseUser(String(row.username), String(row.password), d.name, d.engine, String(row.privileges || "ALL")); }
    if (resource === "firewallRules" && row.enabled !== false) await firewallRule(String(row.action || "allow") as "allow" | "deny" | "delete", Number(row.port), String(row.protocol || "tcp"), String(row.source || "0.0.0.0/0"));
    const result: any = await db.insert(table).values(row).returning(); const inserted = Array.isArray(result) ? result[0] : result; await audit(`${entity.singular} created`, firstLabel(entity, inserted), "", auth.user, getClientIp(req)); return Response.json(redactValue(inserted));
  } catch (e: any) { return Response.json({ error: e?.status ? e.message : String(e?.message || "Create failed") }, { status: e?.status || 500 }); }
}
