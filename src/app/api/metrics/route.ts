// Live system metrics + deterministic 24h history.
import { db } from "@/db";
import { settings } from "@/db/schema";
import {
  sampleCpu,
  readMeminfo,
  diskUsage,
  sampleNetRate,
  systemInfo,
  historySeries,
  historyLabels,
  round1,
} from "@/lib/metrics";

export const dynamic = "force-dynamic";

async function getSettings() {
  try {
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  } catch {
    return {} as Record<string, string>;
  }
}

export async function GET() {
  const s = await getSettings();
  const [cpu, mem, net, disk, diskWww, info] = await Promise.all([
    sampleCpu(),
    Promise.resolve(readMeminfo()),
    sampleNetRate(),
    Promise.resolve(diskUsage("/")),
    Promise.resolve(diskUsage("/www")),
    Promise.resolve(systemInfo()),
  ]);

  const load = osLoad();
  const cpuThreshold = Number(s.alert_threshold_cpu || 90);
  const diskThreshold = Number(s.alert_threshold_disk || 85);

  // Derived (real-time) threshold alerts
  const derived: { severity: string; message: string }[] = [];
  if (cpu > cpuThreshold)
    derived.push({ severity: "warning", message: `CPU usage ${cpu}% exceeds threshold ${cpuThreshold}%` });
  if (disk.pct > diskThreshold)
    derived.push({ severity: "critical", message: `Disk usage ${disk.pct}% exceeds threshold ${diskThreshold}%` });
  if (load[0] > info.cores * 1.5)
    derived.push({ severity: "warning", message: `Load average ${load[0].toFixed(2)} is high for ${info.cores} cores` });
  if (mem.total > 0 && mem.free / mem.total < 0.08)
    derived.push({ severity: "critical", message: `Free memory is critically low (${(mem.free / mem.total * 100).toFixed(1)}%)` });

  const points = 144;
  const labels = historyLabels(points);
  const history = {
    labels,
    cpu: historySeries("cpu", cpu, 2, 100, points),
    mem: historySeries("mem", (mem.used / Math.max(mem.total, 1)) * 100, 10, 100, points),
    disk: historySeries("disk", disk.pct, disk.pct - 3, 100, points),
    load: historySeries("load", load[0], 0.1, info.cores * 2, points),
    netIn: historySeries("netIn", Math.min(net.rxRate, 20e6), 1024, 25e6, points),
    netOut: historySeries("netOut", Math.min(net.txRate, 10e6), 1024, 15e6, points),
  };

  return Response.json({
    now: {
      cpu,
      mem: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        cached: mem.cached,
        pct: round1((mem.used / Math.max(mem.total, 1)) * 100),
        swapPct: mem.swapTotal > 0 ? round1(((mem.swapTotal - mem.swapFree) / mem.swapTotal) * 100) : 0,
      },
      disk: { ...disk, pctWww: diskWww.total > 0 ? diskWww.pct : null },
      net: { rxRate: net.rxRate, txRate: net.txRate },
      load,
      uptimeSec: info.uptimeSec,
      procTotal: info.procTotal,
    },
    info,
    history,
    derived,
    timestamp: Date.now(),
  });
}

function osLoad(): number[] {
  try {
    // os.loadavg may not exist in some sandboxes
    return require("os").loadavg();
  } catch {
    return [0, 0, 0];
  }
}
