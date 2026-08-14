"use client";

import { useEffect, useState } from "react";
import EntityManager from "@/components/panel/entity-manager";
import { Button, Card, StatusDot } from "@/components/panel/ui";
import { ShieldCheck, RefreshCw, Loader2, CalendarClock } from "lucide-react";

export default function SslPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () =>
    fetch("/api/data/certs?sort=id&order=asc")
      .then((r) => r.json())
      .then((d) => setCerts(Array.isArray(d) ? d : []))
      .catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  const renewAll = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cert.renewAll" }),
      });
      const data = await res.json();
      setMsg(data.message || "Renewed");
      load();
    } catch {
      setMsg("Renewal failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 6000);
    }
  };

  const expiring = certs.filter((c) => {
    if (!c.expiresAt || c.status === "valid") {
      const d = new Date(c.expiresAt).getTime();
      return c.expiresAt && d - Date.now() < 30 * 86400000;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Card className="flex-1 basis-72">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">{certs.length} certificates</div>
              <div className="text-xs text-zinc-500">
                {certs.filter((c) => c.status === "valid").length} valid · {expiring.length} need attention
              </div>
            </div>
          </div>
        </Card>
        <Card className="flex-1 basis-72">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <CalendarClock size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Auto-renewal</div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <StatusDot color={certs.some((c) => c.autoRenew) ? "emerald" : "amber"} />
                ACME renewal agent active
              </div>
            </div>
          </div>
        </Card>
        <Card className="flex-1 basis-72">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <ShieldCheck size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">SSL v2 engine</div>
              <div className="text-xs text-zinc-500">Wildcards & SANs · HSTS preload · OCSP stapling · cipher profiles</div>
            </div>
          </div>
        </Card>
        <Button onClick={renewAll} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Renew all certificates
        </Button>
      </div>
      {msg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          {msg}
        </div>
      )}
      <EntityManager entityKey="certs" />
    </div>
  );
}
