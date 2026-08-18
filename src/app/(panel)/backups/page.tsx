"use client";

import { useState } from "react";
import EntityManager from "@/components/panel/entity-manager";
import { Button, Card, Select, Field, Toasts, useToasts } from "@/components/panel/ui";
import { ArchiveRestore, Loader2 } from "lucide-react";

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
      window.location.reload();
    } catch {
      push("The backup could not be started. Check the server log for details.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Create a backup now"
        subtitle="Choose the part of the server you want to protect. Backup activity is recorded in the audit log so you can see what ran and when."
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <Field label="What to back up">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="system">Full server</option>
                <option value="website">Website</option>
                <option value="database">Database</option>
              </Select>
            </Field>
          </div>
          {type !== "system" && (
            <div className="w-64">
              <Field label={type === "website" ? "Website domain" : "Database name"}>
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
          <span className="max-w-md text-xs leading-relaxed text-zinc-600">
            Scheduled jobs can handle routine backups and retention. Use an on-demand backup before major server changes or deployments.
          </span>
        </div>
      </Card>

      <EntityManager entityKey="backups" />

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Scheduled backup jobs</h3>
        <p className="mb-4 mt-0.5 text-xs leading-relaxed text-zinc-500">
          Review the jobs that create backups automatically. Retention rules are applied as old archives become eligible for removal.
        </p>
        <EntityManager entityKey="backupJobs" embedded />
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
