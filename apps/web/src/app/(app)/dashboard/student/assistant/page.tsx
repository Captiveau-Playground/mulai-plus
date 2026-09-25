"use client";

import { useChat } from "@ai-sdk/react";
import { env } from "@mulai-plus/env/web";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "@/components/ui/loader-circle";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { notify } from "@/lib/toast";
import type { UserContext } from "./types";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

const TIERS = [
  { id: "simple", name: "⚡ Simple" },
  { id: "smart", name: "🧠 Advanced" },
  { id: "premium", name: "★ Premium" },
];

const QUICK = [
  "Cari universitas negeri di Jawa Timur",
  "Berapa passing grade kedokteran di UI?",
  "Rekomendasi jurusan sesuai minatku",
  "Info program mentoring MULAI+",
];

export default function AssistantPage() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [showCtx, setShowCtx] = useState(true);
  const [text, setText] = useState("");
  const [model, setModel] = useState("smart");
  const modelRef = useRef(model);
  modelRef.current = model;
  const chatRef = useRef<any>(null);
  const [convoKey, setConvoKey] = useState(0);

  const chat = useChat({
    transport: new DefaultChatTransport({
      api: `${AI_BASE}/ai/chat/stream`,
      headers: { "x-session-id": "ast" },
    }),
    onError: (err: unknown) => {
      if (err instanceof Error) notify.error(`Gagal kirim: ${err.message}`);
    },
  } as any);
  chatRef.current = chat;

  const messages = (chat as any).messages ?? [];
  const status = (chat as any).status;
  const busy = status === "submitted" || status === "streaming";

  const handleSubmit = (message: { text?: string; files?: File[] }) => {
    const hasText = Boolean(message.text?.trim());
    const hasFiles = Boolean(message.files?.length);
    if (!hasText && !hasFiles) return;
    (chatRef.current as any)?.sendMessage(
      { text: message.text?.trim() || "Sent with attachment(s)", files: message.files },
      { body: { model: modelRef.current } },
    );
    setText("");
  };

  useEffect(() => {
    void fetch(`${AI_BASE}/ai/context`, { headers: { "x-session-id": "ast" } })
      .then((r) => r.json())
      .then((d) => setCtx((d as any).profile ?? null))
      .catch(() => setCtx(null));
  }, []);

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-[1180px] flex-col gap-3 px-0 pt-0 sm:px-3">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-brand-navy/10 font-manrope text-brand-navy text-xs">
            AI
          </span>
          <h1 className="font-bold font-bricolage text-brand-navy text-sm">Asisten MULAI+</h1>
          {busy && <LoaderCircle className="size-4 text-brand-orange" />}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!showCtx && (
            <button
              type="button"
              onClick={() => setShowCtx(true)}
              className="text-[11px] text-text-muted-custom hover:text-brand-navy"
            >
              + konteks
            </button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              (chat as any).setMessages?.([]);
              setConvoKey((k) => k + 1);
            }}
            className="rounded-full px-3 text-xs"
          >
            + Chat baru
          </Button>
        </div>
      </header>

      {/* Percakapan (Conversation dari AI Elements) */}
      <Conversation key={convoKey} className="rounded-2xl border border-gray-200 bg-white">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="mx-auto max-w-xl px-4 pt-10">
              <p className="font-manrope text-sm text-text-muted-custom">
                Halo! 👋 Tanya apa saja — jawaban dipersonalisasi: {ctx?.school || "sekolah belum terisi"} ·{" "}
                {ctx?.riasecPrimary ? `minat ${ctx.riasecPrimary}` : "tes minat belum ada"}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() =>
                      (chatRef.current as any)?.sendMessage({ text: q }, { body: { model: modelRef.current } })
                    }
                    className="rounded-full border border-brand-navy/10 bg-brand-navy/5 px-3 py-1.5 font-manrope text-brand-navy text-xs transition-colors hover:bg-brand-navy/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 font-manrope text-sm leading-relaxed ${
                  m.role === "user" ? "bg-brand-navy text-white" : "border border-gray-200 bg-gray-50 text-gray-900"
                }`}
              >
                {m.role === "user" ? (
                  <span>
                    {(m as any).content ??
                      ((m.parts ?? [])
                        .map((p: any) => ((p.kind ?? p.type) === "text" ? (p.text ?? "") : ""))
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
                        const done = (ti.state ?? "call") === "result";
                        return (
                          <div
                            key={i}
                            className="mb-1.5 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-brand-navy/5 px-2 py-1 font-mono text-[10px] text-brand-navy"
                          >
                            🔧 {ti.toolName ?? ti.name ?? "tool"} {done ? "✓" : "…"}
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
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Konteks + composer */}
      <div className="flex flex-col gap-1.5">
        {showCtx && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => setShowCtx(false)}
              className="rounded-full bg-brand-navy/5 px-2 py-1 font-manrope text-[10px] text-brand-navy hover:bg-brand-navy/10"
            >
              {ctx?.school ? `🏫 ${ctx.school}` : "🏫 sekolah?"} ·{" "}
              {ctx?.riasecPrimary ? `🧭 ${ctx.riasecPrimary}` : "🧭 tes minat?"} ✕
            </button>
            {model === "premium" && (
              <span className="rounded-full bg-brand-orange/10 px-2 py-1 font-manrope text-[10px] text-brand-orange">
                kuota premium 5/hari
              </span>
            )}
          </div>
        )}

        <PromptInput onSubmit={handleSubmit as any} multiple className="rounded-2xl border border-gray-200 bg-white">
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tanyakan apa saja… (Enter kirim, Shift+Enter baris baru)"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputSelect value={model} onValueChange={setModel}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {TIERS.map((t) => (
                    <PromptInputSelectItem key={t.id} value={t.id}>
                      {t.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
