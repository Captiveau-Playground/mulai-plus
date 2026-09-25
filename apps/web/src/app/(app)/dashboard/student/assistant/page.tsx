"use client";

import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { env } from "@mulai-plus/env/web";
import { DefaultChatTransport } from "ai";
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

function toPart(m: any): any {
  const kind = (m as any)?.kind ?? (m as any)?.type;
  if (kind === "text") return { type: "text", text: (m as any).text ?? "" };
  if (kind === "tool-invocation" || kind === "tool") {
    const ti = (m as any).toolInvocation ?? m;
    const running = (ti.state ?? "call") !== "result";
    return {
      type: "tool",
      toolCallId: ti.toolCallId ?? ti.id ?? "t",
      toolName: ti.toolName ?? ti.name ?? "tool",
      args: (ti.args ?? {}) as Record<string, unknown>,
      status: running ? { type: "running" } : { type: "complete" },
      result: !running ? (ti.result ?? null) : undefined,
      isError: !running ? !!(ti.result as any)?.isError : undefined,
    };
  }
  return { type: "text", text: "" };
}

function toThreadMessage(m: any): any {
  const parts = (m.parts ?? []).map(toPart).filter((p: any) => (p.type === "text" ? p.text !== "" : true));
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: parts.length ? parts : [{ type: "text", text: "" }],
  };
}

export default function AssistantPage() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [showCtx, setShowCtx] = useState(true);
  const [tier, setTier] = useState<"simple" | "smart" | "premium">("smart");
  const tierRef = useRef(tier);
  tierRef.current = tier;
  const chatRef = useRef<any>(null);
  const [convoKey, setConvoKey] = useState(0);

  const chat = useChat({
    transport: new DefaultChatTransport({
      api: `${AI_BASE}/ai/chat/stream`,
      headers: { "x-session-id": "ast" },
      body: () => ({ model: tierRef.current }),
    }),
    onError: (err: unknown) => {
      if (err instanceof Error) console.error("[assistant] chat error:", err.message);
    },
  } as any);
  chatRef.current = chat;

  const busy = (chat as any).status === "submitted" || (chat as any).status === "streaming";

  const runtime = useExternalStoreRuntime({
    messages: (chat as any).messages.map(toThreadMessage),
    isRunning: busy,
    unstable_persistsHistory: true,
    onNew: async (msg: any) => {
      const content = msg?.content;
      let text = "";
      if (typeof content === "string") text = content;
      else if (Array.isArray(content)) {
        text = content
          .map((p: any) => (p?.type === "text" ? (p?.text ?? "") : "") || (typeof p === "string" ? p : ""))
          .join("")
          .trim();
      }
      if (!text) return;
      (chatRef.current as any)?.sendMessage({ text });
    },
  } as any);

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
          <label className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1">
            <span className="font-manrope text-[10px] text-text-muted-custom">Model</span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as typeof tier)}
              aria-label="Model"
              className="bg-transparent font-manrope text-brand-navy text-xs outline-none"
            >
              <option value="simple">⚡ Simple</option>
              <option value="smart">🧠 Advanced</option>
              <option value="premium">★ Premium</option>
            </select>
          </label>
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

      {/* Assistant UI — thread + composer (jembatan ke useChat kita) */}
      <div key={convoKey} className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitive.Root className="h-full">
            <ThreadPrimitive.Viewport className="h-full">
              <ThreadPrimitive.Messages
                components={{
                  UserMessage: () => (
                    <MessagePrimitive.Root className="mb-4 flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-brand-navy px-4 py-2.5 font-manrope text-sm text-white">
                        <MessagePrimitive.Content />
                      </div>
                    </MessagePrimitive.Root>
                  ),
                  AssistantMessage: () => (
                    <MessagePrimitive.Root className="mb-4 flex justify-start">
                      <div className="max-w-[92%] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-manrope text-gray-900 text-sm leading-relaxed sm:max-w-[85%]">
                        <MessagePrimitive.Parts
                          components={{
                            Text: ({ text }: { text: string }) => <MarkdownRenderer>{text}</MarkdownRenderer>,
                            Reasoning: ({ text }: { text: string }) => (
                              <details className="mb-2 rounded-lg bg-gray-100/70 px-2 py-1 text-text-muted-custom text-xs">
                                <summary>Pikirannya</summary>
                                <div className="mt-1 whitespace-pre-wrap">{text}</div>
                              </details>
                            ),
                            tools: {
                              Override: ({ toolName, result, isError }: any) => (
                                <div className="my-1.5 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg bg-brand-navy/5 px-2 py-1 font-mono text-[10px] text-brand-navy">
                                  🔧 {toolName} {isError ? "✗" : result !== undefined ? "✓" : "…"}
                                </div>
                              ),
                            },
                          }}
                        />
                        <MessagePrimitive.Error />
                      </div>
                    </MessagePrimitive.Root>
                  ),
                }}
              />

              <ThreadPrimitive.Empty>
                <div className="mx-auto max-w-xl px-4 pt-8">
                  <p className="font-manrope text-sm text-text-muted-custom">
                    Halo! 👋 Tanya apa saja — jawaban dipersonalisasi: {ctx?.school || "sekolah belum terisi"} ·{" "}
                    {ctx?.riasecPrimary ? `minat ${ctx.riasecPrimary}` : "tes minat belum ada"}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {QUICK.map((q: (typeof QUICK)[number]) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => (chatRef.current as any)?.sendMessage({ text: q })}
                        className="rounded-full border border-brand-navy/10 bg-brand-navy/5 px-3 py-1.5 font-manrope text-brand-navy text-xs transition-colors hover:bg-brand-navy/10"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </ThreadPrimitive.Empty>
            </ThreadPrimitive.Viewport>

            {/* Konteks chips di atas composer */}
            <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1">
              {showCtx && (
                <button
                  type="button"
                  onClick={() => setShowCtx(false)}
                  className="rounded-full bg-brand-navy/5 px-2 py-1 font-manrope text-[10px] text-brand-navy hover:bg-brand-navy/10"
                >
                  {ctx?.school ? `🏫 ${ctx.school}` : "🏫 sekolah?"} ·{" "}
                  {ctx?.riasecPrimary ? `🧭 ${ctx.riasecPrimary}` : "🧭 tes minat?"} ✕
                </button>
              )}
              {!showCtx && (
                <button
                  type="button"
                  onClick={() => setShowCtx(true)}
                  className="text-[10px] text-text-muted-custom hover:text-brand-navy"
                >
                  + konteks
                </button>
              )}
            </div>

            <ComposerPrimitive.Root className="flex flex-col gap-2 border-gray-100 border-t p-3">
              <ComposerPrimitive.Input
                placeholder="Tanyakan apa saja… (Enter kirim, Shift+Enter baris baru)"
                className="max-h-40 min-h-[46px] w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-manrope text-sm outline-none focus:border-brand-orange/50"
              />
              <div className="flex items-center justify-end gap-2">
                {busy ? (
                  <ComposerPrimitive.Cancel className="h-[40px] rounded-xl border border-gray-200 bg-white px-5 font-manrope text-brand-navy text-sm">
                    ■ Stop
                  </ComposerPrimitive.Cancel>
                ) : (
                  <ComposerPrimitive.Send className="h-[40px] rounded-xl bg-brand-navy px-6 font-manrope font-semibold text-sm text-white">
                    Kirim ↑
                  </ComposerPrimitive.Send>
                )}
              </div>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.Root>
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}
