"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CodeBlock,
  IconBtn,
  PageHeader,
  Spinner,
  cn,
  timeAgo,
} from "@/components/panel/ui";
import { FileText, RefreshCw, ScrollText, Trash2 } from "lucide-react";

export default function LogsPage() {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"server" | "panel">("server");
  const [audits, setAudits] = useState<any[]>([]);
  const [auto, setAuto] = useState(false);

  const loadFiles = useCallback(() => {
    fetch("/api/files?path=%2Fvar%2Flog")
      .then((r) => r.json())
      .then((d) => setFiles((d.entries || []).filter((e: any) => !e.dir)))
      .catch(() => setFiles([]));
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const loadContent = useCallback(
    async (name: string) => {
      setSelected(name);
      setLoading(true);
      try {
        const res = await fetch(`/api/files?path=${encodeURIComponent(`/var/log/${name}`)}&op=read`);
        const data = await res.json();
        const lines = (data.content || "").split("\n");
        setContent(lines.slice(-160).join("\n"));
      } catch {
        setContent("// unable to read log file");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadAudits = useCallback(() => {
    fetch("/api/data/auditLogs?sort=id&order=desc")
      .then((r) => r.json())
      .then((d) => setAudits(Array.isArray(d) ? d.slice(0, 60) : []));
  }, []);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  useEffect(() => {
    if (!auto) return;
    const iv = setInterval(() => {
      if (tab === "server" && selected) loadContent(selected);
      if (tab === "panel") loadAudits();
    }, 5000);
    return () => clearInterval(iv);
  }, [auto, tab, selected, loadContent, loadAudits]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Logs"
        subtitle="Tail /var/log in the browser plus the panel's own audit trail."
        actions={
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-sky-500" />
              Auto-refresh (5s)
            </label>
            <IconBtn title="Refresh" onClick={() => (tab === "server" ? (selected ? loadContent(selected) : loadFiles()) : loadAudits())}>
              <RefreshCw size={14} />
            </IconBtn>
          </div>
        }
      />

      <div className="flex gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] p-1 text-sm">
        <button
          className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition", tab === "server" ? "bg-sky-500/15 text-sky-300" : "text-zinc-500 hover:text-zinc-300")}
          onClick={() => setTab("server")}
        >
          Server logs (/var/log)
        </button>
        <button
          className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition", tab === "panel" ? "bg-sky-500/15 text-sky-300" : "text-zinc-500 hover:text-zinc-300")}
          onClick={() => setTab("panel")}
        >
          Panel events (audit trail)
        </button>
      </div>

      {tab === "server" ? (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card title="Log files" pad={false}>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {files.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-zinc-600">
                  No readable logs in /var/log on this host — the panel audit trail tab always works.
                </div>
              )}
              {files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => loadContent(f.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition",
                    selected === f.name ? "bg-sky-500/15 text-sky-300" : "text-zinc-400 hover:bg-white/[0.05]"
                  )}
                >
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card
            title={selected ? `/var/log/${selected} — last 160 lines` : "Select a log file"}
            pad={false}
          >
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <CodeBlock text={content || "// select a file on the left"} className="m-4 max-h-[55vh] min-h-[30vh] rounded-lg" />
            )}
          </Card>
        </div>
      ) : (
        <Card title="Panel audit trail" subtitle="Every create / update / delete / action performed through the panel" pad={false}>
          <div className="max-h-[62vh] overflow-y-auto">
            {audits.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-white/[0.04] px-4 py-2.5">
                <ScrollText size={13} className="mt-0.5 shrink-0 text-zinc-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-zinc-300">
                    <span className="font-medium text-zinc-100">{a.action}</span>
                    {a.target && <span className="text-zinc-500"> · {a.target}</span>}
                    <span className="ml-2 text-[10px] text-zinc-600">by {a.actor} from {a.ip}</span>
                  </div>
                  {a.detail && <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-600">{a.detail}</div>}
                </div>
                <span className="shrink-0 text-[10px] text-zinc-600">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
            {audits.length === 0 && <div className="py-12 text-center text-sm text-zinc-600">Nothing recorded yet.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
