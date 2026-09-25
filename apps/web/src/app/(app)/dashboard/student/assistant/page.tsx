"use client";

import { useChat } from "@ai-sdk/react";
import { env } from "@mulai-plus/env/web";
import { DefaultChatTransport } from "ai";
import { BrainIcon, CheckIcon, SparklesIcon, ZapIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Task, TaskContent, TaskTrigger } from "@/components/ai-elements/task";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "@/components/ui/loader-circle";
import { notify } from "@/lib/toast";
import type { UserContext } from "./types";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

const TIERS = [
  { id: "simple", name: "Simple", desc: "Cepat & hemat untuk tanya ringan", icon: <ZapIcon className="size-4" /> },
  { id: "smart", name: "Advanced", desc: "Seimbang, jawaban mendalam", icon: <BrainIcon className="size-4" /> },
  {
    id: "premium",
    name: "Premium",
    desc: "Kualitas maksimal — kuota 5/hari",
    icon: <SparklesIcon className="size-4" />,
  },
];

const SUGGESTIONS = [
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
  const [modelOpen, setModelOpen] = useState(false);
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

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasFiles = Boolean(message.files?.length);
    if (!hasText && !hasFiles) return;
    (chatRef.current as any)?.sendMessage(
      { text: message.text?.trim() || "Sent with attachment(s)", files: message.files },
      { body: { model: modelRef.current } },
    );
    setText("");
  };

  const sendText = (q: string) => {
    (chatRef.current as any)?.sendMessage({ text: q }, { body: { model: modelRef.current } });
  };

  useEffect(() => {
    void fetch(`${AI_BASE}/ai/context`, { headers: { "x-session-id": "ast" } })
      .then((r) => r.json())
      .then((d) => setCtx((d as any).profile ?? null))
      .catch(() => setCtx(null));
  }, []);

  const current = TIERS.find((t) => t.id === model) ?? TIERS[1];

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

      {/* Percakapan */}
      <Conversation key={convoKey} className="rounded-2xl border border-gray-200 bg-white">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="px-4 pt-10">
              <p className="font-manrope text-sm text-text-muted-custom">
                Halo! 👋 Tanya apa saja — jawaban dipersonalisasi: {ctx?.school || "sekolah belum terisi"} ·{" "}
                {ctx?.riasecPrimary ? `minat ${ctx.riasecPrimary}` : "tes minat belum ada"}.
              </p>
              <div className="mt-4">
                <Suggestions>
                  {SUGGESTIONS.map((s) => (
                    <Suggestion key={s} suggestion={s} onClick={() => sendText(s)} />
                  ))}
                </Suggestions>
              </div>
            </div>
          )}

          {messages.map((m: any) => (
            <Message key={m.id} from={m.role === "user" ? "user" : "assistant"}>
              <MessageContent className={m.role === "user" ? "!bg-brand-navy !text-white" : "!max-w-none w-full"}>
                {m.role === "user" ? (
                  <span>
                    {(m as any).content ??
                      ((m.parts ?? [])
                        .map((p: any) => ((p.kind ?? p.type) === "text" ? (p.text ?? "") : ""))
                        .join("") ||
                        "…")}
                  </span>
                ) : (
                  (m.parts ?? []).map((p: any, i: number) => {
                    const kind = p.kind ?? p.type;
                    if (kind === "text") {
                      return p.text ? <MessageResponse key={i}>{p.text}</MessageResponse> : null;
                    }
                    if (kind === "tool-invocation" || kind === "tool") {
                      const ti = p.toolInvocation ?? p;
                      const done = (ti.state ?? "call") === "result";
                      const name = ti.toolName ?? ti.name ?? "tool";
                      const result = done ? ti.result : undefined;
                      return (
                        <Task key={i} defaultOpen={false} className="rounded-xl border border-gray-200 bg-white">
                          <TaskTrigger title={`${done ? "✓" : "…"} ${name}`} />
                          <TaskContent>
                            <pre className="overflow-x-auto p-3 font-mono text-[10px] text-text-muted-custom">
                              {typeof result === "string"
                                ? result.slice(0, 800)
                                : JSON.stringify({ args: ti.args ?? {}, result }, null, 2).slice(0, 800)}
                            </pre>
                          </TaskContent>
                        </Task>
                      );
                    }
                    return null;
                  })
                )}
                {m.role === "assistant" && (m.parts ?? []).length === 0 && busy && (
                  <span className="text-text-muted-custom/50 italic">memikirkan…</span>
                )}
              </MessageContent>
            </Message>
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

        <PromptInput onSubmit={handleSubmit} multiple className="rounded-2xl border border-gray-200 bg-white">
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tanyakan apa saja… (Enter kirim, Shift+Enter baris baru)"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              {/* Model selector (dialog) */}
              <ModelSelector open={modelOpen} onOpenChange={setModelOpen}>
                <ModelSelectorTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full border border-gray-200 px-3 text-xs"
                  >
                    {current.icon}
                    {current.name}
                  </Button>
                </ModelSelectorTrigger>
                <ModelSelectorContent title="Pilih model">
                  <ModelSelectorInput placeholder="Cari model…" />
                  <ModelSelectorList>
                    {TIERS.map((t) => (
                      <ModelSelectorItem
                        key={t.id}
                        value={t.id}
                        onSelect={() => {
                          setModel(t.id);
                          setModelOpen(false);
                        }}
                      >
                        <div className="flex w-full items-center gap-3 py-1">
                          {t.icon}
                          <div className="flex-1">
                            <p className="font-manrope font-medium text-foreground text-sm">{t.name}</p>
                            <p className="font-manrope text-muted-foreground text-xs">{t.desc}</p>
                          </div>
                          {model === t.id && <CheckIcon className="size-4 text-brand-orange" />}
                        </div>
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
