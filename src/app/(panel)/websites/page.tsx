import EntityManager from "@/components/panel/entity-manager";
import { Card } from "@/components/panel/ui";
import { Globe, ShieldCheck, Zap } from "lucide-react";

export default function WebsitesPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Globe size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Nginx virtual hosts</div>
              <div className="text-xs text-zinc-500">Sites are generated as server blocks with PHP-FPM pools</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Let's Encrypt auto-SSL</div>
              <div className="text-xs text-zinc-500">ACME challenges + 90-day auto renewal per site</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Zap size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Live health probes</div>
              <div className="text-xs text-zinc-500">Use the ⚡ Health action to probe HTTP status + latency</div>
            </div>
          </div>
        </Card>
      </div>
      <EntityManager entityKey="sites" />
    </div>
  );
}
