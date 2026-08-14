import { NextRequest } from "next/server";
import { authorizeAction } from "@/lib/action-security";
import { audit } from "@/lib/audit";
import { installPythonDependencies, preparePythonProject, pythonLogs, pythonStart, pythonStatus, pythonStop } from "@/lib/python-ops";

export const dynamic = "force-dynamic";

function config(body: any) {
  const port = Number(body.port || 8000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Object.assign(new Error("Python app port must be between 1024 and 65535"), { status: 400 });
  return {
    name: String(body.name || ""), path: String(body.path || ""), version: String(body.version || "3.12"),
    framework: String(body.framework || "Flask"), port, mode: String(body.mode || "gunicorn"),
    entrypoint: body.entrypoint ? String(body.entrypoint) : undefined,
    workers: Number(body.workers || 2), user: body.user ? String(body.user) : "www-data",
    env: body.env && typeof body.env === "object" ? body.env : {},
  };
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  const op = String(body.op || "");
  try {
    const auth = authorizeAction(req, `python.${op}`);
    const c = config(body);
    let result: any;
    if (op === "prepare") result = await preparePythonProject(c);
    else if (op === "deps") result = { packages: await installPythonDependencies(c) };
    else if (op === "start" || op === "restart") result = { status: await pythonStart(c) };
    else if (op === "stop") result = { status: await pythonStop(c.name) };
    else if (op === "status") result = { status: await pythonStatus(c.name) };
    else if (op === "logs") result = { logs: await pythonLogs(c.name, body.lines) };
    else return Response.json({ ok: false, message: "Unknown Python operation" }, { status: 400 });
    await audit(`python.${op}`, c.name, `${c.path}:${c.port}`, auth.user);
    return Response.json({ ok: true, ...result });
  } catch (e: any) {
    return Response.json({ ok: false, message: String(e?.message || "Python operation failed") }, { status: Number(e?.status) || 500 });
  }
}
