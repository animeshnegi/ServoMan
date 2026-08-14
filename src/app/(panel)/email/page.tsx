import EntityManager from "@/components/panel/entity-manager";
import { Card } from "@/components/panel/ui";
import { Mail, ShieldCheck, HardDrive, BadgeCheck } from "lucide-react";

export default function EmailServerPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Mail size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Postfix + Dovecot stack</div>
              <div className="text-xs text-zinc-500">SMTP submission on 587/465, IMAP on 993, POP3 on 995</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">DKIM / SPF / DMARC</div>
              <div className="text-xs text-zinc-500">Automatic signing per domain, anti-spoofing records</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <HardDrive size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Quotas & catch-all</div>
              <div className="text-xs text-zinc-500">Per-mailbox disk quotas and per-domain catch-all routing</div>
            </div>
          </div>
        </Card>
      </div>

      <EntityManager entityKey="mailDomains" />

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Mailboxes</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          IMAP/POP3 accounts attached to the domains above. Used space is refreshed by the mail agent every 5 minutes.
        </p>
        <EntityManager entityKey="mailboxes" embedded />
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
        <div className="flex items-center gap-2.5">
          <BadgeCheck size={17} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Record-verified sending domains</h3>
        </div>
        <p className="mb-4 mt-1 text-xs text-zinc-500">
          Send transactional &amp; campaign email from any domain by publishing SPF/DKIM/DMARC records —{" "}
          <b className="text-zinc-400">no SMTP credentials</b>. Use ⚡ DNS records to generate the exact records per domain,
          publish them at your DNS provider, then ⚡ Verify. Every domain gets different records and its own daily counter.
        </p>
        <EntityManager entityKey="sendDomains" embedded />
      </div>
    </div>
  );
}
