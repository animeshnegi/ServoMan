// Shared helpers for the generic CRUD API.
import { NextRequest } from "next/server";
import * as schema from "@/db/schema";
import { ENTITY_MAP, FieldDef } from "@/lib/entities";

export const tableMap: Record<string, any> = {
  sites: schema.sites,
  databases: schema.databases,
  dbUsers: schema.dbUsers,
  dnsZones: schema.dnsZones,
  dnsRecords: schema.dnsRecords,
  ftpAccounts: schema.ftpAccounts,
  cronJobs: schema.cronJobs,
  certs: schema.certs,
  firewallRules: schema.firewallRules,
  containers: schema.containers,
  backups: schema.backups,
  backupJobs: schema.backupJobs,
  panelUsers: schema.panelUsers,
  auditLogs: schema.auditLogs,
  alerts: schema.alerts,
  settings: schema.settings,
  mailDomains: schema.mailDomains,
  mailboxes: schema.mailboxes,
  smtpSenders: schema.smtpSenders,
  campaigns: schema.campaigns,
  sendDomains: schema.sendDomains,
  sipExtensions: schema.sipExtensions,
  sipTrunks: schema.sipTrunks,
  callLogs: schema.callLogs,
  deployments: schema.deployments,
  sshKeys: schema.sshKeys,
  pythonProjects: schema.pythonProjects,
};

export function coerce(field: FieldDef, v: unknown): unknown {
  if (v === undefined || v === null) return null;
  switch (field.type) {
    case "number": {
      if (v === "" || v === null) return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    }
    case "switch":
      return v === true || v === 1 || v === "true" || v === "on";
    default:
      return String(v);
  }
}

export function buildRow(
  entity: (typeof ENTITY_MAP)[string],
  values: Record<string, unknown>
) {
  const row: Record<string, unknown> = {};
  for (const f of entity.fields) {
    if (f.type === "readonly") continue;
    if (values[f.key] !== undefined) {
      const v = coerce(f, values[f.key]);
      if (v === null || v === "") {
        if (values[f.key] !== null && values[f.key] !== "") row[f.key] = null;
      } else {
        row[f.key] = v;
      }
    }
  }
  for (const f of entity.fields) {
    if (f.type === "readonly") continue;
    if (
      row[f.key] === undefined &&
      entity.defaultValues &&
      entity.defaultValues[f.key] !== undefined
    ) {
      row[f.key] = entity.defaultValues[f.key];
    }
  }
  return row;
}

export function firstLabel(
  entity: (typeof ENTITY_MAP)[string],
  row: Record<string, unknown>
) {
  const first = entity.fields[0];
  const v = first ? row[first.key] : undefined;
  return v === undefined || v === null ? `#${row.id}` : String(v);
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}
