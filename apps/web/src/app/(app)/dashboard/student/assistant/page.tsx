"use client";

import { useChat } from "@ai-sdk/react";
import { env } from "@mulai-plus/env/web";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "@/components/ui/loader-circle";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import type { UserContext } from "./types";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

const QUICK = [
  "Cari universitas negeri di Jawa Timur",
  "Berapa passing grade kedokteran di UI?",
  "Rekomendasi jurusan sesuai minatku",
  "Info program mentoring MULAI+",
];

export default function AssistantPage() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [showCtx, setShowCtx] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useChat({
    url: `${AI_BASE}/ai/chat/stream`,
    headers: { "x-session-id": "ast" },
  } as any);

  useEffect(() => {
    fetch(`${AI_BASE}/ai/context`, { headers: { "x-session-id": "ast" }, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCtx(d.profile ?? null))
      .catch(() => setCtx(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const busy = chat.status === "submitted" || chat.status === "streaming";

  function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    (chat as any).sendMessage({ text: msg });
  }
  const [input, setInput] = useState("");

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-[1200px] gap-4 px-0 py-0 sm:px-3">
      {/* Panel konteks (desktop) */}
      {showCtx && (
        <aside className="hidden w-64 shrink-0 xl:block">
          <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setShowCtx(false)}
              className="ml-auto text-text-muted-custom/50 transition-colors hover:text-brand-navy"
            >
              ✕
            </button>
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
            <p className="mt-4 border-gray-100 border-t pt-2 font-manrope text-[10px] text-text-muted-custom/60">
              Diperkaya dari profil, tes, & riwayat. Lihat Kebijakan Privasi.
            </p>
          </div>
        </aside>
      )}

      {/* Chat utama */}
      <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Header tipis */}
        <header className="flex items-center justify-between border-gray-100 border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-brand-navy/10 font-manrope text-brand-navy text-xs">
              AI
            </span>
            <h1 className="font-bold font-bricolage text-brand-navy text-sm">Asisten MULAI+</h1>
            {busy && <LoaderCircle className="size-4 text-brand-orange" />}
          </div>
          <div className="flex items-center gap-2">
            {!showCtx && (
              <button
                type="button"
                onClick={() => setShowCtx(true)}
                className="rounded-full bg-brand-navy/5 px-3 py-1 font-manrope text-[11px] text-brand-navy hover:bg-brand-navy/10"
              >
                Konteks
              </button>
            )}
            {busy && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => chat.stop?.()}
                className="rounded-full px-3 text-xs"
              >
                Stop
              </Button>
            )}
          </div>
        </header>

        {/* Scroll di dalam chat */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {((chat.messages as any[]) ?? []).length === 0 && (
            <div className="mx-auto max-w-xl pt-6">
              <p className="font-manrope text-sm text-text-muted-custom">
                Halo! 👋 Tanya apa saja — jawaban dipersonalisasi untuk kamu:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-brand-navy/10 bg-brand-navy/5 px-3 py-1.5 font-manrope text-brand-navy text-xs transition-colors hover:bg-brand-navy/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(chat.messages as any[]).map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-3 font-manrope text-sm leading-relaxed ${
                  m.role === "user" ? "bg-brand-navy text-white" : "border border-gray-200 bg-gray-50"
                }`}
              >
                {m.role === "user" ? (
                  <span>
                    {(m as any).content ??
                      ((m.parts ?? [])
                        .map((p: any, _i: number) => ((p.kind ?? p.type) === "text" ? (p.text ?? "") : ""))
                        .join("") ||
                        "…")}
                  </span>
                ) : (
                  <>
                    {(m.parts ?? []).map((p: any, i: number) => {
                      const kind = p.kind ?? p.type;
                      if (kind === "text") return <MarkdownRenderer key={i}>{p.text ?? ""}</MarkdownRenderer>;
                      if (kind === "tool-invocation" || kind === "tool") {
                        const ti = p.toolInvocation ?? p;
                        return (
                          <div
                            key={i}
                            className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-navy/5 px-2 py-1 font-mono text-[10px] text-brand-navy"
                          >
                            🔧 {ti.toolName ?? ti.name ?? "tool"}{" "}
                            {ti.state === "result" ? "✓" : ti.state === "call" ? "…" : ""}
                          </div>
                        );
                      }
                      return null;
                    })}
                    {(m.parts ?? []).length === 0 && busy && (
                      <span className="text-text-muted-custom/50 italic">memikirkan…</span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {(chat.messages as any[]).length === 0 && (
            <p className="pt-4 text-center font-manrope text-text-muted-custom/50 text-xs">
              Streaming via AI SDK · konteks dipersonalisasi
            </p>
          )}
        </div>

        {/* Input pinned */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-gray-100 border-t p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Tanyakan apa saja… (Enter kirim, Shift+Enter baris baru)"
            className="max-h-40 min-h-[46px] flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 font-manrope text-sm outline-none focus:border-brand-orange/50"
          />
          {busy ? (
            <Button
              type="button"
              onClick={() => chat.stop?.()}
              variant="outline"
              className="h-[46px] rounded-xl px-4 font-manrope text-sm"
            >
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-[46px] rounded-xl px-6 font-manrope font-semibold"
            >
              Kirim ↑
            </Button>
          )}
        </form>
      </section>
    </div>
  );
}
