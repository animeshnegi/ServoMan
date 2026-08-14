"use client";

import EntityManager from "@/components/panel/entity-manager";
import { Card } from "@/components/panel/ui";
import { Boxes } from "lucide-react";

export default function DockerPage() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
            <Boxes size={17} />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">Docker Engine 27.5.1</div>
            <div className="text-xs text-zinc-500">
              Containers are isolated with cgroups v2 — CPU %, memory and restart policy per container. Use the ⚡ buttons to start, stop, restart or view logs.
            </div>
          </div>
        </div>
      </Card>
      <EntityManager entityKey="containers" />
    </div>
  );
}
