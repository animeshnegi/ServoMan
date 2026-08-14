// Git operations API — clone, pull, branch switching, repo info, webhook tokens.
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@/db";
import { deployments, sites } from "@/db/schema";
import { audit } from "@/lib/audit";
import { gitInfo, cloneRepo, pullRepo, listRemoteBranches, resolveRepoDir } from "@/lib/git";

export const dynamic = "force-dynamic";

async function deploymentWithSite(id: number) {
  const d = (await db.select().from(deployments).where(eq(deployments.id, id)).limit(1))[0];
  if (!d) return null;
  const s = (await db.select().from(sites).where(eq(sites.id, d.siteId)).limit(1))[0];
  return { d, s };
}

function repoDir(rootPath: string) {
  return resolveRepoDir(rootPath);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const op = url.searchParams.get("op") || "info";
  const id = Number(url.searchParams.get("id") || 0);
  const found = await deploymentWithSite(id);
  if (!found) return Response.json({ error: "Deployment not found" }, { status: 404 });
  const { d, s } = found;
  const dir = repoDir(s.rootPath);
  try {
    switch (op) {
      case "info":
        return Response.json({ ok: true, dir, info: await gitInfo(dir) });
      case "branches":
        return Response.json({ ok: true, branches: await listRemoteBranches(d.gitRepo) });
      case "log":
        return Response.json({ ok: true, info: await gitInfo(dir) });
      default:
        return Response.json({ error: "Unknown op" }, { status: 400 });
    }
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "git command failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const op = String(body.op || "");
  const id = Number(body.id || 0);
  const found = await deploymentWithSite(id);
  if (!found) return Response.json({ error: "Deployment not found" }, { status: 404 });
  const { d, s } = found;
  const dir = repoDir(s.rootPath);
  try {
    switch (op) {
      case "clone": {
        const msg = await cloneRepo(d.gitRepo, body.branch || d.branch, dir);
        await audit("git.clone", d.gitRepo, `${s.domain} → ${dir}`);
        return Response.json({ ok: true, message: msg });
      }
      case "pull": {
        const branch = body.branch || d.branch;
        const msg = await pullRepo(dir, branch);
        if (body.branch && body.branch !== d.branch) {
          await db.update(deployments).set({ branch }).where(eq(deployments.id, id));
        }
        const info = await gitInfo(dir);
        if (info.lastCommit) {
          await db
            .update(deployments)
            .set({ lastCommitSha: info.lastCommit.sha, lastCommitMsg: info.lastCommit.msg })
            .where(eq(deployments.id, id));
        }
        await audit("git.pull", d.gitRepo, msg);
        return Response.json({ ok: true, message: msg });
      }
      case "webhook": {
        const token = crypto.randomBytes(12).toString("hex");
        await db.update(deployments).set({ webhookToken: token }).where(eq(deployments.id, id));
        await audit("git.webhook", d.gitRepo, "push-to-deploy URL generated");
        return Response.json({ ok: true, token, url: `/api/webhooks/git?token=${token}` });
      }
      default:
        return Response.json({ error: "Unknown op" }, { status: 400 });
    }
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "git command failed" }, { status: 500 });
  }
}
