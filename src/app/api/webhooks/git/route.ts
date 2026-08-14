// Push-to-deploy webhook endpoint.
// Add the URL to GitHub/GitLab → Settings → Webhooks (push events).
// Payloads from GitHub, GitLab and plain JSON are all accepted.
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deployments, sites } from "@/db/schema";
import { audit } from "@/lib/audit";
import { pullRepo, resolveRepoDir } from "@/lib/git";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    usage:
      "POST a GitHub/GitLab push event to /api/webhooks/git?token=<deployment-token>. Auto-deploy pulls + rebuilds when enabled.",
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const row = (await db.select().from(deployments).where(eq(deployments.webhookToken, token)).limit(1))[0];
  if (!row || !token) {
    return Response.json({ ok: false, error: "Unknown webhook token" }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body tolerated */
  }

  const commits: any[] = body.commits || [];
  const sha: string =
    body.head_commit?.id || body.checkout_sha || body.after || commits[0]?.id || "";
  const msg: string = body.head_commit?.message || commits[0]?.message || "";
  const pusher: string = body.pusher?.name || body.user_name || body.sender?.login || "git";
  const ref: string = body.ref || "";

  await db
    .update(deployments)
    .set({ lastCommitSha: sha.slice(0, 8), lastCommitMsg: msg.slice(0, 120) })
    .where(eq(deployments.id, row.id));

  let deployMessage = "";
  if (row.autoDeploy) {
    const site = (await db.select().from(sites).where(eq(sites.id, row.siteId)).limit(1))[0];
    const dir = resolveRepoDir(site?.rootPath || "/www/wwwroot/app");
    try {
      const branch = ref.replace(/^refs\/heads\//, "") || row.branch;
      deployMessage = await pullRepo(dir, branch);
      await db
        .update(deployments)
        .set({ lastDeploy: new Date(), status: "running" })
        .where(eq(deployments.id, row.id));
    } catch (e: any) {
      deployMessage = `auto-deploy skipped: ${e?.message || "pull failed"}`;
      await db
        .update(deployments)
        .set({ status: "failed" })
        .where(eq(deployments.id, row.id));
    }
  } else {
    deployMessage = "auto-deploy disabled — commit recorded only";
  }

  await audit("git push received", row.gitRepo, `${pusher} pushed ${sha.slice(0, 8) || "?"} · ${deployMessage}`);
  return Response.json({ ok: true, message: deployMessage, sha: sha.slice(0, 8), pusher });
}
