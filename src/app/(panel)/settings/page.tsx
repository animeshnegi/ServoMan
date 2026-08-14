"use client";

import { useEffect, useState } from "react";
import EntityManager from "@/components/panel/entity-manager";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Switch,
  Toasts,
  useToasts,
} from "@/components/panel/ui";
import { Save, Loader2, AlertTriangle, Power, Eraser } from "lucide-react";

const SERVICES = ["nginx", "phpfpm", "mysql", "postgresql", "redis", "docker"];
const PHP_EXT = ["gd", "curl", "mbstring", "zip", "imagick", "redis", "opcache", "xdebug"];

export default function SettingsPage() {
  const [s, setS] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [danger, setDanger] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setS)
      .catch(() => undefined);
  }, []);

  const set = (key: string, value: string) => setS((x) => ({ ...x, [key]: value }));
  const toggle = (key: string) => set(key, s[key] === "false" ? "true" : "false");

  const save = async () => {
    setBusy(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: s }),
      });
      push("Settings saved");
    } catch {
      push("Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const runDanger = async (action: string, label: string) => {
    setDanger(label);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      push(data.message || "Done");
    } catch {
      push("Operation failed", "error");
    } finally {
      setDanger(null);
    }
  };

  const on = (k: string, d: string) => (s[k] !== undefined ? s[k] : d);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Panel identity, managed services, PHP extensions, notifications and panel users."
        actions={
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save all settings
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="General" subtitle="Panel identity and node label">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Server node label">
                <Input value={on("server_label", "ubuntu-24-prod")} onChange={(e) => set("server_label", e.target.value)} />
              </Field>
            </div>
            <div>
              <Field label="Backup schedule (cron)">
                <Input value={on("auto_backup_time", "0 3 * * *")} onChange={(e) => set("auto_backup_time", e.target.value)} className="font-mono" />
              </Field>
            </div>
            <div>
              <Field label="Backup retention (days)">
                <Input type="number" value={on("backup_retention", "14")} onChange={(e) => set("backup_retention", e.target.value)} />
              </Field>
            </div>
            <div>
              <Field label="Update channel">
                <Select value={on("update_channel", "stable")} onChange={(e) => set("update_channel", e.target.value)}>
                  <option value="stable">Stable</option>
                  <option value="beta">Beta</option>
                </Select>
              </Field>
            </div>
            <div>
              <Field label="Timezone">
                <Select value={on("timezone", "UTC")} onChange={(e) => set("timezone", e.target.value)}>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Managed services" subtitle="Daemons supervised by the panel — flip to stop/start">
          <div className="grid grid-cols-2 gap-2.5">
            {SERVICES.map((sv) => (
              <div key={sv} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3.5 py-2.5">
                <span className="text-sm font-medium capitalize text-zinc-300">
                  {sv === "phpfpm" ? "PHP-FPM" : sv}
                </span>
                <Switch checked={on(`service_${sv}`, "true") === "true"} onChange={() => toggle(`service_${sv}`)} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="PHP extensions" subtitle="Modules compiled into the managed PHP runtimes">
          <div className="grid grid-cols-4 gap-2.5">
            {PHP_EXT.map((ext) => (
              <button
                key={ext}
                onClick={() => toggle(`php_ext_${ext}`)}
                className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                  on(`php_ext_${ext}`, "true") === "true"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/[0.07] bg-black/20 text-zinc-500"
                }`}
              >
                {ext}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Notifications & security" subtitle="Agent behaviour">
          <div className="space-y-3">
            <ToggleSetting label="Email notifications" desc={`Send alerts to ${on("notifications_email", "admin@example.com")}`} checked={on("notifications_enabled", "true") === "true"} onToggle={() => toggle("notifications_enabled")} />
            <ToggleSetting label="Fail2ban" desc="Brute-force protection" checked={on("fail2ban_enabled", "true") === "true"} onToggle={() => toggle("fail2ban_enabled")} />
            <ToggleSetting label="Auto SSL renewal" desc="ACME agent renews certificates" checked={on("auto_ssl_renew", "true") === "true"} onToggle={() => toggle("auto_ssl_renew")} />
            <ToggleSetting label="Scheduled backups" desc="Daily snapshots per the schedule above" checked={on("auto_backup_enabled", "true") === "true"} onToggle={() => toggle("auto_backup_enabled")} />
            <div>
              <Field label="Alert email address">
                <Input value={on("notifications_email", "admin@example.com")} onChange={(e) => set("notifications_email", e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Panel users</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          Accounts allowed to sign in to UbuntuDeck. The security scan flags weak passwords.
        </p>
        <EntityManager entityKey="panelUsers" embedded />
      </div>

      <Card title="Danger zone" subtitle="These operations affect the whole server — use with care">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => runDanger("system.reboot", "reboot")} disabled={danger !== null} className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
            {danger === "reboot" ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />} Schedule reboot
          </Button>
          <Button variant="outline" onClick={() => runDanger("system.cleanup", "cleanup")} disabled={danger !== null}>
            {danger === "cleanup" ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Purge caches &amp; temp
          </Button>
          <Button variant="danger" onClick={() => runDanger("logs.clear", "logs")} disabled={danger !== null}>
            {danger === "logs" ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />} Clear panel audit log
          </Button>
        </div>
      </Card>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function ToggleSetting({ label, desc, checked, onToggle }: { label: string; desc: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-600">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onToggle} />
    </div>
  );
}
