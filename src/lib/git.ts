// Real Git operations executed on the server (clone / pull / branches / log).
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface GitCommit {
  sha: string;
  author: string;
  date: string;
  msg: string;
}

export interface RepoInfo {
  cloned: boolean;
  branch: string;
  remote: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  lastCommit: GitCommit | null;
  log: GitCommit[];
}

function runGit(
  cwd: string,
  args: string[],
  timeoutMs = 90000
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["-C", cwd, ...args],
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
          GIT_ASKPASS: "echo",
          LANG: "C",
        },
      },
      (err, stdout, stderr) => {
        if (err) {
          const detail = (stderr || err.message || "git command failed")
            .toString()
            .trim()
            .split("\n")
            .slice(-3)
            .join(" · ");
          reject(new Error(detail.slice(0, 300)));
        } else {
          resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
        }
      }
    );
  });
}

function parseLog(raw: string): GitCommit[] {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, author, date, ...msg] = line.split("\x1f");
      return { sha: sha.slice(0, 8), author, date, msg: msg.join("\x1f").slice(0, 120) };
    });
}

// Resolve the on-disk repository directory for a site.
// Prefers the configured docroot; falls back to a writable temp location
// when the docroot path cannot be created (read-only sandboxes, etc.).
export function resolveRepoDir(rootPath: string): string {
  const dir =
    rootPath && rootPath.startsWith("/")
      ? rootPath
      : `/www/wwwroot/${rootPath || "app"}`;
  if (dir === "/") return "/tmp/servoman-sites/app";
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const fallback = path.join("/tmp/servoman-sites", path.basename(dir) || "app");
    try {
      fs.mkdirSync(fallback, { recursive: true });
    } catch {
      /* last resort */
    }
    return fallback;
  }
}

export async function gitInfo(dir: string): Promise<RepoInfo> {
  const empty: RepoInfo = {
    cloned: false,
    branch: "",
    remote: "",
    dirty: false,
    ahead: 0,
    behind: 0,
    lastCommit: null,
    log: [],
  };
  if (!fs.existsSync(path.join(dir, ".git"))) return empty;
  try {
    const [branch, remote, status, log] = await Promise.all([
      runGit(dir, ["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => ({ stdout: "", stderr: "" })),
      runGit(dir, ["remote", "get-url", "origin"]).catch(() => ({ stdout: "", stderr: "" })),
      runGit(dir, ["status", "--porcelain=v1"]).catch(() => ({ stdout: "", stderr: "" })),
      runGit(dir, ["log", "-12", "--pretty=format:%H\x1f%an\x1f%ad\x1f%s", "--date=short"]).catch(() => ({ stdout: "", stderr: "" })),
    ]);
    const commits = parseLog(log.stdout);
    let ahead = 0;
    let behind = 0;
    const b = branch.stdout.trim() || "main";
    try {
      const counts = await runGit(dir, ["rev-list", "--left-right", "--count", `origin/${b}...HEAD`]);
      const parts = counts.stdout.trim().split(/\s+/).map(Number);
      behind = parts[0] || 0;
      ahead = parts[1] || 0;
    } catch {
      /* remote not fetched yet */
    }
    return {
      cloned: true,
      branch: b,
      remote: remote.stdout.trim(),
      dirty: status.stdout.trim().length > 0,
      ahead,
      behind,
      lastCommit: commits[0] || null,
      log: commits,
    };
  } catch {
    return empty;
  }
}

export async function cloneRepo(url: string, branch: string, dir: string): Promise<string> {
  if (!dir.startsWith("/") || dir === "/") throw new Error("Invalid target directory");
  if (fs.existsSync(path.join(dir, ".git"))) {
    return "Repository already cloned — pulling latest instead.";
  }
  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
    throw new Error(`Target directory ${dir} is not empty — move or clean it first`);
  }
  fs.mkdirSync(dir, { recursive: true });
  const parent = path.dirname(dir);
  const target = path.basename(dir);
  const res = await runGit(parent, ["clone", "-b", branch, "--depth", "1", "--quiet", url, target], 180000);
  return (res.stdout || res.stderr || "cloned").trim().split("\n").pop() || "Repository cloned";
}

export async function pullRepo(dir: string, branch: string): Promise<string> {
  if (!fs.existsSync(path.join(dir, ".git"))) throw new Error("Not a git repository — clone it first");
  await runGit(dir, ["fetch", "--depth", "1", "origin", branch]);
  await runGit(dir, ["reset", "--hard", `FETCH_HEAD`]);
  const log = await runGit(dir, ["log", "-1", "--pretty=format:%h %s"]);
  return `Pulled ${branch} → ${log.stdout.trim()}`;
}

export async function listRemoteBranches(url: string): Promise<string[]> {
  const res = await runGit(".", ["ls-remote", "--heads", url], 30000);
  return res.stdout
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t").pop()!.replace(/^refs\/heads\//, ""))
    .filter((b, i, arr) => arr.indexOf(b) === i);
}
