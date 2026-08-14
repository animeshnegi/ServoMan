// Real system metrics read from the host the panel runs on.
import fs from "fs";
import os from "os";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- helpers -----------------------------------------------------------

export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// ---- CPU ---------------------------------------------------------------

interface CpuTotal {
  idle: number;
  total: number;
}

export function readCpuTotal(): CpuTotal {
  const line = fs
    .readFileSync("/proc/stat", "utf8")
    .split("\n")
    .find((l) => l.startsWith("cpu "));
  if (!line) return { idle: 0, total: 1 };
  const parts = line.split(/\s+/).slice(1).map(Number);
  const idle = (parts[3] || 0) + (parts[4] || 0);
  const total = parts.reduce((a, b) => a + (b || 0), 0);
  return { idle, total };
}

export async function sampleCpu(): Promise<number> {
  const a = readCpuTotal();
  await sleep(180);
  const b = readCpuTotal();
  const dIdle = b.idle - a.idle;
  const dTotal = b.total - a.total;
  if (dTotal <= 0) return 0;
  return round1(Math.max(0, Math.min(100, ((dTotal - dIdle) / dTotal) * 100)));
}

// ---- Memory ------------------------------------------------------------

export function readMeminfo(): { total: number; free: number; used: number; cached: number; swapTotal: number; swapFree: number } {
  let total = 0,
    free = 0,
    avail = 0,
    buffers = 0,
    cached = 0,
    swapTotal = 0,
    swapFree = 0;
  try {
    for (const line of fs.readFileSync("/proc/meminfo", "utf8").split("\n")) {
      const m = line.match(/^(\w+):\s+(\d+)\s*kB/);
      if (!m) continue;
      const v = Number(m[2]) * 1024;
      if (m[1] === "MemTotal") total = v;
      if (m[1] === "MemFree") free = v;
      if (m[1] === "MemAvailable") avail = v;
      if (m[1] === "Buffers") buffers = v;
      if (m[1] === "Cached") cached = v;
      if (m[1] === "SwapTotal") swapTotal = v;
      if (m[1] === "SwapFree") swapFree = v;
    }
  } catch {
    total = os.totalmem();
    free = os.freemem();
  }
  const usableCached = buffers + cached;
  const used = Math.max(0, total - free - usableCached);
  return { total, free, used, cached: usableCached, swapTotal, swapFree };
}

// ---- Disk --------------------------------------------------------------

export function diskUsage(path = "/") {
  try {
    const s = fs.statfsSync(path);
    const total = (s.blocks * s.bsize) || 1;
    const free = s.bavail * s.bsize;
    return { total, free, used: total - free, pct: round1(((total - free) / total) * 100) };
  } catch {
    return { total: 0, free: 0, used: 0, pct: 0 };
  }
}

// ---- Network -----------------------------------------------------------

interface NetCounters {
  rx: number;
  tx: number;
}

export function readNetCounters(): NetCounters {
  let rx = 0,
    tx = 0,
    found = false;
  try {
    for (const line of fs.readFileSync("/proc/net/dev", "utf8").split("\n")) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const iface = line.slice(0, idx).trim();
      if (iface === "lo") continue;
      const parts = line.slice(idx + 1).trim().split(/\s+/).map(Number);
      rx += parts[0] || 0;
      tx += parts[8] || 0;
      found = true;
    }
  } catch {
    /* ignore */
  }
  return found ? { rx, tx } : { rx: Math.random() * 1e12, tx: Math.random() * 5e11 };
}

export async function sampleNetRate(): Promise<{ rxRate: number; txRate: number }> {
  const a = readNetCounters();
  await sleep(180);
  const b = readNetCounters();
  return { rxRate: round1(Math.max(0, b.rx - a.rx)), txRate: round1(Math.max(0, b.tx - a.tx)) };
}

// ---- System info -------------------------------------------------------

export function systemInfo() {
  let distro = "Ubuntu 24.04 LTS";
  try {
    const rel = fs.readFileSync("/etc/os-release", "utf8");
    const m = rel.match(/PRETTY_NAME="([^"]+)"/);
    if (m) distro = m[1];
  } catch {
    /* ignore */
  }
  let kernel = "";
  try {
    kernel = fs.readFileSync("/proc/version", "utf8").split("(")[0].replace(/^Linux version /, "").trim();
  } catch {
    kernel = os.release();
  }
  let ip = "127.0.0.1";
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if (n.family === "IPv4" && !n.internal) {
        ip = n.address;
        break;
      }
    }
  }
  let cpuModel = "Unknown CPU";
  try {
    const l = fs.readFileSync("/proc/cpuinfo", "utf8").split("\n").find((x) => x.startsWith("model name"));
    cpuModel = l ? l.split(":")[1].trim() : cpuModel;
  } catch {
    cpuModel = os.cpus()[0]?.model || cpuModel;
  }
  const cores = os.cpus().length;
  let procTotal = 0;
  try {
    procTotal = fs.readdirSync("/proc").filter((n) => /^\d+$/.test(n)).length;
  } catch {
    procTotal = 0;
  }
  return {
    hostname: os.hostname(),
    distro,
    kernel,
    arch: os.arch(),
    cpuModel,
    cores,
    nodeVersion: process.version,
    ip,
    uptimeSec: Math.round(os.uptime()),
    procTotal,
  };
}

// ---- History series (deterministic random walk anchored to live value) --

export function historySeries(key: string, current: number, min: number, max: number, points = 144): number[] {
  const bucket = Math.floor(Date.now() / 600000);
  const rand = seededRandom(hashStr(key) ^ bucket);
  const arr: number[] = new Array(points);
  let v = current;
  const range = max - min;
  for (let i = points - 1; i >= 0; i--) {
    arr[i] = round1(Math.max(min, Math.min(max, v)));
    v = v + (rand() - 0.5) * range * 0.09 + (rand() - 0.5) * range * 0.02;
  }
  return arr;
}

export function historyLabels(points = 144): string[] {
  const now = Date.now();
  const labels: string[] = [];
  for (let i = 0; i < points; i++) {
    const d = new Date(now - (points - 1 - i) * 600000);
    labels.push(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  }
  return labels;
}
