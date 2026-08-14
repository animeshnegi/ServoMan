import EntityManager from "@/components/panel/entity-manager";
import { Card, PageHeader } from "@/components/panel/ui";
import { KeyRound, ShieldCheck, GitBranch } from "lucide-react";

export default function SshPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SSH Keys"
        subtitle="Key pairs generated on the server — paste the public key into GitHub, or into ~/.ssh/authorized_keys for passwordless access."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <KeyRound size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">ed25519 & RSA</div>
              <div className="text-xs text-zinc-500">Use ⚡ Generate to mint a pair</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Private keys never leave the server</div>
              <div className="text-xs text-zinc-500">Stored chmod 600 in /root/.ssh</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <GitBranch size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Deploy keys</div>
              <div className="text-xs text-zinc-500">Use a key for Git deployments to private repos</div>
            </div>
          </div>
        </Card>
      </div>
      <EntityManager entityKey="sshKeys" />
    </div>
  );
}
