// Server details + panel process health. Verifies the server is handling
// requests properly (event-loop lag, self-latency probe, resource usage).
import fs from "fs";
import os from "os";
import { systemInfo, diskUsage, readMeminfo } from "@/lib/metrics";

export const dynamic = "force-dynamic";

async function measureEventLoopLag(ms = 200): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now();
    let worst = 0;
    const ticks = 4;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      const now = Date.now();
      const expected = start + (i * ms) / ticks;
      worst = Math.max(worst, now - expected);
      if (i >= ticks) {
        clearInterval(iv);
        resolve(Math.round(worst));
      }
    }, Math.floor(ms / ticks));
  });
}

function networkInterfaces() {
  const out: { name: string; rx: number; tx: number }[] = [];
  try {
    for (const line of fs.readFileSync("/proc/net/dev", "utf8").split("\n")) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const name = line.slice(0, idx).trim();
      if (!name || name === "lo") continue;
      const parts = line.slice(idx + 1).trim().split(/\s+/).map(Number);
      out.push({ name, rx: parts[0] || 0, tx: parts[8] || 0 });
    }
  } catch {
    /* ignore */
  }
  return out;
}

function diskPartitions() {
  const mounts: { path: string; pct: number; used: number; total: number }[] = [];
  for (const p of ["/", "/tmp"]) {
    try {
      const d = diskUsage(p);
      if (d.total > 0) mounts.push({ path: p, pct: d.pct, used: d.used, total: d.total });
    } catch {
      /* ignore */
    }
  }
  return mounts;
}

export async function GET() {
  const started = Date.now();
  const lag = await measureEventLoopLag();
  const selfLatency = Date.now() - started;
  const info = systemInfo();
  const mem = readMeminfo();
  const rss = process.memoryUsage().rss;
  const topCpus = os
    .cpus()
    .map((c) => {
      const total = Object.values(c.times).reduce((a, b) => a + b, 0);
      return { model: c.model, idlePct: Math.round(((c.times.idle / total) * 100) * 10) / 10 };
    })
    .slice(0, 4);

  return Response.json({
    ok: true,
    node: {
      version: process.version,
      pid: process.pid,
      rssMb: Math.round(rss / 1048576),
      uptimeSec: Math.round(process.uptime()),
      eventLoopLagMs: lag,
      selfLatencyMs: selfLatency,
      env: process.env.NODE_ENV || "development",
    },
    info,
    mem: {
      total: mem.total,
      used: mem.used,
      cached: mem.cached,
      pct: Math.round((mem.used / Math.max(mem.total, 1)) * 1000) / 10,
      swapPct: mem.swapTotal > 0 ? Math.round(((mem.swapTotal - mem.swapFree) / mem.swapTotal) * 1000) / 10 : 0,
    },
    disks: diskPartitions(),
    net: networkInterfaces(),
    cpuTopology: topCpus,
    load: (() => {
      try {
        return (os as any).loadavg() as number[];
      } catch {
        return [0, 0, 0];
      }
    })(),
    timestamp: Date.now(),
  });
}
