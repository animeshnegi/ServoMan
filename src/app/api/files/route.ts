// File manager API — real filesystem access to the server.
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const MAX_READ = 1024 * 1024;
const MAX_UPLOAD = 8 * 1024 * 1024;

function safePath(p: string): string {
  const resolved = path.resolve("/", p || "/");
  if (!resolved.startsWith("/")) throw new Error("Invalid path");
  return resolved;
}

function modeString(mode: number): string {
  const t = (mode & 0o170000) === 0o40000 ? "d" : (mode & 0o120000) === 0o120000 ? "l" : "-";
  const rwx = ["r", "w", "x", "r", "w", "x", "r", "w", "x"].map((c, i) =>
    mode & (0o400 >> i) ? c : "-"
  );
  return t + rwx.join("");
}

function mimeOf(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".txt": "text/plain",
    ".log": "text/plain",
    ".md": "text/markdown",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".php": "text/plain",
    ".yml": "text/plain",
    ".yaml": "text/plain",
    ".xml": "text/xml",
    ".conf": "text/plain",
    ".env": "text/plain",
    ".sql": "text/plain",
    ".sh": "text/plain",
  };
  return map[ext] || "application/octet-stream";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const p = url.searchParams.get("path") || "/";
  const op = url.searchParams.get("op") || "list";
  try {
    const target = safePath(p);
    const st = fs.statSync(target);
    if (op === "read") {
      if (st.size > MAX_READ) {
        return Response.json({ error: "File too large to preview (max 1 MB)" }, { status: 413 });
      }
      const buf = fs.readFileSync(target);
      if (buf.includes(0)) {
        return Response.json({ error: "Binary file cannot be previewed" }, { status: 415 });
      }
      return Response.json({ content: buf.toString("utf8"), size: st.size, mtime: st.mtimeMs });
    }
    if (op === "raw") {
      const buf = fs.readFileSync(target);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": mimeOf(target),
          "Content-Disposition": `inline; filename="${path.basename(target)}"`,
        },
      });
    }
    if (st.isDirectory()) {
      const entries = fs.readdirSync(target, { withFileTypes: true });
      const items = entries.map((e) => {
        const full = path.join(target, e.name);
        let st2: fs.Stats | null = null;
        try {
          st2 = fs.statSync(full);
        } catch {
          st2 = null;
        }
        return {
          name: e.name,
          dir: e.isDirectory(),
          symlink: e.isSymbolicLink(),
          size: st2?.size ?? 0,
          mode: st2 ? modeString(st2.mode) : "---------",
          mtime: st2?.mtimeMs ?? 0,
        };
      });
      items.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
      return Response.json({ path: target, entries: items });
    }
    return Response.json({ error: "Not a directory" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Path not found" }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const op = body.op;
    switch (op) {
      case "mkdir": {
        fs.mkdirSync(safePath(body.path), { recursive: true });
        return Response.json({ ok: true });
      }
      case "write": {
        const target = safePath(body.path);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, String(body.content || ""));
        return Response.json({ ok: true });
      }
      case "rename": {
        fs.renameSync(safePath(body.path), safePath(body.to));
        return Response.json({ ok: true });
      }
      case "delete": {
        const target = safePath(body.path);
        if (target === "/") throw new Error("Refusing to delete /");
        fs.rmSync(target, { recursive: true, force: true });
        return Response.json({ ok: true });
      }
      case "chmod": {
        const mode = parseInt(String(body.mode || "755"), 8);
        if (Number.isNaN(mode)) throw new Error("Invalid mode");
        fs.chmodSync(safePath(body.path), mode);
        return Response.json({ ok: true });
      }
      case "upload": {
        if (!body.data) throw new Error("No data");
        const buf = Buffer.from(String(body.data), "base64");
        if (buf.length > MAX_UPLOAD) throw new Error("File too large (max 8 MB)");
        const target = safePath(path.join(body.path || "/", body.name));
        fs.writeFileSync(target, buf);
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "Unknown operation" }, { status: 400 });
    }
  } catch (e: any) {
    return Response.json({ error: e?.message || "Operation failed" }, { status: 500 });
  }
}
