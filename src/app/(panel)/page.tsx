"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Gauge,
  Network,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  ShieldCheck,
  ArchiveRestore,
  TerminalSquare,
  Sparkles,
  Activity,
  Boxes,
  Database,
  Layers,
  Server,
} from "lucide-react";
import {
  AreaChartPanel,
  Badge,
  Button,
  Card,
  CodeBlock,
  PageHeader,
  Sparkline,
  StatCard,
  StatusDot,
  formatBytes,
  formatDate,
  formatUptime,
  timeAgo,
} from "@/components/panel/ui";

interface Metrics {
  now: {
    cpu: number;
    mem: { total: number; used: number; free: number; pct: number };
    disk: { total: number; used: number; pct: number };
    net: { rxRate: number; txRate: number };
    load: number[];
    uptimeSec: number;
    procTotal: number;
  };
  info: {
    hostname: string;
    distro: string;
    kernel: string;
    arch: string;
    cpuModel: string;
    cores: number;
    nodeVersion: string;
    ip: string;
  };
  history: {
    labels: string[];
    cpu: number[];
    mem: number[];
    disk: number[];
    load: number[];
    netIn: number[];
    netOut: number[];
  };
  derived: { severity: string; message: string }[];
}

const SERVICES = [
  { key: "nginx", name: "Nginx", icon: "globe" },
  { key: "phpfpm", name: "PHP-FPM", icon: "php" },
  { key: "mysql", name: "MySQL", icon: "db" },
  { key: "postgresql", name: "PostgreSQL", icon: "db" },
  { key: "redis", name: "Redis", icon: "box" },
  { key: "docker", name: "Docker", icon: "box" },
];

export default function Dashboard() {
  const [m, setM] = useState<Metrics | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [services, setServices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/metrics");
        const data = await res.json();
        if (!stop) setM(data);
      } catch {
        /* ignore */
      }
    };
    poll();
    const iv = setInterval(poll, 6000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/data/auditLogs?sort=id&order=desc").then((r) => r.json()),
      fetch("/api/data/alerts?sort=id&order=desc").then((r) => r.json()),
      fetch("/api/data/sites?sort=id&order=asc").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([a, al, s, st]) => {
      setAudits(Array.isArray(a) ? a.slice(0, 12) : []);
      setAlerts(Array.isArray(al) ? al.filter((x: any) => !x.resolved).slice(0, 6) : []);
      setSites(Array.isArray(s) ? s : []);
      setServices(st || {});
    });
  }, []);

  const runAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      setMsg(data.message || "Done");
      setTimeout(() => setMsg(null), 6000);
    } catch {
      setMsg("Action failed");
    } finally {
      setBusy(null);
    }
  };

  if (!m) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-zinc-600">
        <Gauge size={22} className="mr-3 animate-pulse" /> Connecting to agent…
      </div>
    );
  }

  const h = m.history;
  const cpuSeries = h.cpu.map((v, i) => ({ t: h.labels[i], v }));
  const memSeries = h.mem.map((v, i) => ({ t: h.labels[i], v }));
  const netSeries = h.netIn.map((v, i) => ({ t: h.labels[i], v: Math.round(v / 1024) }));

  const derived = m.derived || [];
  const openAlerts = [...alerts, ...derived.map((d) => ({ id: `d${Math.random()}`, severity: d.severity, message: d.message, type: "system", createdAt: new Date().toISOString(), resolved: false }))].slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, admin`}
        subtitle={`${m.info.hostname} · ${m.info.distro} · ${m.info.kernel} — everything is monitored live.`}
        actions={
          <>
            <Button variant="ghost" onClick={() => runAction("system.cleanup")} disabled={busy !== null}>
              <Sparkles size={14} /> Cleanup
            </Button>
            <Link href="/websites">
              <Button>
                <Globe size={14} /> New Website
              </Button>
            </Link>
          </>
        }
      />

      {msg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          {msg}
        </div>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="CPU usage"
          value={<>{m.now.cpu}<span className="text-base text-zinc-500">%</span></>}
          sub={`${m.info.cores} cores · load ${m.now.load.map((x) => x.toFixed(2)).join(" / ")}`}
          icon={<Cpu size={15} />}
          color="sky"
          spark={h.cpu.slice(-40)}
        />
        <StatCard
          label="Memory"
          value={<>{m.now.mem.pct}<span className="text-base text-zinc-500">%</span></>}
          sub={`${(m.now.mem.used / 1073741824).toFixed(1)} / ${(m.now.mem.total / 1073741824).toFixed(1)} GB`}
          icon={<MemoryStick size={15} />}
          color="violet"
          spark={h.mem.slice(-40)}
        />
        <StatCard
          label="Disk /"
          value={<>{m.now.disk.pct}<span className="text-base text-zinc-500">%</span></>}
          sub={`${(m.now.disk.used / 1073741824).toFixed(1)} / ${(m.now.disk.total / 1073741824).toFixed(1)} GB`}
          icon={<HardDrive size={15} />}
          color="emerald"
          spark={h.disk.slice(-40)}
        />
        <StatCard
          label="Network"
          value={formatBytes(m.now.net.rxRate + m.now.net.txRate) + "/s"}
          sub={`↓ ${formatBytes(m.now.net.rxRate)}/s · ↑ ${formatBytes(m.now.net.txRate)}/s`}
          icon={<Network size={15} />}
          color="amber"
          spark={netSeries.map((x) => x.v)}
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Uptime" value={formatUptime(m.now.uptimeSec)} icon={<Activity size={15} />} color="zinc" />
        <StatCard label="Processes" value={m.now.procTotal} sub="running tasks" icon={<Layers size={15} />} color="zinc" />
        <StatCard label="Sites online" value={`${sites.filter((s) => s.status === "running").length}/${sites.length}`} icon={<Globe size={15} />} color="zinc" />
        <StatCard label="Open alerts" value={openAlerts.length} icon={<ShieldCheck size={15} />} color={openAlerts.length ? "rose" : "zinc"} />
      </div>

      {/* charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="CPU usage — last 24h" subtitle="Sampled by the monitoring agent" pad={false}>
          <div className="p-4 pt-2">
            <AreaChartPanel data={cpuSeries} dataKey="cpu" color="#38bdf8" unit="%" />
          </div>
        </Card>
        <Card title="Memory usage — last 24h" subtitle="Used memory (excl. buffers/cache)" pad={false}>
          <div className="p-4 pt-2">
            <AreaChartPanel data={memSeries} dataKey="mem" color="#a78bfa" unit="%" />
          </div>
        </Card>
      </div>

      {/* services + alerts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title="System services"
          subtitle="Managed daemons"
          actions={<Link href="/settings" className="text-xs text-sky-400 hover:underline">manage</Link>}
        >
          <div className="grid grid-cols-2 gap-2.5">
            {SERVICES.map((s) => {
              const running = (services[`service_${s.key}`] || "running") === "running";
              return (
                <div key={s.key} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <StatusDot color={running ? "emerald" : "rose"} />
                    <span className="text-xs font-medium text-zinc-300">{s.name}</span>
                  </div>
                  <button
                    className="text-[10px] text-zinc-600 transition hover:text-sky-400"
                    onClick={() => runAction("service.restart", { service: s.key })}
                  >
                    restart
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="Alerts"
          subtitle="Threshold + persistent"
          actions={<Link href="/monitoring" className="text-xs text-sky-400 hover:underline">monitoring →</Link>}
        >
          {openAlerts.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-600">No active alerts. All clear. ✅</div>
          ) : (
            <div className="space-y-2">
              {openAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${
                    a.severity === "critical"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                      : a.severity === "warning"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : "border-sky-500/25 bg-sky-500/10 text-sky-200"
                  }`}
                >
                  <StatusDot color={a.severity === "critical" ? "rose" : a.severity === "warning" ? "amber" : "sky"} />
                  <span className="leading-relaxed">{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Quick actions" subtitle="Common operations">
          <div className="grid grid-cols-2 gap-2.5">
            <QuickBtn href="/websites" icon={<Globe size={14} />} label="Create site" />
            <QuickBtn href="/ssl" icon={<ShieldCheck size={14} />} label="Issue SSL" />
            <QuickBtn href="/backups" icon={<ArchiveRestore size={14} />} label="Run backup" />
            <QuickBtn href="/terminal" icon={<TerminalSquare size={14} />} label="Open terminal" />
            <QuickBtn href="/ai" icon={<Sparkles size={14} />} label="Ask AI" />
            <QuickBtn href="/security" icon={<Activity size={14} />} label="Security scan" />
          </div>
          <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">Server</div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <dt className="text-zinc-600">Hostname</dt>
              <dd className="text-right font-mono text-zinc-300">{m.info.hostname}</dd>
              <dt className="text-zinc-600">IP</dt>
              <dd className="text-right font-mono text-zinc-300">{m.info.ip}</dd>
              <dt className="text-zinc-600">CPU</dt>
              <dd className="truncate text-right text-zinc-300" title={m.info.cpuModel}>{m.info.cpuModel}</dd>
              <dt className="text-zinc-600">Kernel</dt>
              <dd className="truncate text-right font-mono text-zinc-300">{m.info.kernel}</dd>
            </dl>
          </div>
        </Card>
      </div>

      {/* sites + activity */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title="Websites"
          subtitle={`${sites.length} virtual hosts`}
          actions={<Link href="/websites" className="text-xs text-sky-400 hover:underline">manage →</Link>}
          pad={false}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2.5 font-medium">Domain</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">SSL</th>
                <th className="px-4 py-2.5 text-right font-medium">Req/day</th>
              </tr>
            </thead>
            <tbody>
              {sites.slice(0, 6).map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <StatusDot color={s.status === "running" ? "emerald" : "rose"} />
                      <span className="font-medium text-zinc-200">{s.domain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    <Badge label={s.type} cls="bg-white/5 text-zinc-300 border-white/10" />
                  </td>
                  <td className="px-4 py-2.5">{s.sslEnabled ? <ShieldCheck size={14} className="text-emerald-400" /> : <span className="text-zinc-600">—</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">{Number(s.requestsDay).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Recent activity" subtitle="Audit trail" className="xl:col-span-2" pad={false}>
          <div className="max-h-[300px] overflow-y-auto">
            {audits.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-0">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-zinc-300">
                    <span className="font-medium text-zinc-100">{a.action}</span>
                    {a.target && <span className="text-zinc-500"> · {a.target}</span>}
                  </div>
                  {a.detail && <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-600">{a.detail}</div>}
                </div>
                <span className="shrink-0 text-[10px] text-zinc-600">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
            {audits.length === 0 && <div className="py-10 text-center text-sm text-zinc-600">No activity recorded yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickBtn({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300"
    >
      {icon}
      {label}
    </Link>
  );
}
