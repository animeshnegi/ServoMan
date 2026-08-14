// Real shell executor for the web terminal.
import { exec } from "child_process";

export const dynamic = "force-dynamic";

const BLOCKLIST = /(?:^|;|\|\||&&|\n)\s*(rm\s+-rf\s+\/|mkfs|dd\s+if=|> \/dev\/sd)/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cmd = String(body.cmd || "").trim();
    const cwd = String(body.cwd || "/");
    if (!cmd || cmd.length > 2000) {
      return Response.json({ error: "Invalid command" }, { status: 400 });
    }
    if (BLOCKLIST.test(cmd)) {
      return Response.json({
        stdout: "",
        stderr: "ubuntu-deck: destructive command blocked by safety policy\r\n",
        code: 1,
      });
    }
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      exec(cmd, { cwd, timeout: 15000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, TERM: "xterm-256color", FORCE_COLOR: "1" } }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout || "",
          stderr: stderr || (error?.killed ? "\r\n[command timed out after 15s]\r\n" : ""),
          code: error ? (typeof error.code === "number" ? error.code : 1) : 0,
        });
      });
    });
    return Response.json({
      ...result,
      stdout: stripAnsi(result.stdout),
      stderr: stripAnsi(result.stderr),
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Execution failed" }, { status: 500 });
  }
}

function stripAnsi(s: string) {
  return s
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\x1B\][^\x07]*\x07/g, "")
    .replace(/\x1B[()][A-Z0-9]/g, "");
}
