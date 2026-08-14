"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  PageHeader,
  Spinner,
  cn,
  formatBytes,
} from "@/components/panel/ui";
import { RefreshCw, Cpu } from "lucide-react";

interface Proc {
  pid: number;
  name: string;
  user: string;
  state: string;
  cpuPct: number;
  memMb: number;
  cmdline: string;
}

const STATES: Record<string, string> = {
  R: "bg-emerald-500/15 text-emerald-400",
  S: "bg-sky-500/15 text-sky-400",
  D: "bg-amber-500/15 text-amber-400",
  Z: "bg-rose-500/15 text-rose-400",
  T: "bg-zinc-500/15 text-zinc-400",
};

export default function ProcessesPage() {
  const [procs, setProcs] = useState<Proc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/processes");
      const data = await res.json();
      setProcs(data.procs || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shown = filter
    ? procs.filter((p) => (p.name + " " + p.cmdline + " " + p.user).toLowerCase().includes(filter.toLowerCase()))
    : procs;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Processes"
        subtitle={`${total} tasks on this host — CPU % measured with a 160 ms sampling window.`}
        actions={
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />
      <Card pad={false}>
        <div className="px-4 py-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, command or user…"
            className="w-full max-w-sm rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-sky-500/60"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-14">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-2.5 font-medium">PID</th>
                  <th className="px-4 py-2.5 font-medium">Process</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">User</th>
                  <th className="px-4 py-2.5 font-medium">State</th>
                  <th className="px-4 py-2.5 text-right font-medium">CPU %</th>
                  <th className="px-4 py-2.5 text-right font-medium">Memory</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.pid} className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500">{p.pid}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Cpu size={13} className={cn("shrink-0", p.cpuPct > 20 ? "text-amber-400" : "text-zinc-600")} />
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-200">{p.name}</div>
                          <div className="max-w-md truncate font-mono text-[10px] text-zinc-600">{p.cmdline}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-2 text-zinc-400 sm:table-cell">{p.user}</td>
                    <td className="px-4 py-2">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", STATES[p.state] || STATES.S)}>
                        {p.state}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-300">{p.cpuPct.toFixed(1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{formatBytes(p.memMb * 1048576)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
