"use client";

import { useEffect, useState } from "react";
import EntityManager from "@/components/panel/entity-manager";
import { Button, Card, StatusDot, Switch } from "@/components/panel/ui";
import { Flame, Loader2 } from "lucide-react";

export default function FirewallPage() {
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setEnabled(s.firewall_enabled !== "false"))
      .catch(() => undefined);
  }, []);

  const toggle = async (v: boolean) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "firewall.toggle", enabled: v }),
      });
      const data = await res.json();
      setEnabled(v);
      setMsg(data.message || (v ? "Firewall enabled" : "Firewall disabled"));
    } catch {
      setMsg("Failed to toggle firewall");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 6000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
              <Flame size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-zinc-100">Firewall status</h2>
                <StatusDot color={enabled ? "emerald" : "rose"} />
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {enabled
                  ? "ufw is ACTIVE — inbound traffic filtered by the rules below."
                  : "ufw is INACTIVE — every port on this server is exposed to the internet."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {busy && <Loader2 size={15} className="animate-spin text-zinc-500" />}
            <span className="text-xs font-medium text-zinc-400">{enabled ? "Enabled" : "Disabled"}</span>
            <Switch checked={enabled} onChange={toggle} disabled={busy} />
          </div>
        </div>
      </Card>
      {msg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          {msg}
        </div>
      )}
      <EntityManager entityKey="firewallRules" />
    </div>
  );
}
