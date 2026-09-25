"use client";

import { env } from "@mulai-plus/env/web";
/**
 * TRIAL — Chatbot streaming (protokol parts) tanpa SDK.
 * Endpoint: POST {server}/ai/chat/stream (apps/server proxy → AI worker parts stream).
 * Membaca line `data: {...}` → text-part & tool-call-part → render.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

type Part =
  | { kind: "text"; id: string; delta: string }
  | { kind: "tool"; id: string; toolName: string; args: unknown; state: "call" | "result"; result?: unknown };

type Msg = { id: string; role: "user" | "assistant"; text: string; tools: Part[] };

export default function TrialChatPage() {
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setErr("");
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text, tools: [] };
    const asstMsg: Msg = { id: `a-${Date.now()}`, role: "assistant", text: "", tools: [] };
    setMessages((m) => [...m, userMsg, asstMsg]);
    setStreaming(true);

    try {
      const res = await fetch(`${AI_BASE}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const apply = (updater: (m: Msg) => Msg) =>
        setMessages((prev) => prev.map((m) => (m.id === asstMsg.id ? updater(m) : m)));

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const raw = s.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          let j: any;
          try {
            j = JSON.parse(raw);
          } catch {
            continue;
          }
          switch (j.type) {
            case "text-delta":
              apply((m) => ({ ...m, text: m.text + (j.delta ?? "") }));
              break;
            case "tool-call-start":
              apply((m) => ({
                ...m,
                tools: [
                  ...m.tools,
                  {
                    kind: "tool" as const,
                    id: j.toolCallId,
                    toolName: j.toolName,
                    args: j.args,
                    state: "call" as const,
                  },
                ],
              }));
              break;
            case "tool-call-end":
              apply((m) => ({
                ...m,
                tools: m.tools.map((t) =>
                  t.kind === "tool" && t.id === j.toolCallId ? { ...t, state: "result" as const, result: j.result } : t,
                ),
              }));
              break;
            case "error":
              setErr(String(j.error ?? "stream error"));
              break;
          }
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "stream error");
      setMessages((prev) => prev.filter((m) => m.id !== asstMsg.id));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <h1 className="font-bold font-bricolage text-2xl text-brand-navy">Trial — Chatbot Streaming (parts) 🔧</h1>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-manrope text-[10px] text-amber-700">
          trial · {sessionId.slice(-5)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
        {messages.length === 0 && (
          <p className="p-4 font-manrope text-sm text-text-muted-custom">
            Coba: <b>"universitas negeri di Bandung dengan akreditasi unggul, sebutkan 2"</b> → lihat <b>tool card</b> +{" "}
            <b>streaming teks</b>.
          </p>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 font-manrope text-sm leading-relaxed ${
                m.role === "user" ? "bg-brand-navy text-white" : "border border-gray-200 bg-white"
              }`}
            >
              {m.role === "assistant" ? (
                <>
                  {m.text ? (
                    <MarkdownRenderer>{m.text}</MarkdownRenderer>
                  ) : streaming ? (
                    <span className="text-text-muted-custom/50 italic">memikirkan…</span>
                  ) : null}
                  {m.tools.map((t) => {
                    if (t.kind !== "tool") return null;
                    return (
                      <div
                        key={t.id}
                        className="mt-2 rounded-xl border border-brand-navy/10 bg-brand-orange/[0.03] p-3"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-brand-navy/10 px-1.5 py-0.5 font-mono text-[10px] text-brand-navy">
                            🔧 {t.toolName}
                          </span>
                          {t.state === "call" ? (
                            <span className="animate-pulse text-[10px] text-text-muted-custom">mengambil data…</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600">✓ selesai</span>
                          )}
                        </div>
                        {t.state === "result" && (
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 font-mono text-[10px] text-gray-600">
                            {JSON.stringify(t.result, null, 1).slice(0, 1500)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="animate-pulse self-center font-manrope text-text-muted-custom text-xs">⚡ streaming…</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya MULAI+…"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-manrope text-sm outline-none focus:border-brand-orange/50"
        />
        <Button type="submit" disabled={streaming} className="rounded-xl px-5 font-manrope font-semibold">
          {streaming ? "…" : "Kirim"}
        </Button>
      </form>
      {err && <p className="font-manrope text-red-500 text-xs">Error: {err}</p>}
    </div>
  );
}
