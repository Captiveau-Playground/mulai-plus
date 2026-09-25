"use client";

/**
 * TRIAL — Chatbot dengan AI SDK (@ai-sdk/react) terhadap endpoint parts worker.
 * Endpoint: POST {server}/ai/chat/stream (apps/server proxy → AI worker, via service binding).
 * Only hit: text parts & tool-invocation parts (state call/result).
 */
import { useChat } from "@ai-sdk/react";
import { env } from "@mulai-plus/env/web";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

export default function TrialChatPage() {
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [input, setInput] = useState("");

  // v4+ useChat: { messages, sendMessage, status, stop, error } — tanpa input built-in
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: `${AI_BASE}/ai/chat/stream`,
      headers: { "x-session-id": sessionId },
    }),
  } as any);

  const send = () => {
    const text = input.trim();
    if (!text || chat.status === "submitted" || chat.status === "streaming") return;
    setInput("");
    (chat as any).sendMessage({ text });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <h1 className="font-bold font-bricolage text-2xl text-brand-navy">Trial — Chatbot AI SDK@react 🔧</h1>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-manrope text-[10px] text-amber-700">
          trial · {sessionId.slice(-5)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
        {((chat.messages as any[]) ?? []).length === 0 && (
          <p className="p-4 font-manrope text-sm text-text-muted-custom">
            Coba: <b>"universitas negeri di Bandung, sebutkan 2"</b> → lihat <b>tool card</b> + <b>streaming teks</b>.
          </p>
        )}

        {(chat.messages as any[]).map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 font-manrope text-sm leading-relaxed ${
                m.role === "user" ? "bg-brand-navy text-white" : "border border-gray-200 bg-white"
              }`}
            >
              {m.role === "user" ? (
                (m.text ?? m.content ?? "")
              ) : (
                <>
                  {/* parts: text + tool invocation */}
                  {(m.parts ?? []).map((p: any, i: number) => {
                    const kind = p.kind ?? p.type;
                    if (kind === "text") {
                      return <MarkdownRenderer key={i}>{p.text ?? ""}</MarkdownRenderer>;
                    }
                    if (kind === "tool-invocation" || kind === "tool") {
                      const ti = p.toolInvocation ?? p.toolInvocation ?? p;
                      return (
                        <div key={i} className="mt-2 rounded-xl border border-brand-navy/10 bg-brand-orange/[0.03] p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-brand-navy/10 px-1.5 py-0.5 font-mono text-[10px] text-brand-navy">
                              🔧 {ti.toolName ?? ti.name ?? "tool"}
                            </span>
                            {ti.state === "call" || ti.state === "streaming" || ti.state === "partial-call" ? (
                              <span className="animate-pulse text-[10px] text-text-muted-custom">mengambil data…</span>
                            ) : ti.state === "result" ? (
                              <span className="text-[10px] text-emerald-600">✓ selesai</span>
                            ) : null}
                          </div>
                          {ti.state === "result" && ti.result && (
                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 font-mono text-[10px] text-gray-600">
                              {JSON.stringify(ti.result, null, 1).slice(0, 1500)}
                            </pre>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                  {(m.parts ?? []).length === 0 && (chat.status === "submitted" || chat.status === "streaming") && (
                    <span className="text-text-muted-custom/50 italic">memikirkan…</span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {(chat.status === "submitted" || chat.status === "streaming") && (
          <div className="animate-pulse self-center font-manrope text-text-muted-custom text-xs">⚡ streaming…</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya MULAI+…"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-manrope text-sm outline-none focus:border-brand-orange/50"
        />
        <Button
          type="submit"
          disabled={chat.status === "submitted" || chat.status === "streaming"}
          className="rounded-xl px-5 font-manrope font-semibold"
        >
          {chat.status === "submitted" || chat.status === "streaming" ? "…" : "Kirim"}
        </Button>
        {(chat.status === "submitted" || chat.status === "streaming") && (
          <Button type="button" variant="outline" onClick={() => chat.stop?.()} className="rounded-xl px-3 text-xs">
            Stop
          </Button>
        )}
      </form>
      {chat.error && <p className="font-manrope text-red-500 text-xs">Error: {chat.error.message}</p>}
    </div>
  );
}
