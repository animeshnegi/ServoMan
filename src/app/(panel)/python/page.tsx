import EntityManager from "@/components/panel/entity-manager";
import { Card, PageHeader } from "@/components/panel/ui";
import { Code2, Container, Layers, Rocket } from "lucide-react";

export default function PythonPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Python Projects"
        subtitle="aaPanel-style Python Project Manager — Flask, Django & FastAPI on Python 3.10–3.12, each in its own venv."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Code2 size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Python 3.10 / 3.11 / 3.12</div>
              <div className="text-xs text-zinc-500">Managed runtimes from apt + pyenv</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Container size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Isolated venvs</div>
              <div className="text-xs text-zinc-500">Every project gets its own .venv — no conflicts</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Layers size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">gunicorn / uvicorn / uwsgi</div>
              <div className="text-xs text-zinc-500">WSGI & ASGI process modes per project</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Rocket size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Git push-to-deploy</div>
              <div className="text-xs text-zinc-500">Pair with the Deployments page (Flask runtime)</div>
            </div>
          </div>
        </Card>
      </div>

      <EntityManager entityKey="pythonProjects" />
    </div>
  );
}
