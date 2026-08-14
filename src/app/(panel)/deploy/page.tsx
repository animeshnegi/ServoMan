import GitManager from "@/components/panel/git-manager";
import EntityManager from "@/components/panel/entity-manager";
import { Card, PageHeader } from "@/components/panel/ui";
import { GitBranch, Webhook, Boxes } from "lucide-react";

export default function DeployPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Git Deployments"
        subtitle="Connect repositories and deploy unlimited apps — Node.js, Flask, PHP and static sites — with real git clone/pull, branch switching and push-to-deploy webhooks."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <GitBranch size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Real git operations</div>
              <div className="text-xs text-zinc-500">Clone from GitHub/GitLab/URLs, pull branches, view commit history</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Webhook size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Push-to-deploy</div>
              <div className="text-xs text-zinc-500">Secret webhook URL per app — every git push auto-rebuilds</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Boxes size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">4 runtimes</div>
              <div className="text-xs text-zinc-500">Node.js (pm2) · Python/Flask (gunicorn) · PHP-FPM · static Nginx</div>
            </div>
          </div>
        </Card>
      </div>

      <GitManager />

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Add / edit deployment apps</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          Point an app at a website (virtual host), choose the runtime, repository and branch. Then use the cards above to clone, pull and wire up push-to-deploy.
        </p>
        <EntityManager entityKey="deployments" embedded />
      </div>
    </div>
  );
}
