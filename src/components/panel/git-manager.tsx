"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GitBranch,
  GitPullRequest,
  Download,
  Rocket,
  Play,
  Square,
  Copy,
  Check,
  Radio,
  RefreshCw,
  GitCommitHorizontal,
  Loader2,
  Webhook,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CodeBlock,
  IconBtn,
  Modal,
  Select,
  Switch,
  Toasts,
  cn,
  formatDate,
  timeAgo,
  useToasts,
} from "@/components/panel/ui";
import type { RepoInfo, GitCommit } from "@/lib/git";

interface Dep {
  id: number;
  siteId: number;
  appType: string;
  gitRepo: string;
  branch: string;
  port: number;
  status: string;
  autoDeploy: boolean;
  webhookToken: string;
  lastCommitSha: string;
  lastCommitMsg: string;
  lastDeploy: string | null;
  buildCommand: string;
  startCommand: string;
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  node: { label: "Node.js", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  flask: { label: "Flask", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  php: { label: "PHP", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  static: { label: "Static", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  running: { label: "Running", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  stopped: { label: "Stopped", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  failed: { label: "Failed", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
};

export default function GitManager() {
  const [deps, setDeps] = useState<Dep[]>([]);
  const [sites, setSites] = useState<Record<number, string>>({});
  const [infos, setInfos] = useState<Record<number, RepoInfo>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyLabel, setBusyLabel] = useState("");
  const [branches, setBranches] = useState<Record<number, string[]>>({});
  const [commitsFor, setCommitsFor] = useState<{ title: string; log: GitCommit[] } | null>(null);
  const [webhookFor, setWebhookFor] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const loadDeps = useCallback(async () => {
    const [d, s] = await Promise.all([
      fetch("/api/data/deployments?sort=id&order=asc").then((r) => r.json()),
      fetch("/api/data/sites?sort=id&order=asc").then((r) => r.json()),
    ]);
    const depl = Array.isArray(d) ? d : [];
    const siteMap: Record<number, string> = {};
    for (const site of Array.isArray(s) ? s : []) siteMap[site.id] = site.domain;
    setSites(siteMap);
    setDeps(depl);
    return depl;
  }, []);

  useEffect(() => {
    loadDeps();
  }, [loadDeps]);

  const refreshInfo = useCallback(async (list: Dep[]) => {
    for (const dep of list) {
      try {
        const res = await fetch(`/api/git?op=info&id=${dep.id}`);
        const data = await res.json();
        if (data.info) setInfos((prev) => ({ ...prev, [dep.id]: data.info }));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (deps.length) refreshInfo(deps);
    const iv = setInterval(() => {
      if (deps.length) refreshInfo(deps);
    }, 20000);
    return () => clearInterval(iv);
  }, [deps, refreshInfo]);

  const api = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const run = async (dep: Dep, fn: () => Promise<void>, label: string) => {
    setBusyId(dep.id);
    setBusyLabel(label);
    try {
      await fn();
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setBusyId(null);
      setBusyLabel("");
    }
  };

  const act = (dep: Dep, label: string, path: string, body?: any) =>
    run(dep, async () => {
      const res = await api("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: path, id: dep.id, ...body }),
      });
      push(res.message || res.error || "Done");
      await loadDeps().then(refreshInfo);
    }, label);

  const actDeploy = (dep: Dep, label: string, action: string) =>
    run(dep, async () => {
      const res = await api("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: dep.id }),
      });
      push(res.message || "Done", res.ok ? "ok" : "error");
      await loadDeps().then(refreshInfo);
    }, label);

  const toggleAuto = async (dep: Dep, v: boolean) => {
    await api(`/api/data/deployments/${dep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { autoDeploy: v } }),
    });
    setDeps((prev) => prev.map((x) => (x.id === dep.id ? { ...x, autoDeploy: v } : x)));
    push(v ? "Auto-deploy enabled — every push will rebuild" : "Auto-deploy disabled");
  };

  const loadBranches = async (dep: Dep) => {
    setBusyId(dep.id);
    setBusyLabel("branches");
    try {
      const res = await api(`/api/git?op=branches&id=${dep.id}`);
      setBranches((b) => ({ ...b, [dep.id]: res.branches || [] }));
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setBusyId(null);
      setBusyLabel("");
    }
  };

  const genWebhook = async (dep: Dep) => {
    setBusyId(dep.id);
    setBusyLabel("webhook");
    try {
      const res = await api("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "webhook", id: dep.id }),
      });
      setDeps((prev) => prev.map((x) => (x.id === dep.id ? { ...x, webhookToken: res.token } : x)));
      push("Push-to-deploy URL generated");
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setBusyId(null);
      setBusyLabel("");
    }
  };

  const testPush = async (dep: Dep) => {
    if (!dep.webhookToken) return;
    setBusyId(dep.id);
    setBusyLabel("push");
    try {
      const sha = Array.from(crypto.getRandomValues(new Uint8Array(10)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const res = await fetch(`/api/webhooks/git?token=${dep.webhookToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: `refs/heads/${dep.branch}`,
          after: sha,
          pusher: { name: "panel-test" },
          commits: [{ id: sha, message: "Test push from panel" }],
        }),
      });
      const data = await res.json();
      push(data.message || "Push processed", data.ok ? "ok" : "error");
      await loadDeps().then(refreshInfo);
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setBusyId(null);
      setBusyLabel("");
    }
  };

  const busy = (id: number, label: string) => busyId === id && busyLabel === label;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {deps.map((dep) => {
        const info = infos[dep.id];
        const domain = sites[dep.siteId] || `site #${dep.siteId}`;
        const typeB = TYPE_BADGE[dep.appType] || TYPE_BADGE.node;
        const statusB = STATUS_BADGE[dep.status] || STATUS_BADGE.stopped;
        const branchList = branches[dep.id] || [dep.branch];
        return (
          <Card key={dep.id} className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                  <GitBranch size={15} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-100">{domain}</span>
                    <Badge label={typeB.label} cls={typeB.cls} />
                    <Badge label={statusB.label} cls={statusB.cls} />
                  </div>
                  <div className="mt-0.5 max-w-[340px] truncate font-mono text-[11px] text-zinc-500" title={dep.gitRepo}>
                    {dep.gitRepo || "(no repository set)"}
                  </div>
                </div>
              </div>
              {info?.lastCommit && (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <GitCommitHorizontal size={12} className="text-emerald-500" />
                  <span className="font-mono text-emerald-400">{info.lastCommit.sha}</span>
                  <span className="max-w-[140px] truncate">{info.lastCommit.msg}</span>
                </div>
              )}
            </div>

            {/* repo status strip */}
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px] text-zinc-500">
              {info ? (
                info.cloned ? (
                  <>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Radio size={11} /> cloned · {info.branch}
                    </span>
                    {info.behind > 0 && <span className="text-amber-400">{info.behind} commit(s) behind remote</span>}
                    {info.ahead > 0 && <span className="text-sky-400">{info.ahead} ahead</span>}
                    {info.dirty && <span className="text-rose-400">working tree dirty</span>}
                    <span className="ml-auto flex items-center gap-1">
                      <GitPullRequest size={11} /> {info.log.length} commit(s) in history
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-500">not cloned yet — press Clone to pull {dep.branch} into the site root</span>
                )
              ) : (
                <span className="text-zinc-600">checking repository…</span>
              )}
            </div>

            {/* actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select
                className="w-36 py-1.5 text-xs"
                value={dep.branch}
                onFocus={() => loadBranches(dep)}
                onChange={async (e) => {
                  const branch = e.target.value;
                  if (branch !== dep.branch) {
                    await act(dep, "pull", "pull", { branch });
                  }
                }}
              >
                {branchList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
              {info && !info.cloned ? (
                <Button className="px-3 py-1.5 text-xs" disabled={busyId !== null} onClick={() => act(dep, "clone", "clone", { branch: dep.branch })}>
                  {busy(dep.id, "clone") ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Clone
                </Button>
              ) : (
                <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={busyId !== null} onClick={() => act(dep, "pull", "pull", { branch: dep.branch })}>
                  {busy(dep.id, "pull") ? <Loader2 size={13} className="animate-spin" /> : <GitPullRequest size={13} />}
                  Pull
                </Button>
              )}
              <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={busyId !== null} onClick={() => actDeploy(dep, "deploy", "deploy.trigger")}>
                {busy(dep.id, "deploy") ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
                Deploy
              </Button>
              <IconBtn
                title={dep.status === "stopped" ? "Start app" : "Stop app"}
                onClick={() => actDeploy(dep, dep.status === "stopped" ? "start" : "stop", dep.status === "stopped" ? "deploy.start" : "deploy.stop")}
              >
                {dep.status === "stopped" ? <Play size={13} /> : <Square size={13} />}
              </IconBtn>
              <IconBtn
                title="Commits"
                disabled={!info?.log?.length}
                onClick={() => setCommitsFor({ title: `${domain} — commits`, log: info?.log || [] })}
              >
                <GitCommitHorizontal size={13} />
              </IconBtn>
              <IconBtn title="Refresh" onClick={() => refreshInfo([dep])} disabled={busyId !== null}>
                <RefreshCw size={13} className={busyId === dep.id ? "animate-spin" : ""} />
              </IconBtn>
            </div>

            {/* webhook */}
            <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <Webhook size={12} /> Push-to-deploy
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">auto-deploy</span>
                  <Switch checked={dep.autoDeploy} onChange={(v) => toggleAuto(dep, v)} />
                </div>
              </div>
              {dep.webhookToken ? (
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md border border-white/[0.07] bg-black/40 px-2.5 py-1.5 font-mono text-[10px] text-sky-300">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/git?token=${dep.webhookToken}` : ""}
                  </code>
                  <Button
                    variant="ghost"
                    className="px-2 py-1.5 text-[10px]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/git?token=${dep.webhookToken}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {
                        push("Copy failed — select and copy manually", "error");
                      }
                    }}
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="ghost" className="px-2 py-1.5 text-[10px]" disabled={busyId !== null} onClick={() => testPush(dep)}>
                    {busy(dep.id, "push") ? <Loader2 size={11} className="animate-spin" /> : <Radio size={11} />}
                    Test push
                  </Button>
                  <Button variant="ghost" className="px-2 py-1.5 text-[10px]" onClick={() => setWebhookFor(dep.id)}>
                    Info
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <Button variant="ghost" className="px-2.5 py-1.5 text-[10px]" disabled={busyId !== null} onClick={() => genWebhook(dep)}>
                    {busy(dep.id, "webhook") ? <Loader2 size={11} className="animate-spin" /> : <Webhook size={11} />}
                    Generate webhook URL
                  </Button>
                </div>
              )}
            </div>

            {/* footer meta */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.05] pt-2.5 text-[10px] text-zinc-600">
              <span>port <b className="text-zinc-400">{dep.port}</b></span>
              <span>build <code className="text-zinc-500">{dep.buildCommand || "default"}</code></span>
              <span>start <code className="text-zinc-500">{dep.startCommand || "default"}</code></span>
              <span className="ml-auto">{dep.lastDeploy ? `last deploy ${timeAgo(dep.lastDeploy)}` : "never deployed"}</span>
            </div>
          </Card>
        );
      })}

      {/* commits modal */}
      <Modal open={!!commitsFor} onClose={() => setCommitsFor(null)} title={commitsFor?.title || ""} width="max-w-xl">
        <div className="max-h-[50vh] overflow-y-auto">
          {commitsFor?.log.map((c) => (
            <div key={c.sha} className="flex items-start gap-3 border-b border-white/[0.04] py-2.5 last:border-0">
              <GitCommitHorizontal size={13} className="mt-0.5 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-emerald-400">{c.sha}</span>
                  <span className="text-xs font-medium text-zinc-200">{c.msg}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-600">
                  {c.author} · {c.date}
                </div>
              </div>
            </div>
          ))}
          {(!commitsFor || commitsFor.log.length === 0) && (
            <div className="py-8 text-center text-sm text-zinc-600">No commits — clone the repository first.</div>
          )}
        </div>
      </Modal>

      {/* webhook help modal */}
      <Modal open={webhookFor !== null} onClose={() => setWebhookFor(null)} title="Push-to-deploy setup" width="max-w-lg">
        <p className="text-sm leading-relaxed text-zinc-400">
          Every <code className="text-sky-300">git push</code> to your repository can trigger an automatic pull + rebuild on
          this server. Configure it in GitHub or GitLab:
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-zinc-400">
          <li>Copy the webhook URL from the deployment card.</li>
          <li>
            GitHub: repo → <b>Settings → Webhooks → Add webhook</b> · GitLab: <b>Settings → Webhooks</b>
          </li>
          <li>Paste the URL, choose <b>“Just the push event”</b> (or “Push events”), then Add.</li>
        </ol>
        <p className="mt-3 text-sm text-zinc-500">
          With <b className="text-zinc-300">auto-deploy</b> on, the panel pulls the branch, resets the working tree and
          re-runs the build. With it off, the push is only recorded as the latest commit.
        </p>
        <div className="mt-4">
          <CodeBlock text={`# you can also simulate a push from the server shell:\ncurl -X POST "http://<panel>/api/webhooks/git?token=<token>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"ref":"refs/heads/main","pusher":{"name":"me"},"commits":[{"id":"abc123","message":"hello"}]}'`} />
        </div>
      </Modal>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
