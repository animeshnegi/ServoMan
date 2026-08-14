import { NextRequest } from "next/server";
import { authorizeAction } from "@/lib/action-security";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const API = "https://api.github.com";

function token() {
  const t = process.env.SERVOMAN_GITHUB_TOKEN;
  if (!t) throw Object.assign(new Error("SERVOMAN_GITHUB_TOKEN is not configured"), { status: 503 });
  return t;
}
function repoName(v: string) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v)) throw Object.assign(new Error("Invalid GitHub repository"), { status: 400 });
  return v;
}
async function gh(pathname: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token()}`, "X-GitHub-Api-Version": "2022-11-28", ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(String(data?.message || `GitHub API ${res.status}`)), { status: res.status });
  return data;
}

export async function GET(req: NextRequest) {
  try {
    authorizeAction(req, "github.read");
    const u = new URL(req.url); const op = u.searchParams.get("op") || "repos"; const repo = u.searchParams.get("repo") || "";
    let data: any;
    if (op === "repos") data = await gh("/user/repos?per_page=100&sort=updated");
    else if (op === "branches") data = await gh(`/repos/${repoName(repo)}/branches?per_page=100`);
    else if (op === "commits") data = await gh(`/repos/${repoName(repo)}/commits?per_page=30`);
    else if (op === "releases") data = await gh(`/repos/${repoName(repo)}/releases?per_page=30`);
    else if (op === "workflows") data = await gh(`/repos/${repoName(repo)}/actions/workflows?per_page=100`);
    else if (op === "runs") data = await gh(`/repos/${repoName(repo)}/actions/runs?per_page=30`);
    else if (op === "issues") data = await gh(`/repos/${repoName(repo)}/issues?state=open&per_page=50`);
    else return Response.json({ ok: false, message: "Unknown GitHub operation" }, { status: 400 });
    return Response.json({ ok: true, data });
  } catch (e: any) { return Response.json({ ok: false, message: String(e?.message || "GitHub request failed") }, { status: Number(e?.status) || 500 }); }
}

export async function POST(req: NextRequest) {
  let body: any; try { body = await req.json(); } catch { return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  try {
    const auth = authorizeAction(req, `github.${String(body.op || "")}`);
    const repo = repoName(String(body.repo || "")); const op = String(body.op || ""); let data: any;
    if (op === "dispatch") {
      const workflow = String(body.workflow || ""); const ref = String(body.ref || "main");
      if (!/^[A-Za-z0-9_.\/-]+$/.test(workflow) || !/^[A-Za-z0-9_.\/-]+$/.test(ref)) throw Object.assign(new Error("Invalid workflow or ref"), { status: 400 });
      data = await gh(`/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, { method: "POST", body: JSON.stringify({ ref, inputs: body.inputs && typeof body.inputs === "object" ? body.inputs : undefined }), headers: { "Content-Type": "application/json" } });
    } else if (op === "create-branch") {
      const branch = String(body.branch || ""); const sha = String(body.sha || "");
      if (!/^[A-Za-z0-9_.\/-]{1,100}$/.test(branch) || !/^[0-9a-f]{40}$/i.test(sha)) throw Object.assign(new Error("Invalid branch or SHA"), { status: 400 });
      data = await gh(`/repos/${repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }), headers: { "Content-Type": "application/json" } });
    } else if (op === "release") {
      const tag = String(body.tag || ""); if (!/^v?[0-9A-Za-z][0-9A-Za-z._-]{0,80}$/.test(tag)) throw Object.assign(new Error("Invalid release tag"), { status: 400 });
      data = await gh(`/repos/${repo}/releases`, { method: "POST", body: JSON.stringify({ tag_name: tag, name: String(body.name || tag).slice(0, 120), body: String(body.body || "").slice(0, 10000), draft: Boolean(body.draft), prerelease: Boolean(body.prerelease), generate_release_notes: body.generateNotes !== false }), headers: { "Content-Type": "application/json" } });
    } else if (op === "issue") {
      const title = String(body.title || "").slice(0, 200); if (!title) throw Object.assign(new Error("Issue title is required"), { status: 400 });
      data = await gh(`/repos/${repo}/issues`, { method: "POST", body: JSON.stringify({ title, body: String(body.body || "").slice(0, 10000), labels: Array.isArray(body.labels) ? body.labels.slice(0, 10) : undefined }), headers: { "Content-Type": "application/json" } });
    } else return Response.json({ ok: false, message: "Unknown GitHub operation" }, { status: 400 });
    await audit(`github.${op}`, repo, "GitHub management operation", auth.user);
    return Response.json({ ok: true, data });
  } catch (e: any) { return Response.json({ ok: false, message: String(e?.message || "GitHub operation failed") }, { status: Number(e?.status) || 500 }); }
}
