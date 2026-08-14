"use client";

import { useEffect, useState } from "react";
import EntityManager from "@/components/panel/entity-manager";
import {
  AreaChartPanel,
  Button,
  Card,
  PageHeader,
  StatCard,
  StatusDot,
  formatBytes,
} from "@/components/panel/ui";
import { Gauge, Loader2, Save } from "lucide-react";

export default function MonitoringPage() {
  const [m, setM] = useState<any>(null);
  const [cpuT, setCpuT] = useState("90");
  const [diskT, setDiskT] = useState("85");
  const [memT, setMemT] = useState("90");
  const [saved, setSaved] = useState(false);

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
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.alert_threshold_cpu) setCpuT(s.alert_threshold_cpu);
        if (s.alert_threshold_disk) setDiskT(s.alert_threshold_disk);
        if (s.alert_threshold_mem) setMemT(s.alert_threshold_mem);
      })
      .catch(() => undefined);
  }, []);

  const save = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: {
          alert_threshold_cpu: cpuT,
          alert_threshold_disk: diskT,
          alert_threshold_mem: memT,
        },
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!m) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-zinc-600">
        <Gauge size={22} className="mr-3 animate-pulse" /> Loading metrics…
      </div>
    );
  }

  const h = m.history;
  const series = (key: string) => (h[key] as number[]).map((v, i) => ({ t: h.labels[i], v }));
  const netIn = h.netIn.map((v: number, i: number) => ({ t: h.labels[i], v: Math.round(v / 1024) }));
  const netOut = h.netOut.map((v: number, i: number) => ({ t: h.labels[i], v: Math.round(v / 1024) }));

  const derived = m.derived || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        subtitle="Real-time telemetry, 24h history and anomaly alerts raised against your thresholds."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Load average" value={m.now.load.map((x: number) => x.toFixed(2)).join(" / ")} sub={`${m.info.cores} cores`} color="sky" spark={h.load.slice(-40)} />
        <StatCard label="Inbound" value={formatBytes(m.now.net.rxRate) + "/s"} sub="network receive" color="emerald" spark={netIn.map((x: any) => x.v)} />
        <StatCard label="Outbound" value={formatBytes(m.now.net.txRate) + "/s"} sub="network transmit" color="amber" spark={netOut.map((x: any) => x.v)} />
        <StatCard label="Anomalies" value={derived.length} sub="active threshold breaches" color={derived.length ? "rose" : "zinc"} />
      </div>

      {derived.length > 0 && (
        <Card title="Anomaly detection — live breaches" subtitle="The agent compares real samples against your alert thresholds">
          <div className="space-y-2">
            {derived.map((d: any, i: number) => (
              <div key={i} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${d.severity === "critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                <StatusDot color={d.severity === "critical" ? "rose" : "amber"} />
                {d.message}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="CPU % — 24 hours" pad={false}><div className="p-4 pt-2"><AreaChartPanel data={series("cpu")} dataKey="cpu" color="#38bdf8" unit="%" /></div></Card>
        <Card title="Memory % — 24 hours" pad={false}><div className="p-4 pt-2"><AreaChartPanel data={series("mem")} dataKey="mem" color="#a78bfa" unit="%" /></div></Card>
        <Card title="Load — 24 hours" pad={false}><div className="p-4 pt-2"><AreaChartPanel data={series("load")} dataKey="load" color="#fbbf24" /></div></Card>
        <Card title="Network — 24 hours (KB/s)" pad={false}><div className="p-4 pt-2"><AreaChartPanel data={netIn} dataKey="net" color="#34d399" unit="" /></div></Card>
      </div>

      <Card title="Alert thresholds" subtitle="The agent raises live alerts when these are crossed">
        <div className="grid max-w-xl grid-cols-3 gap-4">
          {[
            { label: "CPU %", v: cpuT, set: setCpuT },
            { label: "Memory %", v: memT, set: setMemT },
            { label: "Disk %", v: diskT, set: setDiskT },
          ].map((x) => (
            <label key={x.label} className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">{x.label}</span>
              <input
                type="number"
                value={x.v}
                onChange={(e) => x.set(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save}>
            <Save size={14} /> Save thresholds
          </Button>
          {saved && <span className="text-xs text-emerald-400">✓ saved</span>}
        </div>
      </Card>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Persistent alerts</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">Manage or resolve recorded alerts. Live anomalies appear at the top of this page.</p>
        <EntityManager entityKey="alerts" embedded />
      </div>
    </div>
  );
}
