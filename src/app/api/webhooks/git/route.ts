// Push-to-deploy webhook endpoint.
// Authentication is the high-entropy per-deployment webhook token.
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deployments, sites } from "@/db/schema";
import { audit } from "@/lib/audit";
import { pullRepo, resolveRepoDir } from "@/lib/git";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, usage: "POST a Git push event with the deployment webhook token." });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const token = (req.headers.get("x-servoman-webhook-token") || url.searchParams.get("token") || "").trim();
  if (!token || token.length < 24 || token.length > 128) {
    return Response.json({ ok: false, error: "Invalid webhook token" }, { status: 401 });
  }

  const row = (await db.select().from(deployments).where(eq(deployments.webhookToken, token)).limit(1))[0];
  if (!row) return Response.json({ ok: false, error: "Invalid webhook token" }, { status: 401 });

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 1024 * 1024) return Response.json({ ok: false, error: "Payload too large" }, { status: 413 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const commits: any[] = Array.isArray(body.commits) ? body.commits : [];
  const sha = String(body.head_commit?.id || body.checkout_sha || body.after || commits[0]?.id || "");
  const msg = String(body.head_commit?.message || commits[0]?.message || "");
  const pusher = String(body.pusher?.name || body.user_name || body.sender?.login || "git").slice(0, 100);
  const ref = String(body.ref || "");
  const branch = ref.replace(/^refs\/heads\//, "");

  // Never let a webhook choose an arbitrary ref. Only the deployment's configured
  // branch may trigger auto-deploy; other pushes are recorded but not executed.
  await db
    .update(deployments)
    .set({ lastCommitSha: sha.slice(0, 8), lastCommitMsg: msg.slice(0, 120) })
    .where(eq(deployments.id, row.id));

  let deployMessage = "";
  if (row.autoDeploy && (!branch || branch === row.branch)) {
    const site = (await db.select().from(sites).where(eq(sites.id, row.siteId)).limit(1))[0];
    const dir = resolveRepoDir(site?.rootPath || "/www/wwwroot/app");
    try {
      deployMessage = await pullRepo(dir, row.branch);
      await db.update(deployments).set({ lastDeploy: new Date(), status: "running" }).where(eq(deployments.id, row.id));
    } catch (e: any) {
      deployMessage = `auto-deploy failed: ${e?.message || "pull failed"}`;
      await db.update(deployments).set({ status: "failed" }).where(eq(deployments.id, row.id));
    }
  } else if (row.autoDeploy) {
    deployMessage = `push recorded; auto-deploy ignored because branch ${branch || "unknown"} does not match configured branch ${row.branch}`;
  } else {
    deployMessage = "auto-deploy disabled — commit recorded only";
  }

  await audit("git push received", row.gitRepo, `${pusher} pushed ${sha.slice(0, 8) || "?"} · ${deployMessage}`);
  return Response.json({ ok: true, message: deployMessage, sha: sha.slice(0, 8), pusher });
}
