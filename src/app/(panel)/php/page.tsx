"use client";

import { useEffect, useState } from "react";
import {
  Braces,
  Loader2,
  Save,
  RefreshCw,
  Cpu,
  Database,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Switch,
  Toasts,
  useToasts,
} from "@/components/panel/ui";

const PHP_EXT = ["gd", "curl", "mbstring", "zip", "imagick", "redis", "opcache", "xdebug"];

const INI_LIMITS = [
  { key: "php_ini_memory_limit", label: "memory_limit", def: "256M" },
  { key: "php_ini_upload_max_filesize", label: "upload_max_filesize", def: "64M" },
  { key: "php_ini_post_max_size", label: "post_max_size", def: "80M" },
  { key: "php_ini_max_execution_time", label: "max_execution_time", def: "120" },
  { key: "php_ini_max_input_vars", label: "max_input_vars", def: "5000" },
];

export default function PhpPage() {
  const [s, setS] = useState<Record<string, string>>({});
  const [sites, setSites] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setS).catch(() => undefined);
    fetch("/api/data/sites?sort=id&order=asc")
      .then((r) => r.json())
      .then((d) => setSites(Array.isArray(d) ? d : []))
      .catch(() => undefined);
  }, []);

  const on = (k: string, d: string) => (s[k] !== undefined ? s[k] : d);
  const set = (k: string, v: string) => setS((x) => ({ ...x, [k]: v }));
  const toggle = (k: string) => set(k, on(k, "true") === "true" ? "false" : "true");

  const save = async () => {
    setBusy(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: s }),
      });
      push("PHP configuration saved & applied to all pools");
    } catch {
      push("Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    setRestarting(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "service.restart", service: "phpfpm" }),
      });
      const d = await res.json();
      push(d.message || "PHP-FPM restarted");
    } catch {
      push("Restart failed", "error");
    } finally {
      setRestarting(false);
    }
  };

  const versions = ["7.4", "8.0", "8.1", "8.2", "8.3"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="PHP & Extensions"
        subtitle="aaPanel-style PHP configuration — global ini limits, compiled extensions and per-site version assignment."
        actions={
          <>
            <Button variant="ghost" onClick={restart} disabled={restarting}>
              {restarting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Restart PHP-FPM
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Apply configuration
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Braces size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Per-site PHP versions</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {versions.map((v) => {
                  const count = sites.filter((x) => x.phpVersion === v).length;
                  if (!count) return null;
                  return (
                    <span key={v} className="rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                      {v} × {count}
                    </span>
                  );
                })}
                {sites.length === 0 && <span className="text-xs text-zinc-600">no sites yet</span>}
              </div>
              <div className="mt-1 text-[11px] text-zinc-600">Assign per site on the Websites page</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Zap size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">OPcache</div>
              <div className="text-xs text-zinc-500">
                {on("php_ext_opcache", "true") === "true" ? "enabled — bytecode caching active" : "disabled — enable for performance"}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Database size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Database drivers</div>
              <div className="text-xs text-zinc-500">PDO MySQL / PostgreSQL / SQLite compiled</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="php.ini limits" subtitle="Applied to every PHP-FPM pool after saving">
          <div className="grid grid-cols-2 gap-4">
            {INI_LIMITS.map((x) => (
              <Field key={x.key} label={x.label}>
                <Input className="font-mono" value={on(x.key, x.def)} onChange={(e) => set(x.key, e.target.value)} />
              </Field>
            ))}
          </div>
        </Card>

        <Card title="Compiled extensions" subtitle="Toggle on/off — takes effect after restarting PHP-FPM">
          <div className="grid grid-cols-4 gap-2.5">
            {PHP_EXT.map((ext) => (
              <div key={ext} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-3">
                <span className={`text-xs font-medium ${on(`php_ext_${ext}`, "true") === "true" ? "text-emerald-300" : "text-zinc-500"}`}>
                  {ext}
                </span>
                <Switch checked={on(`php_ext_${ext}`, "true") === "true"} onChange={() => toggle(`php_ext_${ext}`)} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
