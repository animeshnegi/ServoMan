import EntityManager from "@/components/panel/entity-manager";
import { Card } from "@/components/panel/ui";
import { Send, BarChart3, Gauge } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Send size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Per-domain sending</div>
              <div className="text-xs text-zinc-500">Send from different domains via record-verified identities or SMTP relays</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <BarChart3 size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Live campaign tracking</div>
              <div className="text-xs text-zinc-500">Delivered / opened / clicked / bounced per campaign</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Gauge size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Queue control</div>
              <div className="text-xs text-zinc-500">Send, pause and resume campaigns from the ⚡ actions</div>
            </div>
          </div>
        </Card>
      </div>

      <EntityManager entityKey="smtpSenders" />

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Campaigns</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          Each campaign picks a <b className="text-zinc-400">sending domain</b> (SPF/DKIM/DMARC verified — no SMTP credentials) and an
          SMTP relay. Use ⚡ Send to push a campaign through the queue and watch the stats update.
        </p>
        <EntityManager entityKey="campaigns" embedded />
      </div>
    </div>
  );
}
