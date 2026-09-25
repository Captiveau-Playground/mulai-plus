"use client";

import { useChat } from "@ai-sdk/react";
import { env } from "@mulai-plus/env/web";
import { DefaultChatTransport } from "ai";
import {
  BrainIcon,
  CheckIcon,
  Check as CheckMark,
  CopyIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  X,
  ZapIcon,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ai-elements/checkpoint";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";
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
const SESSION_HEADER = "x-session-id";

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

interface SessionItem {
  id: string;
  title: string;
  messageCount: number;
  lastActive: string | null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const diff = now.getTime() - d.getTime();
  if (diff < 7 * 86400000) return d.toLocaleDateString("id-ID", { weekday: "short" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Peta satu sesi percakapan (remount per sesi → riwayat termuat + bisa lanjut). */
function ChatRuntime({
  sessionId,
  initialMessages,
  onChanged,
}: {
  sessionId: string;
  initialMessages: any[];
  onChanged: () => void;
}) {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [text, setText] = useState("");
  const [model, setModel] = useState("smart");
  const [modelOpen, setModelOpen] = useState(false);
  const modelRef = useRef(model);
  modelRef.current = model;
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;
  const chatRef = useRef<any>(null);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const chat = useChat({
    transport: new DefaultChatTransport({
      api: `${AI_BASE}/ai/chat/stream`,
      headers: () => ({ [SESSION_HEADER]: sessionRef.current }),
    }),
    messages: initialMessages,
    onError: (err: unknown) => {
      if (err instanceof Error) notify.error(`Gagal kirim: ${err.message}`);
    },
  } as any);
  chatRef.current = chat;

  const messages = (chat as any).messages ?? [];
  const status = (chat as any).status;
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    void fetch(`${AI_BASE}/ai/context`, { headers: { [SESSION_HEADER]: sessionId } })
      .then((r) => r.json())
      .then((d) => setCtx((d as any).profile ?? null))
      .catch(() => setCtx(null));
  }, [sessionId]);

  // Saat selesai streaming → refresh list (judul/update_at dari pesan pertama).
  const lastStatus = useRef(status);
  useEffect(() => {
    if (lastStatus.current === "streaming" && (status === "ready" || status === "error")) {
      changedRef.current();
    }
    lastStatus.current = status;
  }, [status]);

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

  /** Checkpoint restore: potong chat di sini + serempakkan DB. */
  const restoreTo = async (keepIndex: number, label: string) => {
    if (!window.confirm(`Mulai ulang dari "${label}"? Percakapan setelahnya akan dihapus.`)) return;
    (chatRef.current as any)?.setMessages((prev: any[]) => prev.slice(0, keepIndex));
    try {
      await fetch(`${AI_BASE}/ai/sessions/truncate`, {
        method: "POST",
        headers: { [SESSION_HEADER]: sessionId, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, keep: keepIndex }),
      });
    } catch {
      /* nonblokir */
    }
    changedRef.current();
  };

  const copyMessage = async (full: string) => {
    try {
      await navigator.clipboard.writeText(full);
      notify.info("Pesan disalin");
    } catch {
      /* noop */
    }
  };

  const current = TIERS.find((t) => t.id === model) ?? TIERS[1];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Percakapan */}
      <Conversation className="min-h-0 flex-1 rounded-none border-0 bg-white">
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

          {messages.map((m: any, idx: number) => (
            <Fragment key={m.id}>
              {/* Checkpoint — pembatas "mulai ulang dari sini" di tiap pertanyaan user */}
              {idx > 0 && m.role === "user" && (
                <Checkpoint className="my-1">
                  <CheckpointIcon />
                  <CheckpointTrigger onClick={() => restoreTo(idx, (m.content ?? "").slice(0, 40))}>
                    Mulai ulang dari sini
                  </CheckpointTrigger>
                </Checkpoint>
              )}
              <Message from={m.role === "user" ? "user" : "assistant"}>
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
                        const st = ti.state ?? "call";
                        const done = st === "result" || st === "output-available";
                        const result = done ? (ti.output ?? ti.result) : undefined;
                        return (
                          <Task key={i} defaultOpen={false} className="rounded-xl border border-gray-200 bg-white">
                            <TaskTrigger title={`${done ? "✓" : "…"} ${ti.toolName ?? ti.name ?? "tool"}`} />
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
                    <span className="flex items-center gap-1.5 text-text-muted-custom/50 italic">
                      <LoaderCircle className="size-3" /> memikirkan…
                    </span>
                  )}
                </MessageContent>
                {m.role === "assistant" && (
                  <MessageToolbar>
                    <MessageActions>
                      <MessageAction
                        variant="ghost"
                        size="icon-sm"
                        title="Salin jawaban"
                        aria-label="Salin jawaban"
                        onClick={() =>
                          copyMessage(
                            (m.parts ?? [])
                              .map((p: any) => ((p.kind ?? p.type) === "text" ? (p.text ?? "") : ""))
                              .join(""),
                          )
                        }
                      >
                        <CopyIcon className="size-3.5" />
                      </MessageAction>
                    </MessageActions>
                  </MessageToolbar>
                )}
              </Message>
            </Fragment>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Konteks + composer */}
      <div className="shrink-0 border-gray-100 border-t">
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-1">
          <button
            type="button"
            onClick={() => notify.info("Diperkaya dari profil, tes, & riwayat. Lihat Kebijakan Privasi.")}
            className="rounded-full bg-brand-navy/5 px-2 py-1 font-manrope text-[10px] text-brand-navy hover:bg-brand-navy/10"
          >
            {ctx?.school ? `🏫 ${ctx.school}` : "🏫 sekolah?"} ·{" "}
            {ctx?.riasecPrimary ? `🧭 ${ctx.riasecPrimary}` : "🧭 tes minat?"}
          </button>
          {model === "premium" && (
            <span className="rounded-full bg-brand-orange/10 px-2 py-1 font-manrope text-[10px] text-brand-orange">
              kuota premium 5/hari
            </span>
          )}
        </div>

        <PromptInput onSubmit={handleSubmit} multiple className="rounded-none border-0 bg-white px-3 pb-3">
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tanyakan apa saja… (Enter kirim, Shift+Enter baris baru)"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
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

export default function AssistantPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeId, setActiveId] = useState<string>(() => `s-${crypto.randomUUID().slice(0, 12)}`);
  const [history, setHistory] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const _loaded = useRef<string | null>(null);

  const refreshSessions = async () => {
    try {
      const r = await fetch(`${AI_BASE}/ai/sessions`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { sessions: SessionItem[] };
      setSessions(d.sessions ?? []);
    } catch {
      /* nonblokir */
    }
  };

  /** Muat riwayat sesi lalu swap ke ChatRuntime baru (resume). */
  const openSession = async (id: string) => {
    setActiveId(id);
    setHistory([]);
    setReady(false);
    try {
      const r = await fetch(`${AI_BASE}/ai/history?session_id=${encodeURIComponent(id)}`);
      const d = r.ok ? ((await r.json()) as any) : null;
      const rows = Array.isArray(d?.messages) ? d.messages : [];
      setHistory(
        rows.map((row: any) => ({
          id: row.id ? `m${row.id}` : crypto.randomUUID(),
          role: row.role === "user" ? "user" : "assistant",
          parts: [{ type: "text", text: row.content ?? "" }],
        })),
      );
    } catch {
      /* ignore */
    }
    setReady(true);
  };

  const handleNewChat = async () => {
    const id = `s-${crypto.randomUUID().slice(0, 12)}`;
    try {
      await fetch(`${AI_BASE}/ai/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* sesi tetap jalan pakai id lokal */
    }
    setActiveId(id);
    setHistory([]);
    setReady(true);
    setShowSidebar(false);
  };

  useEffect(() => {
    void fetch(`${AI_BASE}/ai/sessions`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<any>) : Promise.reject()))
      .then((d) => setSessions(d?.sessions ?? []))
      .catch(() => undefined);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = sessions.find((s) => s.id === activeId);

  return (
    <div className="relative mx-auto flex h-full w-full gap-3 px-0 pt-3 sm:px-3">
      {/* Sidebar percakapan */}
      {showSidebar && (
        <aside className="hidden min-h-0 w-[264px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white lg:flex">
          <div className="flex items-center justify-between border-gray-100 border-b p-3">
            <h2 className="font-bold font-bricolage text-brand-navy text-sm">Percakapan</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSidebar(false)}
              aria-label="Tutup sidebar"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="p-2">
            <Button
              type="button"
              className="w-full gap-1.5 rounded-xl font-manrope text-xs"
              onClick={() => void handleNewChat()}
            >
              <PlusIcon className="size-4" /> Percakapan baru
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <p className="px-2 py-6 text-center font-manrope text-text-muted-custom/70 text-xs">
                Belum ada riwayat.
                <br />
                Kirim pertanyaan pertama kamu.
              </p>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="group relative">
                  <button
                    type="button"
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                      s.id === activeId ? "bg-brand-navy/10" : "hover:bg-gray-50"
                    }`}
                    onClick={() => void openSession(s.id)}
                  >
                    <div className="min-h-0 flex-1">
                      <p className="truncate font-manrope font-medium text-text-main text-xs">{s.title}</p>
                      <p className="font-manrope text-[10px] text-text-muted-custom">
                        {fmtTime(s.lastActive)} · {s.messageCount} pesan
                      </p>
                    </div>
                    {s.id === activeId && <CheckMark className="size-3.5 shrink-0 text-brand-orange" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Hapus percakapan"
                    className="absolute top-1.5 right-1.5 hidden rounded-md p-1 text-text-muted-custom hover:bg-red-50 hover:text-red-500 group-hover:inline-flex"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Hapus percakapan "${s.title}"?`)) return;
                      try {
                        await fetch(`${AI_BASE}/ai/sessions/${encodeURIComponent(s.id)}`, { method: "DELETE" });
                      } catch {
                        /* noop */
                      }
                      if (s.id === activeId) await handleNewChat();
                      void refreshSessions();
                    }}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* Panel utama chat */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <header className="flex shrink-0 items-center gap-2 border-gray-100 border-b px-3 py-2">
          {!showSidebar && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSidebar(true)}
              aria-label="Buka percakapan"
            >
              {/** menu icon */}
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          )}
          <span className="flex size-6 items-center justify-center rounded-lg bg-brand-navy/10 font-manrope text-brand-navy text-xs">
            AI
          </span>
          <h1 className="truncate font-bold font-bricolage text-brand-navy text-sm">
            Asisten MULAI+
            {active && (
              <span className="ml-2 font-manrope font-normal text-[10px] text-text-muted-custom">· {active.title}</span>
            )}
          </h1>
        </header>

        {!ready ? (
          <div className="flex flex-1 items-center justify-center">
            <LoaderCircle className="size-5 text-brand-orange" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatRuntime
              key={activeId}
              sessionId={activeId}
              initialMessages={history}
              onChanged={() => void refreshSessions()}
            />
          </div>
        )}
      </section>
    </div>
  );
}
