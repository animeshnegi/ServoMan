"use client";

import { useState } from "react";
import EntityManager from "@/components/panel/entity-manager";
import { Button, Card, Select, Field, Toasts, useToasts } from "@/components/panel/ui";
import { ArchiveRestore, Loader2, Database, Globe, Server } from "lucide-react";

export default function BackupsPage() {
  const [type, setType] = useState("system");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup.run", type, target: target || undefined }),
      });
      const data = await res.json();
      push(data.message || "Backup started");
      // refresh the list
      window.location.reload();
    } catch {
      push("Backup failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Run an on-demand backup"
        subtitle="Archives are written to /backups with SHA-256 checksums and stored off-site nightly."
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <Field label="Scope">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="system">Full server</option>
                <option value="website">Website</option>
                <option value="database">Database</option>
              </Select>
            </Field>
          </div>
          {type !== "system" && (
            <div className="w-64">
              <Field label={type === "website" ? "Target domain" : "Target database"}>
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-sky-500/60"
                  placeholder={type === "website" ? "example.com" : "shop_db"}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </Field>
            </div>
          )}
          <Button onClick={run} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
            Start backup
          </Button>
          <span className="text-xs text-zinc-600">Backup runs are logged to the audit trail.</span>
        </div>
      </Card>

      <EntityManager entityKey="backups" />

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Scheduled backup jobs</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          Jobs run on cron schedules with a retention policy — old archives are pruned automatically.
        </p>
        <EntityManager entityKey="backupJobs" embedded />
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
