"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Loader2,
  Trash2,
  Activity,
  ShieldCheck,
  Package,
  FileClock,
  Box,
  ArchiveRestore,
  Gauge,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Card,
  PageHeader,
  StatCard,
  StatusDot,
  Toasts,
  formatBytes,
  formatUptime,
  useToasts,
} from "@/components/panel/ui";

interface ServerInfo {
  node: { version: string; pid: number; rssMb: number; uptimeSec: number; eventLoopLagMs: number; selfLatencyMs: number; env: string };
  info: { hostname: string; distro: string; kernel: string; arch: string; cpuModel: string; cores: number; nodeVersion: string; ip: string; uptimeSec: number; procTotal: number };
  mem: { total: number; used: number; cached: number; pct: number; swapPct: number };
  disks: { path: string; pct: number; used: number; total: number }[];
  net: { name: string; rx: number; tx: number }[];
  cpuTopology: { model: string; idlePct: number }[];
  load: number[];
}

const CLEANERS = [
  { key: "cache", label: "Page cache & buffers", desc: "Drop memory page cache (safe — kernel reclaims)", icon: MemoryStick },
  { key: "tmp", label: "Stale /tmp files", desc: "Remove temp files older than 7 days", icon: Trash2 },
  { key: "apt", label: "APT package cache", desc: "apt clean — downloaded .deb archives", icon: Package },
  { key: "logs", label: "Rotated logs", desc: "journalctl vacuum + rotated logs older than 7 days", icon: FileClock },
  { key: "docker", label: "Docker dangling images", desc: "docker image prune — unnamed build layers", icon: Box },
  { key: "backups", label: "Backups past retention", desc: "Delete archives beyond the retention window", icon: ArchiveRestore },
];

export default function ServerPage() {
  const [data, setData] = useState<ServerInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [probe, setProbe] = useState<{ avg: number; ok: number; total: number } | null>(null);
  const [probing, setProbing] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(() => {
    fetch("/api/server")
      .then((r) => r.json())
      .then((d) => d.ok && setData(d))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const clean = async (key: string, label: string) => {
    setBusy(key);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "system.cleanup", target: key }),
      });
      const d = await res.json();
      push(d.message || `${label}: done`);
    } catch {
      push("Cleanup failed", "error");
    } finally {
      setBusy(null);
      load();
    }
  };

  const runProbe = async () => {
    setProbing(true);
    setProbe(null);
    const lats: number[] = [];
    let ok = 0;
    for (let i = 0; i < 6; i++) {
      const t = Date.now();
      try {
        const res = await fetch("/api/server");
        if (res.ok) ok++;
        lats.push(Date.now() - t);
      } catch {
        lats.push(0);
      }
    }
    const good = lats.filter((x) => x > 0);
    setProbe({ avg: good.length ? Math.round(good.reduce((a, b) => a + b, 0) / good.length) : 0, ok, total: 6 });
    setProbing(false);
  };

  const lagColor = data && data.node.eventLoopLagMs > 100 ? "text-rose-400" : data && data.node.eventLoopLagMs > 40 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server & Cleanup"
        subtitle="Full hardware and panel process details — plus one-click cleanup of caches, logs and stale files."
        actions={
          <Button variant="ghost" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Panel process" value={<>{data.node.rssMb}<span className="text-base text-zinc-500"> MB</span></>} sub={`node ${data.node.version} · pid ${data.node.pid} · lightweight single process`} icon={<Server size={15} />} color="sky" />
            <StatCard label="Event-loop lag" value={<span className={lagColor}>{data.node.eventLoopLagMs}<span className="text-base text-zinc-500"> ms</span></span>} sub="lower is better — <10 ms is healthy" icon={<Activity size={15} />} color="emerald" />
            <StatCard label="API self-latency" value={<>{data.node.selfLatencyMs}<span className="text-base text-zinc-500"> ms</span></>} sub="request handled by this endpoint" icon={<Gauge size={15} />} color="violet" />
            <StatCard label="Memory" value={<>{data.mem.pct}<span className="text-base text-zinc-500">%</span></>} sub={`swap ${data.mem.swapPct}% · cache ${(data.mem.cached / 1048576).toFixed(0)} MB`} icon={<MemoryStick size={15} />} color="amber" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Operating system">
              <dl className="space-y-2.5 text-sm">
                <Row k="Hostname" v={data.info.hostname} mono />
                <Row k="Distribution" v={data.info.distro} />
                <Row k="Kernel" v={data.info.kernel} mono />
                <Row k="Architecture" v={data.info.arch} />
                <Row k="Primary IP" v={data.info.ip} mono />
                <Row k="Uptime" v={formatUptime(data.info.uptimeSec)} />
                <Row k="Running tasks" v={String(data.info.procTotal)} />
                <Row k="Load average" v={data.load.map((x) => x.toFixed(2)).join(" / ")} mono />
              </dl>
            </Card>

            <Card title="CPU">
              <div className="space-y-2.5 text-sm">
                <Row k="Model" v={data.info.cpuModel} />
                <Row k="Cores" v={`${data.info.cores} logical`} />
                {data.cpuTopology.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-zinc-500">
                    <span>core {i} idle</span>
                    <span className="font-mono text-zinc-300">{c.idlePct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Storage & network">
              <div className="space-y-3">
                {data.disks.map((d) => (
                  <div key={d.path}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-mono text-zinc-300">{d.path}</span>
                      <span className="text-zinc-500">{formatBytes(d.used)} / {formatBytes(d.total)} · {d.pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${d.pct > 85 ? "bg-rose-400" : d.pct > 65 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, d.pct)}%` }} />
                    </div>
                  </div>
                ))}
                {data.net.slice(0, 3).map((n) => (
                  <div key={n.name} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 font-mono text-zinc-300"><Network size={12} className="text-zinc-600" />{n.name}</span>
                    <span className="text-zinc-500">↓ {formatBytes(n.rx)} · ↑ {formatBytes(n.tx)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* request handling verification */}
      <Card
        title="Request handling check"
        subtitle="Probes this panel's API 6× to verify the server responds reliably"
        actions={
          <Button variant="ghost" onClick={runProbe} disabled={probing}>
            {probing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Run probe
          </Button>
        }
      >
        {probe ? (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <StatusDot color={probe.ok === probe.total ? "emerald" : "rose"} />
              {probe.ok}/{probe.total} requests succeeded
            </span>
            <span className="text-zinc-400">
              average response <b className="text-zinc-100">{probe.avg} ms</b>
            </span>
            <span className="text-xs text-zinc-600">
              {probe.ok === probe.total ? "Server is handling requests properly ✓" : "Some requests failed — check the service"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Run the probe to verify request handling and measure average latency.
            {data && data.node.eventLoopLagMs > 40 && " Event-loop lag is elevated — consider checking load."}
          </p>
        )}
      </Card>

      {/* cleanup */}
      <Card title="Cleaning options" subtitle="One click per target, or clean everything — every run is audited">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CLEANERS.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <c.icon size={16} className="shrink-0 text-zinc-500" />
                <div>
                  <div className="text-sm font-medium text-zinc-200">{c.label}</div>
                  <div className="text-[11px] text-zinc-600">{c.desc}</div>
                </div>
              </div>
              <Button variant="ghost" className="shrink-0 px-2.5 py-1.5 text-xs" disabled={busy !== null} onClick={() => clean(c.key, c.label)}>
                {busy === c.key ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Clean
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button disabled={busy !== null} onClick={() => clean("all", "everything")}>
            {busy === "all" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Clean everything
          </Button>
        </div>
      </Card>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-zinc-500">{k}</dt>
      <dd className={`text-right text-zinc-200 ${mono ? "font-mono text-xs" : ""}`} title={v}>
        {v}
      </dd>
    </div>
  );
}
