import EntityManager from "@/components/panel/entity-manager";

export default function DnsPage() {
  return (
    <div className="space-y-6">
      <EntityManager entityKey="dnsZones" />
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Zone records</h3>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">
          A, AAAA, CNAME, MX, TXT, NS, SRV and CAA records. TTL in seconds; priority applies to MX / SRV.
        </p>
        <EntityManager entityKey="dnsRecords" embedded />
      </div>
    </div>
  );
}
