"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartSpline,
  Cpu,
  FileText,
  TerminalSquare,
  Globe,
  Waypoints,
  ShieldCheck,
  Flame,
  Database,
  FolderUp,
  Clock,
  ArchiveRestore,
  Boxes,
  FolderOpen,
  Sparkles,
  Fingerprint,
  Settings,
  Server,
  Bell,
  Menu,
  X,
  Mail,
  Megaphone,
  Phone,
  Rocket,
  KeyRound,
  Braces,
  Code2,
} from "lucide-react";
import { MENU } from "@/lib/entities";
import { cn, formatUptime } from "@/components/panel/ui";

const ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  LayoutDashboard,
  ChartSpline,
  Cpu,
  FileText,
  TerminalSquare,
  Globe,
  Waypoints,
  ShieldCheck,
  Flame,
  Database,
  FolderUp,
  Clock,
  ArchiveRestore,
  Boxes,
  FolderOpen,
  Sparkles,
  Fingerprint,
  Settings,
  Mail,
  Megaphone,
  Phone,
  Rocket,
  KeyRound,
  Braces,
  Code2,
};

interface MiniMetrics {
  cpu: number;
  memPct: number;
  diskPct: number;
  uptimeSec: number;
  alerts: number;
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [m, setM] = useState<MiniMetrics>({ cpu: 0, memPct: 0, diskPct: 0, uptimeSec: 0, alerts: 0 });
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/metrics");
        const data = await res.json();
        if (stop || !data.now) return;
        setM({
          cpu: data.now.cpu,
          memPct: data.now.mem.pct,
          diskPct: data.now.disk.pct,
          uptimeSec: data.now.uptimeSec,
          alerts: (data.derived || []).length,
        });
      } catch {
        /* ignore */
      }
    };
    poll();
    const iv = setInterval(poll, 8000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);

  const title =
    MENU.flatMap((s) => s.items).find((i) => i.href === pathname)?.label || "Dashboard";

  return (
    <div className="flex min-h-screen bg-[#0a0e1a] text-zinc-200">
      {/* sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-white/[0.06] bg-[#0b101d] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-900/40">
              <Server size={19} className="text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b101d] bg-emerald-400" />
            </div>
            <div>
              <div className="text-[16px] font-extrabold tracking-tight text-white">
                SERVO<span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">MAN</span>
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Lightweight Server Panel
              </div>
            </div>
            <button className="ml-auto text-zinc-500 lg:hidden" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
            {MENU.map((section) => (
              <div key={section.section}>
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {section.section}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = ICONS[item.icon] || LayoutDashboard;
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition",
                          active
                            ? "bg-gradient-to-r from-sky-500/15 to-transparent text-sky-300 shadow-[inset_2px_0_0_0_#38bdf8]"
                            : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                        )}
                      >
                        <Icon size={15} className={cn(active ? "text-sky-400" : "text-zinc-600 group-hover:text-zinc-400")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/[0.06] px-5 py-4 text-[11px] text-zinc-600">
            <div className="flex items-center justify-between">
              <span>SERVOMAN v3.0</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> agent online
              </span>
            </div>
            <div className="mt-1">Ubuntu 24.04 LTS · ~120 MB footprint</div>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/[0.06] bg-[#0a0e1a]/85 px-5 py-3 backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/60 to-transparent" />
          <button className="text-zinc-400 lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{title}</div>
            <div className="hidden text-[11px] text-zinc-600 sm:block">
              servoman-node · agent v3.0 · lightweight
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-4 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-zinc-400 md:flex">
              <Ticker label="CPU" value={m.cpu} suffix="%" color="text-sky-400" />
              <Ticker label="MEM" value={m.memPct} suffix="%" color="text-violet-400" />
              <Ticker label="DISK" value={m.diskPct} suffix="%" color="text-emerald-400" />
              <span className="text-zinc-700">|</span>
              <span>up {formatUptime(m.uptimeSec)}</span>
            </div>
            <Link
              href="/monitoring"
              className="relative rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-zinc-400 transition hover:text-zinc-100"
              title="Alerts"
            >
              <Bell size={15} />
              {m.alerts > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {m.alerts}
                </span>
              )}
            </Link>
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold text-zinc-200">{clock}</div>
              <div className="text-[10px] text-zinc-600">UTC</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-xs font-bold text-white ring-2 ring-white/10">
              A
            </div>
          </div>
        </header>

        <main className="relative min-w-0 flex-1 p-5 lg:p-7">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(56,189,248,0.07),transparent)]"
          />
          <div className="relative z-10">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] px-7 py-3 text-[11px] text-zinc-700">
          <span>SERVOMAN — everything cPanel &amp; aaPanel do, plus an AI ops assistant, push-to-deploy, record-verified email and security scoring.</span>
          <span className="font-medium text-zinc-600">lightweight · single process · ~120 MB RAM</span>
        </footer>
      </div>
    </div>
  );
}

function Ticker({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-zinc-600">{label}</span>
      <span className={cn("font-semibold tabular-nums", color)}>
        {Math.round(value)}
        {suffix}
      </span>
    </span>
  );
}
