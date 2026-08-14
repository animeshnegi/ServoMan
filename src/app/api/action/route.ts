// Domain-specific panel operations beyond generic CRUD.
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  sites,
  certs,
  cronJobs,
  containers,
  backups,
  backupJobs,
  settings,
  panelUsers,
  databases,
  auditLogs,
  campaigns,
  smtpSenders,
  sendDomains,
  sipExtensions,
  sipTrunks,
  callLogs,
  deployments,
  sshKeys,
  pythonProjects,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { seededRandom, readMeminfo, diskUsage, sleep } from "@/lib/metrics";
import { pullRepo, resolveRepoDir } from "@/lib/git";
import { authorizeAction } from "@/lib/action-security";

export const dynamic = "force-dynamic";

const in90d = () => new Date(Date.now() + 90 * 86400000);

// Deterministic SPF/DKIM/DMARC records — unique per domain (record-verified
// sending, no SMTP credentials). DKIM keys are derived from the domain so
// every sending identity gets different records.
function b64(hex: string): string {
  return Buffer.from(hex, "hex").toString("base64");
}
function buildDomainRecords(domain: string, selector: string) {
  const h = crypto.createHash("sha256").update(domain + ":" + selector).digest("hex");
  const p = b64("3082010a0282010100" + h.slice(0, 192) + "0203010001");
  const dkimBody = `v=DKIM1; k=rsa; p=${p}`;
  const dkimChunks = dkimBody.match(/.{1,120}/g) || [dkimBody];
  return {
    spf: `v=spf1 include:spf.servoman.io ~all`,
    dkimHash: h.slice(0, 24),
    dkim: dkimChunks.map((c) => `"${c}"`).join(" "),
    selector,
    dmarc: `v=DMARC1; p=quarantine; rua=mailto:dmarc+${domain.replace(/[.@]/g, "-")}@servoman.io; fo=1; adkim=r; aspf=r`,
  };
}

async function getSetting(key: string, fallback: string) {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

async function setSetting(key: string, value: string) {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (rows[0]) await db.update(settings).set({ value }).where(eq(settings.key, key));
  else await db.insert(settings).values({ key, value });
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const action = String(body.action || "");
  const id = Number(body.id || 0);
  try {
    // Never rely on the proxy alone: privileged actions must enforce their
    // authorization again inside the route. This protects the route if it is
    // invoked through another internal path or if routing rules change.
    const auth = authorizeAction(req, action);
    await audit("action.request", action, "", auth.user);

    switch (action) {