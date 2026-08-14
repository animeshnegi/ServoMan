"use client";

import { useEffect, useRef, useState } from "react";
import { Card, PageHeader } from "@/components/panel/ui";
import { TerminalSquare, Circle } from "lucide-react";

interface TermEntry {
  type: "cmd" | "out" | "err" | "info";
  text: string;
}

const HELP = `SERVOMAN web terminal — connected to the live server shell.

Supported:
  ls, pwd, cat, head, tail, du, df, free, uptime, ps, whoami,
  echo, date, nginx -t, git status, node -v, python3 -V, curl …
  cd <dir>        change directory (handled by the panel)
  clear           clear the screen
  help            this message

Notes: interactive programs (top, vim, htop) are not available;
commands time out after 15 seconds. Destructive commands are blocked.`;

export default function TerminalPage() {
  const [cwd, setCwd] = useState("/");
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<TermEntry[]>([
    { type: "info", text: "UbuntuDeck shell — type `help` to get started.\n" },
  ]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [host, setHost] = useState("server");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => setHost(d.info?.hostname || "server"))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const verifyDir = async (p: string) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`);
      const data = await res.json();
      return !data.error;
    } catch {
      return false;
    }
  };

  const run = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setHistory((h) => [...h, raw]);
    setHistIdx(-1);
    setEntries((e) => [...e, { type: "cmd", text: `${cwd} $ ${cmd}\n` }]);

    if (cmd === "clear") {
      setEntries([]);
      return;
    }
    if (cmd === "help") {
      setEntries((e) => [...e, { type: "info", text: HELP + "\n" }]);
      return;
    }
    if (cmd.startsWith("cd ")) {
      const target = cmd.slice(3).trim().replace(/^~/, "/root");
      const next = target.startsWith("/") ? target : `${cwd === "/" ? "" : cwd}/${target}`;
      const norm = normalize(next);
      if (await verifyDir(norm)) {
        setCwd(norm);
      } else {
        setEntries((e) => [...e, { type: "err", text: `bash: cd: ${target}: No such file or directory\n` }]);
      }
      return;
    }
    if (cmd === "pwd") {
      setEntries((e) => [...e, { type: "out", text: cwd + "\n" }]);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, cwd }),
      });
      const data = await res.json();
      if (data.error) {
        setEntries((e) => [...e, { type: "err", text: data.error + "\n" }]);
      } else {
        const out = (data.stdout || "") + (data.stderr ? data.stderr : "");
        if (out) setEntries((e) => [...e, { type: data.stderr ? "err" : "out", text: out + (out.endsWith("\n") ? "" : "\n") }]);
      }
    } catch {
      setEntries((e) => [...e, { type: "err", text: "connection to shell lost\n" }]);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !busy) {
      const v = input;
      setInput("");
      run(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      if (history[idx] !== undefined) {
        setHistIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx >= 0) {
        const idx = histIdx + 1;
        setHistIdx(idx);
        setInput(history[idx] ?? "");
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Terminal"
        subtitle="A real shell on this server. Run diagnostics, inspect logs, test commands — right from the browser."
      />
      <Card pad={false}>
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
          <Circle size={10} className="fill-rose-400 text-rose-400" />
          <Circle size={10} className="fill-amber-400 text-amber-400" />
          <Circle size={10} className="fill-emerald-400 text-emerald-400" />
          <span className="ml-3 flex items-center gap-2 font-mono text-xs text-zinc-500">
            <TerminalSquare size={13} className="text-zinc-600" />
            www@{host}: bash — {cwd}
          </span>
        </div>
        <div
          className="h-[52vh] overflow-y-auto bg-black/50 p-4 font-mono text-[12.5px] leading-relaxed"
          onClick={() => inputRef.current?.focus()}
        >
          {entries.map((en, i) => (
            <pre
              key={i}
              className={
                en.type === "cmd"
                  ? "mt-1 whitespace-pre-wrap text-zinc-100"
                  : en.type === "err"
                    ? "whitespace-pre-wrap text-rose-400"
                    : en.type === "info"
                      ? "whitespace-pre-wrap text-sky-400"
                      : "whitespace-pre-wrap text-zinc-300"
              }
            >
              {en.text}
            </pre>
          ))}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-emerald-400">www@{host}</span>
            <span className="shrink-0 text-sky-400">{cwd}</span>
            <span className="text-zinc-500">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-zinc-100 caret-emerald-400 outline-none placeholder:text-zinc-700"
              placeholder={busy ? "running…" : "type a command"}
            />
          </div>
          <div ref={bottomRef} />
        </div>
      </Card>
    </div>
  );
}

function normalize(p: string) {
  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.join("/");
}
