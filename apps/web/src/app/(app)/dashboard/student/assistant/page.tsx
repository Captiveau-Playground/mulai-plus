"use client";

import { env } from "@mulai-plus/env/web";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { notify } from "@/lib/toast";
import type { UserContext } from "./types";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: { id: string; toolName: string; state: string }[];
};

const QUICK = [
  "Cari universitas negeri di Jawa Timur",
  "Berapa passing grade kedokteran di UI?",
  "Rekomendasi jurusan sesuai minatku",
  "Info program mentoring MULAI+",
];

export default function AssistantPage() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${AI_BASE}/ai/context`, { headers: { "x-session-id": "ctx" }, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCtx(d.profile ?? null))
      .catch(() => setCtx(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || streaming) return;
    setInput("");
    const id = `a-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", text: msg, tools: [] },
      { id, role: "assistant", text: "", tools: [] },
    ]);
    setStreaming(true);
    try {
      const res = await fetch(`${AI_BASE}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": "ast" },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      const upd = (fn: (m: Msg) => Msg) => setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          let j: any;
          try {
            j = JSON.parse(s.slice(5).trim());
          } catch {
            continue;
          }
          if (j.type === "text-delta") upd((m) => ({ ...m, text: m.text + (j.delta ?? "") }));
          if (j.type === "tool-call-start")
            upd((m) => ({ ...m, tools: [...m.tools, { id: j.toolCallId, toolName: j.toolName, state: "call" }] }));
          if (j.type === "tool-call-end")
            upd((m) => ({ ...m, tools: m.tools.map((t) => (t.id === j.toolCallId ? { ...t, state: "result" } : t)) }));
          if (j.type === "error") throw new Error(j.error ?? "stream error");
        }
      }
    } catch (e) {
      notify.error("Asisten gagal", { description: e instanceof Error ? e.message : "Coba lagi" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 lg:flex-row">
      {/* Konteks siswa */}
      <aside className="shrink-0 lg:w-72">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="font-bold font-bricolage text-brand-navy text-sm">Konteks Kamu</h2>
          <ul className="mt-3 space-y-2 font-manrope text-text-main/80 text-xs">
            <li>🧑‍🎓 {ctx?.school ?? "Sekolah belum terisi"}</li>
            <li>📚 {ctx?.level ?? "Jenjang belum terisi"}</li>
            <li>🧭 {ctx?.riasecPrimary ? `Minat utama: ${ctx.riasecPrimary}` : "Hasil tes minat belum ada"}</li>
            {ctx?.goals?.length ? <li>🎯 {ctx.goals.slice(0, 3).join(", ")}</li> : null}
            {ctx?.prefs && Array.isArray(ctx.prefs.targetMajor) ? (
              <li>⭐ {(ctx.prefs.targetMajor as string[]).slice(0, 4).join(", ")}</li>
            ) : null}
            {ctx?.applications?.length ? <li>📌 Program aktif: {ctx.applications.length}</li> : null}
          </ul>
          <p className="mt-3 border-gray-100 border-t pt-2 font-manrope text-[10px] text-text-muted-custom/60">
            Profil memperkaya rekomendasi & jawaban. Data kelola kami; lihat Kebijakan Privasi.
          </p>
        </div>
      </aside>

      {/* Chat */}
      <section className="flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-gray-100 border-b px-4 py-3">
          <div>
            <h1 className="font-bold font-bricolage text-brand-navy text-lg">Asisten MULAI+</h1>
            <p className="font-manrope text-text-muted-custom text-xs">Tanya apa saja — dipersonalisasi untuk kamu.</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="font-manrope text-sm text-text-muted-custom">Coba salah satu:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="rounded-full border border-brand-navy/10 bg-brand-navy/5 px-3 py-1.5 font-manrope text-brand-navy text-xs transition-colors hover:bg-brand-navy/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-3 font-manrope text-sm leading-relaxed ${
                  m.role === "user" ? "bg-brand-navy text-white" : "border border-gray-200 bg-gray-50"
                }`}
              >
                {m.role === "assistant" ? (
                  <>
                    {m.text ? (
                      <MarkdownRenderer>{m.text}</MarkdownRenderer>
                    ) : streaming ? (
                      <span className="text-text-muted-custom/50 italic">memikirkan…</span>
                    ) : null}
                    {m.tools.map((t) => (
                      <div
                        key={t.id}
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-navy/5 px-2 py-1 font-mono text-[10px] text-brand-navy"
                      >
                        🔧 {t.toolName} {t.state === "result" ? "✓" : "…"}
                      </div>
                    ))}
                  </>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-gray-100 border-t p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya asisten…"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-manrope text-sm outline-none focus:border-brand-orange/50"
          />
          <Button type="submit" disabled={streaming} className="rounded-xl px-5 font-manrope font-semibold">
            {streaming ? "…" : "Kirim"}
          </Button>
        </form>
      </section>
    </div>
  );
}
