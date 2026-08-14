import EntityManager from "@/components/panel/entity-manager";
import { Card } from "@/components/panel/ui";
import { Phone, PhoneCall, SignalHigh } from "lucide-react";

export default function VoipPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Phone size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">SIP extensions</div>
              <div className="text-xs text-zinc-500">PJSIP / SIP / IAX2 registrations on the PBX cluster</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <PhoneCall size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Call detail records</div>
              <div className="text-xs text-zinc-500">Every call logged with duration, billing seconds and cost</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <SignalHigh size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Asterisk / FreeSWITCH</div>
              <div className="text-xs text-zinc-500">Use ⚡ Call to place a test call from any extension</div>
            </div>
          </div>
        </Card>
      </div>

      <EntityManager entityKey="sipExtensions" />

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">SIP trunks</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          Carrier connections to the PSTN — credentials, codecs and channel limits. Use ⚡ Test to send a SIP OPTIONS probe to the provider.
        </p>
        <EntityManager entityKey="sipTrunks" embedded />
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Call records (CDR)</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          Billing-ready call detail records. Cost is computed from billable seconds at your trunk rate.
        </p>
        <EntityManager entityKey="callLogs" embedded />
      </div>
    </div>
  );
}
