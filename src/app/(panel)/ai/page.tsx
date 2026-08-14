"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Markdown, PageHeader, Spinner } from "@/components/panel/ui";
import { Sparkles, Send, Bot, User, Cpu } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  engine?: string;
}

const SUGGESTIONS = [
  "Is anything wrong with my server?",
  "Which certificates are expiring soon?",
  "When was the last backup?",
  "How much RAM is left?",
  "Run a security review",
  "nginx reload command",
];

export default function AiPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm **SERVOMAN AI** — your operations assistant. I read live metrics and panel data in real time, so I can answer questions about **SSL, backups, email sending domains, security, performance, memory, disk** and more. Type **help** to see what I can do.",
      engine: "local",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...msgs.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: q }],
        }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply || "Hmm, I couldn't process that.", engine: data.engine }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "The AI engine is unreachable right now." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Assistant"
        subtitle="A cPanel/aaPanel-first: ask questions about your server in plain language. Uses OpenAI when OPENAI_API_KEY is set, otherwise a built-in ops engine."
      />

      <Card pad={false} className="overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-gradient-to-r from-sky-500/10 to-transparent px-5 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500">
            <Bot size={15} className="text-white" />
          </div>
          <div className="text-sm font-semibold text-zinc-100">SERVOMAN AI</div>
          <span className="ml-2 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live server context
          </span>
        </div>

        <div className="max-h-[52vh] space-y-5 overflow-y-auto p-5">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  m.role === "user" ? "bg-zinc-700" : "bg-gradient-to-br from-sky-500 to-violet-500"
                }`}
              >
                {m.role === "user" ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-white" />}
              </div>
              <div
                className={`max-w-[78%] rounded-xl border px-4 py-3 ${
                  m.role === "user"
                    ? "border-sky-500/25 bg-sky-500/10"
                    : "border-white/[0.07] bg-white/[0.03]"
                }`}
              >
                <Markdown text={m.content} />
                {m.role === "assistant" && m.engine && (
                  <div className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-wider text-zinc-600">
                    <Cpu size={10} /> {m.engine === "openai" ? "openai" : "ops engine"}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Spinner size={14} /> analyzing live server state…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-sky-500/40 hover:text-sky-300"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about SSL, backups, security, performance…"
              className="flex-1 rounded-lg border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-sky-500/60"
            />
            <button
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-900/30 transition hover:from-sky-400 disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
