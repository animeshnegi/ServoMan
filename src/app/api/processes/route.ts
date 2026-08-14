// Real process list sampled from /proc with CPU % deltas.
import fs from "fs";
import { sleep } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const HZ = 100;
const PAGE = 4096;

interface ProcSample {
  pid: number;
  utime: number;
  stime: number;
  rssBytes: number;
  name: string;
  state: string;
  uid: number;
  cmdline: string;
}

function scanProcs(): ProcSample[] {
  const out: ProcSample[] = [];
  let names: string[] = [];
  try {
    names = fs.readdirSync("/proc").filter((n) => /^\d+$/.test(n));
  } catch {
    return out;
  }
  for (const n of names) {
    try {
      const pid = Number(n);
      const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      const commEnd = stat.lastIndexOf(")");
      const parts = stat.slice(commEnd + 2).split(" ");
      const utime = Number(parts[11]);
      const stime = Number(parts[12]);
      const state = parts[0] || "?";
      const uid = Number(parts[8] || 0);
      let rssBytes = 0;
      try {
        const statm = fs.readFileSync(`/proc/${pid}/statm`, "utf8").trim().split(/\s+/);
        rssBytes = Number(statm[1] || 0) * PAGE;
      } catch {
        /* ignore */
      }
      let cmdline = "";
      try {
        cmdline = fs
          .readFileSync(`/proc/${pid}/cmdline`, "utf8")
          .split("\0")
          .filter(Boolean)
          .join(" ")
          .slice(0, 200);
      } catch {
        /* ignore */
      }
      out.push({
        pid,
        utime,
        stime,
        rssBytes,
        name: stat.slice(stat.indexOf("(") + 1, commEnd).slice(0, 40),
        state,
        uid,
        cmdline,
      });
    } catch {
      /* process vanished */
    }
  }
  return out;
}

function uidToUser(uid: number) {
  try {
    const passwd = fs.readFileSync("/etc/passwd", "utf8");
    const line = passwd.split("\n").find((l) => l.split(":")[2] === String(uid));
    return line ? line.split(":")[0] : String(uid);
  } catch {
    return String(uid);
  }
}

export async function GET() {
  const a = scanProcs();
  const cpuTotalA = readCpuTotal();
  await sleep(160);
  const b = scanProcs();
  const cpuTotalB = readCpuTotal();
  const dTotal = cpuTotalB.total - cpuTotalA.total || 1;
  const mapA = new Map(a.map((p) => [p.pid, p]));
  const users = new Map<number, string>();

  const procs = b
    .map((p) => {
      const before = mapA.get(p.pid);
      const delta = before ? p.utime + p.stime - (before.utime + before.stime) : 0;
      const cpuPct = (delta / HZ / dTotal) * 100;
      if (!users.has(p.uid)) users.set(p.uid, uidToUser(p.uid));
      return {
        pid: p.pid,
        name: p.name,
        user: users.get(p.uid) || String(p.uid),
        state: p.state,
        cpuPct: Math.round(cpuPct * 10) / 10,
        memMb: Math.round((p.rssBytes / 1048576) * 10) / 10,
        cmdline: p.cmdline || p.name,
      };
    })
    .sort((x, y) => y.cpuPct - x.cpuPct || y.memMb - x.memMb)
    .slice(0, 80);

  return Response.json({ procs, total: b.length, timestamp: Date.now() });
}

function readCpuTotal() {
  try {
    const line = fs
      .readFileSync("/proc/stat", "utf8")
      .split("\n")
      .find((l) => l.startsWith("cpu "));
    if (!line) return { idle: 0, total: 1 };
    const parts = line.split(/\s+/).slice(1).map(Number);
    return {
      idle: (parts[3] || 0) + (parts[4] || 0),
      total: parts.reduce((x, y) => x + (y || 0), 0),
    };
  } catch {
    return { idle: 0, total: 1 };
  }
}
