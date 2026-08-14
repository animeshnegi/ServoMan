import EntityManager from "@/components/panel/entity-manager";
import { Card } from "@/components/panel/ui";

export default function DatabasesPage() {
  return (
    <div className="space-y-6">
      <EntityManager entityKey="databases" />
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Database users</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          Users are granted privileges on the databases above. Back up any database with the ⚡ action.
        </p>
        <EntityManager entityKey="dbUsers" embedded />
      </div>
    </div>
  );
}
