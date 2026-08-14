"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  PageHeader,
  RingGauge,
  StatusDot,
  Switch,
  cn,
  timeAgo,
} from "@/components/panel/ui";
import { Fingerprint, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

interface Finding {
  level: "ok" | "warn" | "crit";
  message: string;
}

export default function SecurityPage() {
  const [score, setScore] = useState<number | null>(null);
  const [grade, setGrade] = useState("?");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);
  const [audits, setAudits] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const load = () => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setSettings(s);
        if (s.security_score) {
          const v = Number(s.security_score);
          setScore(v);
          setGrade(v >= 90 ? "A" : v >= 75 ? "B" : v >= 55 ? "C" : "D");
        }
      })
      .catch(() => undefined);
    fetch("/api/data/auditLogs?sort=id&order=desc")
      .then((r) => r.json())
      .then((d) => setAudits(Array.isArray(d) ? d.slice(0, 15) : []));
  };

  useEffect(load, []);

  const scan = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "security.scan" }),
      });
      const data = await res.json();
      if (data.score !== undefined) {
        setScore(data.score);
        setGrade(data.grade);
        setFindings(data.findings || []);
      }
    } finally {
      setBusy(false);
      load();
    }
  };

  const toggle = async (key: string) => {
    const next = settings[key] !== "false" ? "false" : "true";
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: { [key]: next } }),
    });
    setSettings((s) => ({ ...s, [key]: next }));
  };

  const color = score === null ? "#71717a" : score >= 75 ? "#34d399" : score >= 55 ? "#fbbf24" : "#fb7185";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Center"
        subtitle="Continuous hardening score computed from your real configuration — firewall, fail2ban, certificates, backups, passwords and containers."
        actions={
          <Button onClick={scan} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Run full security scan
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Hardening score" className="flex flex-col items-center justify-center">
          <RingGauge value={score ?? 0} color={color} label={`grade ${grade}`} />
          <p className="mt-4 text-center text-xs text-zinc-500">
            {score === null
              ? "Run a scan to calculate your score."
              : score >= 90
                ? "Excellent — this server is locked down tight."
                : score >= 75
                  ? "Good posture. Address the warnings below."
                  : score >= 55
                    ? "Several issues need attention."
                    : "High risk — fix the critical findings immediately."}
          </p>
        </Card>

        <Card title="Scan findings" className="lg:col-span-2">
          {findings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-600">
              <ShieldAlert size={28} className="mb-3" />
              <span className="text-sm">No scan results yet — click “Run full security scan”.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {findings.map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs",
                    f.level === "ok"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                      : f.level === "warn"
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                        : "border-rose-500/25 bg-rose-500/10 text-rose-200"
                  )}
                >
                  <StatusDot color={f.level === "ok" ? "emerald" : f.level === "warn" ? "amber" : "rose"} />
                  {f.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Quick hardening toggles" subtitle="These settings feed directly into the score">
          <div className="space-y-3">
            <ToggleRow
              label="Firewall (ufw)"
              desc="Filter inbound traffic on all ports"
              checked={settings.firewall_enabled !== "false"}
              onChange={() => toggle("firewall_enabled")}
            />
            <ToggleRow
              label="Fail2ban"
              desc="Ban IPs after repeated failed logins"
              checked={settings.fail2ban_enabled !== "false"}
              onChange={() => toggle("fail2ban_enabled")}
            />
            <ToggleRow
              label="Scheduled backups"
              desc="Automatic daily snapshot jobs"
              checked={settings.auto_backup_enabled !== "false"}
              onChange={() => toggle("auto_backup_enabled")}
            />
            <ToggleRow
              label="Automatic SSL renewal"
              desc="ACME renewal for all certificates"
              checked={settings.auto_ssl_renew !== "false"}
              onChange={() => toggle("auto_ssl_renew")}
            />
          </div>
        </Card>

        <Card title="Recent security-relevant activity" subtitle="From the panel audit trail">
          <div className="max-h-64 overflow-y-auto">
            {audits.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-white/[0.04] py-2 last:border-0">
                <Fingerprint size={13} className="mt-0.5 shrink-0 text-zinc-600" />
                <div className="min-w-0 flex-1 text-xs text-zinc-300">
                  <span className="font-medium text-zinc-100">{a.action}</span>
                  {a.target && <span className="text-zinc-500"> · {a.target}</span>}
                </div>
                <span className="text-[10px] text-zinc-600">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
            {audits.length === 0 && <div className="py-8 text-center text-sm text-zinc-600">No activity yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-600">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
