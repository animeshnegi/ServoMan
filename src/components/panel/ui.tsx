"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { X, Loader2 } from "lucide-react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---------- formatting helpers ----------

export function formatBytes(b: number): string {
  if (!b || b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return String(v);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function timeAgo(v: unknown): string {
  if (!v) return "—";
  const d = new Date(v as string);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function isDateLike(v: unknown): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
}

// ---------- primitive UI ----------

export function Badge({ label, cls }: { label: string; cls?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        cls || "bg-white/5 text-zinc-300 border-white/10"
      )}
    >
      {label}
    </span>
  );
}

export function StatusDot({ color = "emerald" }: { color?: "emerald" | "amber" | "rose" | "zinc" | "sky" }) {
  const map = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    zinc: "bg-zinc-500",
    sky: "bg-sky-400",
  };
  return (
    <span className="relative flex h-2 w-2">
      <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", map[color])} />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", map[color])} />
    </span>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  pad = true,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
          <div>
            {title && <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = "sky",
  spark,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  color?: "sky" | "violet" | "emerald" | "amber" | "rose" | "zinc";
  spark?: number[];
}) {
  const stroke = {
    sky: "#38bdf8",
    violet: "#a78bfa",
    emerald: "#34d399",
    amber: "#fbbf24",
    rose: "#fb7185",
    zinc: "#a1a1aa",
  }[color];
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} stroke={stroke} width={92} height={34} />}
      </div>
    </div>
  );
}

export function Sparkline({
  data,
  stroke = "#38bdf8",
  width = 120,
  height = 36,
  fill = true,
}: {
  data: number[];
  stroke?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const lastY = height - 2 - ((last - min) / range) * (height - 4);
  const gid = `sg${stroke.replace("#", "")}`;
  return (
    <svg width={width} height={height} className="shrink-0">
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${gid})`} />
        </>
      )}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="2" fill={stroke} />
    </svg>
  );
}

export function AreaChartPanel({
  data,
  dataKey,
  color,
  unit = "",
}: {
  data: { t: string; v: number }[];
  dataKey: string;
  color: string;
  unit?: string;
}) {
  const gid = `area-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#52525b" }} tickLine={false} axisLine={false} interval={23} />
        <YAxis
          tick={{ fontSize: 9, fill: "#52525b" }}
          tickLine={false}
          axisLine={false}
          width={34}
          tickFormatter={(v: number) => `${v}${unit}`}
        />
        <Tooltip
          contentStyle={{
            background: "#101828",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            fontSize: 12,
            color: "#e4e4e7",
          }}
          labelStyle={{ color: "#71717a", fontSize: 11 }}
          formatter={(val: any) => [`${val}${unit}`, dataKey]}
        />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#${gid})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RingGauge({
  value,
  size = 150,
  label,
  color = "#34d399",
}: {
  value: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-white">{Math.round(pct)}</div>
        {label && <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>}
      </div>
    </div>
  );
}

// ---------- form primitives ----------

export const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputCls, "appearance-none", props.className)}>
      {props.children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "font-mono text-xs", props.className)} />;
}

export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5.5 w-10 rounded-full transition-colors",
        checked ? "bg-emerald-500" : "bg-white/15",
        disabled && "opacity-50"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      {children}
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  title,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "outline";
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const styles = {
    primary:
      "bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-900/30 hover:from-sky-400 hover:to-sky-600 border border-sky-400/30",
    ghost: "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] border border-white/10",
    outline: "bg-transparent text-zinc-300 hover:bg-white/[0.06] border border-white/15",
    danger: "bg-rose-600/90 text-white hover:bg-rose-600 border border-rose-400/30",
  }[variant];
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className
      )}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  children,
  onClick,
  title,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/[0.08] hover:text-zinc-100 disabled:opacity-40",
        className
      )}
    >
      {children}
    </button>
  );
}

// ---------- modal / confirm / toast ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:py-12" onClick={onClose}>
      <div
        className={cn("w-full rounded-xl border border-white/10 bg-[#111827] shadow-2xl", width)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <IconBtn onClick={onClose} title="Close">
            <X size={15} />
          </IconBtn>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="max-w-md">
      <div className="text-sm text-zinc-400">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={14} className="animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Toasts({ toasts, dismiss }: { toasts: { id: number; text: string; kind: string }[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl backdrop-blur",
            t.kind === "error"
              ? "border-rose-500/40 bg-rose-950/80 text-rose-100"
              : "border-emerald-500/30 bg-[#0c1f1a]/90 text-emerald-100"
          )}
        >
          <span className="whitespace-pre-wrap">{t.text}</span>
          <button onClick={() => dismiss(t.id)} className="text-current/60 hover:text-current">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: string }[]>([]);
  const push = (text: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  };
  return { toasts, push, dismiss: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)) };
}

// ---------- misc ----------

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-zinc-500" />;
}

export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {icon && <div className="mb-3 text-zinc-700">{icon}</div>}
      <div className="text-sm font-medium text-zinc-400">{title}</div>
      {hint && <div className="mt-1 max-w-xs text-xs text-zinc-600">{hint}</div>}
    </div>
  );
}

export function CodeBlock({ text, className }: { text: string; className?: string }) {
  return (
    <pre
      className={cn(
        "overflow-auto rounded-lg border border-white/[0.07] bg-black/40 p-4 font-mono text-xs leading-relaxed text-zinc-300",
        className
      )}
    >
      {text}
    </pre>
  );
}

// Tiny markdown renderer for AI replies
export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/```/);
  return (
    <div className="space-y-2 text-sm leading-relaxed text-zinc-300">
      {blocks.map((b, i) =>
        i % 2 === 1 ? (
          <CodeBlock key={i} text={b.replace(/^\w*\n/, "")} />
        ) : (
          <InlineMd key={i} text={b} />
        )
      )}
    </div>
  );
}

function InlineMd({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((l, i) => {
        const bold = l.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
        if (/^\s*[-•]\s/.test(l)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-sky-400">•</span>
              <span dangerouslySetInnerHTML={{ __html: bold }} />
            </div>
          );
        }
        if (l.trim().length === 0) return <div key={i} className="h-1" />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
      })}
    </>
  );
}

export function ChartArea({ data, dataKey, color, height = 190, unit = "" }: { data: { t: string; v: number }[]; dataKey: string; color: string; height?: number; unit?: string }) {
  return (
    <div style={{ height }}>
      <AreaChartPanel data={data} dataKey={dataKey} color={color} unit={unit} />
    </div>
  );
}
