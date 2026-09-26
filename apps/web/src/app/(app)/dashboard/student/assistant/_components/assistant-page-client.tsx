"use client";

import { useChat } from "@ai-sdk/react";
import { env } from "@mulai-plus/env/web";
import { DefaultChatTransport } from "ai";
import {
  BrainIcon,
  CheckIcon,
  Check as CheckMark,
  ChevronDownIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
  X,
  ZapIcon,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ai-elements/checkpoint";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoaderCircle } from "@/components/ui/loader-circle";
import { authClient } from "@/lib/auth-client";
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

const _SUGGESTIONS = [
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
  userId,
  initialMessages,
  onChanged,
}: {
  sessionId: string;
  userId: string | null;
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
  const uidRef = useRef(userId);
  uidRef.current = userId;
  const chatRef = useRef<any>(null);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;
  const [branchState, setBranchState] = useState<Record<string, { active: number; versions: string[] }>>({});
  const sendGroups = useRef<Map<string, string>>(new Map());
  const pendingRegen = useRef<{ blockKey: string; group: string } | null>(null);

  const chat = useChat({
    transport: new DefaultChatTransport({
      api: `${AI_BASE}/ai/chat/stream`,
      headers: () => {
        const h: Record<string, string> = { [SESSION_HEADER]: sessionRef.current };
        if (uidRef.current) h["x-user-id"] = uidRef.current;
        return h;
      },
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
    void fetch(`${AI_BASE}/ai/context`, {
      headers: { [SESSION_HEADER]: sessionId, ...(userId ? { "x-user-id": userId } : {}) },
    })
      .then((r) => r.json())
      .then((d) => setCtx((d as any).profile ?? null))
      .catch(() => setCtx(null));
  }, [sessionId, userId]);

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
      { body: { model: modelRef.current, branch_group: `g-${crypto.randomUUID().slice(0, 12)}` } },
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
        headers: {
          [SESSION_HEADER]: sessionId,
          "Content-Type": "application/json",
          ...(uidRef.current ? { "x-user-id": uidRef.current } : {}),
        },
        body: JSON.stringify({ session_id: sessionId, keep: keepIndex }),
      });
    } catch {
      /* nonblokir */
    }
    changedRef.current();
  };

  /** Regenerate: buat versi baru dari jawaban pada index i (ganti di tempat). */
  const doRegenerate = (i: number, userMsgId: string, userText: string, currentText: string) => {
    const blockKey = `b${userMsgId}`;
    const group = sendGroups.current.get(userMsgId) ?? `g-${crypto.randomUUID().slice(0, 12)}`;
    sendGroups.current.set(userMsgId, group);
    setBranchState((prev) => ({
      ...prev,
      [blockKey]: { active: 0, versions: [...(prev[blockKey]?.versions ?? []), currentText] },
    }));
    pendingRegen.current = { blockKey, group };
    (chatRef.current as any)?.setMessages((prev: any[]) => prev.filter((_, idx) => idx !== i));
    (chatRef.current as any)?.sendMessage(
      { text: userText },
      { body: { model: modelRef.current, regenerate: true, branch_group: group } },
    );
  };

  /** Finalize branch ketika regenerasi selesai streaming. */
  const lastSt = useRef(status);
  useEffect(() => {
    if (pendingRegen.current && lastSt.current === "streaming" && (status === "ready" || status === "error")) {
      const msgs = (chatRef.current as any)?.messages ?? [];
      const lastAsst = [...msgs].reverse().find((m: any) => m.role === "assistant");
      const txt = (lastAsst?.parts ?? [])
        .map((pp: any) => ((pp.kind ?? pp.type) === "text" ? (pp.text ?? "") : ""))
        .join("");
      const { blockKey } = pendingRegen.current;
      pendingRegen.current = null;
      setBranchState((prev) => ({
        ...prev,
        [blockKey]: {
          active: prev[blockKey]?.versions?.length ?? 0,
          versions: [...(prev[blockKey]?.versions ?? []), txt],
        },
      }));
    }
    lastSt.current = status;
  }, [status]);

  const copyMessage = async (full: string) => {
    try {
      await navigator.clipboard.writeText(full);
      notify.info("Pesan disalin");
    } catch {
      /* noop */
    }
  };

  const current = TIERS.find((t) => t.id === model) ?? TIERS[1];

  /** Suggestion dinamis — menyesuaikan profil + isi percakapan (tool & kata kunci terakhir). */
  const dynamicSuggestions = useMemo(() => {
    // Belum ada percakapan → sarankan mulai dari konteks user
    if (messages.length === 0) {
      const out: string[] = [];
      if (ctx?.riasecPrimary) out.push(`Rekomendasi jurusan sesuai minat (${ctx.riasecPrimary})`);
      if (ctx?.school) out.push(`Cari universitas negeri di daerah ${ctx.school}`);
      out.push("Cari universitas negeri di Jawa Timur", "Info program mentoring MULAI+");
      return out.slice(0, 4);
    }

    const last = [...messages].reverse();
    const lastUser = last.find((m: any) => m.role === "user");
    const lastAsst = last.find((m: any) => m.role === "assistant");
    const userText = (
      ((lastUser as any)?.content ?? "") ||
      (lastUser?.parts ?? []).map((p: any) => ((p.kind ?? p.type) === "text" ? (p.text ?? "") : "")).join("") ||
      ""
    ).toLowerCase();

    const out: string[] = [];
    // Pahami tool evaluasi terakhir (search_universities/programs/passing_grade)
    const toolParts = (lastAsst?.parts ?? []).filter((p: any) => {
      const k = p.kind ?? p.type;
      return k === "tool-invocation" || k === "tool";
    });
    const lastTool = toolParts[toolParts.length - 1];
    const ti = lastTool ? (lastTool.toolInvocation ?? lastTool) : undefined;
    const arg = ti?.args ?? {};
    if (ti?.toolName?.includes("search_universities") && (arg as any).province) {
      const sw = (arg as any).type === "Negeri" ? "swasta" : "negeri";
      out.push(`Cari universitas ${sw} di ${(arg as any).province}`);
    }
    if (ti?.toolName?.includes("search_programs") && (arg as any).program_name) {
      out.push(`Info passing grade ${(arg as any).program_name}`);
    }

    if (/passing grade/.test(userText)) out.push("Bandingkan passing grade dengan kampus lain");
    if (/beasiswa|pendanaan|biaya/.test(userText)) out.push("Info beasiswa yang cocok untukku");
    if (/mentoring/.test(userText)) out.push("Jadwal & biaya mentoring 1-on-1");
    if (/universitas|kampus|ptn|pts|ujian/.test(userText) && !out.length) {
      out.push("Info passing grade & biaya kuliah jurusan tsb");
    }
    if (!out.length) out.push("Rekomendasi jurusan sesuai minatku");
    out.push("Apa saja program mentoring MULAI+?", "Info beasiswa yang cocok untukku");
    return out.slice(0, 4);
  }, [messages, ctx]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Percakapan */}
      <Conversation className="min-h-0 flex-1 rounded-none border-0 bg-card">
        <ConversationContent className="gap-3 px-3 py-3 sm:px-5 sm:py-4">
          {messages.length === 0 && (
            <div className="px-4 pt-10">
              <p className="font-manrope text-sm text-text-muted-custom">
                Halo! 👋 Tanya apa saja — jawaban dipersonalisasi:{" "}
                {ctx?.school ? `sekolah ${ctx.school}` : "sekolah belum terisi"} ·{" "}
                {ctx?.riasecPrimary ? `minat ${ctx.riasecPrimary}` : "tes minat belum ada"}.
              </p>
            </div>
          )}

          {messages.map((m: any, idx: number) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="contents"
            >
              {/* Checkpoint — pembatas "mulai ulang dari sini" di tiap pertanyaan user */}
              {idx > 0 && m.role === "user" && (
                <Checkpoint className="my-1">
                  <CheckpointIcon />
                  <CheckpointTrigger onClick={() => restoreTo(idx, (m.content ?? "").slice(0, 40))}>
                    Mulai ulang dari sini
                  </CheckpointTrigger>
                </Checkpoint>
              )}
              {(() => {
                const prevU = idx > 0 ? messages[idx - 1] : null;
                const blockKey = prevU && prevU.role === "user" ? `b${prevU.id}` : null;
                const block = blockKey ? branchState[blockKey] : undefined;
                const hasBranch = !!block && block.versions.length > 1;
                const useStored = hasBranch && block?.active < block?.versions.length - 1;
                const stored = useStored ? block?.versions[block?.active] : "";
                return (
                  <MessageBranch defaultBranch={0} key={`br-${m.id}`}>
                    <MessageBranchContent>
                      <Message from={m.role === "user" ? "user" : "assistant"}>
                        {(() => {
                          const isUser = m.role === "user";
                          const partsTxt = (m.parts ?? [])
                            .map((pp: any) => ((pp.kind ?? pp.type) === "text" ? (pp.text ?? "") : ""))
                            .join("");
                          const hasTool = (m.parts ?? []).some((pp: any) => {
                            const k = pp.kind ?? pp.type;
                            return k === "tool-invocation" || k === "tool";
                          });
                          const showBubble = isUser || partsTxt.length > 0 || hasTool;
                          if (!showBubble) return null;
                          return (
                            <MessageContent
                              className={
                                isUser
                                  ? "rounded-xl! bg-brand-navy! px-4! py-2.5! text-white!"
                                  : "border! w-full max-w-none! rounded-xl! border-border! bg-muted! px-4! py-3! text-foreground! shadow-xs!"
                              }
                            >
                              {isUser ? (
                                <span>
                                  {(m as any).content ??
                                    ((m.parts ?? [])
                                      .map((p: any) => ((p.kind ?? p.type) === "text" ? (p.text ?? "") : ""))
                                      .join("") ||
                                      "…")}
                                </span>
                              ) : useStored ? (
                                <MessageResponse className="au-markdown">{stored}</MessageResponse>
                              ) : (
                                (m.parts ?? []).map((p: any, i: number) => {
                                  const kind = p.kind ?? p.type;
                                  if (kind === "text") {
                                    return p.text ? (
                                      <MessageResponse key={i} className="au-markdown">
                                        {p.text}
                                      </MessageResponse>
                                    ) : null;
                                  }
                                  if (kind === "tool-invocation" || kind === "tool") {
                                    const ti = p.toolInvocation ?? p;
                                    const st = ti.state ?? "call";
                                    const done = st === "result" || st === "output-available";
                                    const result = done ? (ti.output ?? ti.result) : undefined;
                                    return (
                                      <Task
                                        key={i}
                                        defaultOpen={false}
                                        className="rounded-xl border border-gray-200 bg-card"
                                      >
                                        <TaskTrigger
                                          title={`${done ? "✓" : "…"} ${ti.toolName ?? ti.name ?? "tool"}`}
                                        />
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
                            </MessageContent>
                          );
                        })()}
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
                              <MessageAction
                                variant="ghost"
                                size="icon-sm"
                                title="Coba lagi (versi baru)"
                                aria-label="Coba lagi"
                                onClick={() => {
                                  const up = idx > 0 && messages[idx - 1]?.role === "user" ? messages[idx - 1] : null;
                                  if (!up) return;
                                  const curText = (m.parts ?? [])
                                    .map((pp: any) => ((pp.kind ?? pp.type) === "text" ? (pp.text ?? "") : ""))
                                    .join("");
                                  const userText =
                                    (up as any).content ??
                                    (up.parts ?? [])
                                      .map((pp: any) => ((pp.kind ?? pp.type) === "text" ? (pp.text ?? "") : ""))
                                      .join("");
                                  doRegenerate(idx, up.id, userText, curText);
                                }}
                              >
                                <RefreshCwIcon className="size-3.5" />
                              </MessageAction>
                            </MessageActions>
                          </MessageToolbar>
                        )}
                      </Message>
                    </MessageBranchContent>
                    {hasBranch && (
                      <MessageBranchSelector>
                        <MessageBranchPrevious
                          onClick={() =>
                            setBranchState((prev) => {
                              const k = blockKey ?? "";
                              const cur = prev[k] ?? { active: 0, versions: [] as string[] };
                              return { ...prev, [k]: { ...cur, active: Math.max(0, cur.active - 1) } };
                            })
                          }
                        />
                        <MessageBranchPage>
                          <div className="font-manrope text-muted-foreground text-xs">
                            {block?.active + 1} / {block?.versions.length}
                          </div>
                        </MessageBranchPage>
                        <MessageBranchNext
                          onClick={() =>
                            setBranchState((prev) => {
                              const k = blockKey ?? "";
                              const cur = prev[k] ?? { active: 0, versions: [] as string[] };
                              return {
                                ...prev,
                                [k]: { ...cur, active: Math.min(cur.versions.length - 1, cur.active + 1) },
                              };
                            })
                          }
                        />
                      </MessageBranchSelector>
                    )}
                  </MessageBranch>
                );
              })()}
            </motion.div>
          ))}
          {(busy && messages.length > 0 && (messages[messages.length - 1] as any)?.role === "user") ||
          (busy && messages.length === 0) ? (
            <div className="flex justify-start">
              <span className="border! inline-flex items-center gap-1.5 rounded-full border-border! bg-muted! px-3 py-1.5 font-manrope text-[11px] text-muted-foreground shadow-xs!">
                <LoaderCircle className="size-3 animate-spin text-brand-orange" />
                Sedang berpikir
                <span className="flex gap-0.5" aria-hidden>
                  <i className="size-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <i className="size-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                  <i className="size-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                </span>
              </span>
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Suggestions selalu tampil (pola ref examples/chatbot) + konteks + composer */}
      <div className="shrink-0 border-border border-t">
        {!busy && (
          <div className="px-3 pt-2 pb-1">
            <Suggestions>
              {dynamicSuggestions.map((q: string) => (
                <Suggestion key={q} suggestion={q} onClick={() => sendText(q)} />
              ))}
            </Suggestions>
          </div>
        )}
        {ctx && !ctx.isTmbTested && (
          <div className="mx-3 mt-2 rounded-xl border border-brand-orange/20 bg-brand-orange/5 px-3 py-2 font-manrope text-[11px] text-brand-navy">
            Belum ada hasil Tes Minat Bakat — ikuti tes dulu biar jawaban &amp; rekomendasi lebih personal.{" "}
            <Link
              href="/dashboard/student/assessment"
              className="font-semibold underline decoration-brand-orange/60 underline-offset-2"
            >
              Mulai tes sekarang →
            </Link>
          </div>
        )}
        {(ctx?.school || ctx?.riasecPrimary || model === "premium") && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1">
            {ctx?.school && (
              <span className="rounded-full bg-brand-navy/5 px-2 py-1 font-manrope text-[10px] text-brand-navy transition-colors hover:bg-brand-navy/10">
                🏫 {ctx.school}
              </span>
            )}
            {ctx?.riasecPrimary && (
              <span className="rounded-full bg-brand-orange/10 px-2 py-1 font-manrope text-[10px] text-brand-orange">
                🧭 {ctx.riasecPrimary}
              </span>
            )}
            {model === "premium" && (
              <span className="rounded-full bg-brand-orange/10 px-2 py-1 font-manrope text-[10px] text-brand-orange">
                kuota premium 5/hari
              </span>
            )}
          </div>
        )}

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
                    <ChevronDownIcon className="size-3 text-muted-foreground" />
                  </Button>
                </ModelSelectorTrigger>
                <ModelSelectorContent
                  title="Pilih model"
                  className="border! overflow-hidden rounded-xl border-border! shadow-xl! sm:max-h-[500px] sm:w-[420px]"
                >
                  <ModelSelectorInput placeholder="Cari model…" />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>Model tidak ditemukan.</ModelSelectorEmpty>
                    <ModelSelectorGroup heading="Pilihan MULAI+">
                      {TIERS.map((t) => (
                        <ModelSelectorItem
                          key={t.id}
                          value={t.id}
                          className={t.id === model ? "bg-brand-navy/5" : ""}
                          onSelect={() => {
                            setModel(t.id);
                            setModelOpen(false);
                          }}
                        >
                          <div className="flex w-full items-center gap-3 py-1">
                            {t.icon}
                            <div className="min-w-0 flex-1 pr-2">
                              <ModelSelectorName>{t.name}</ModelSelectorName>
                              <p className="truncate font-manrope text-muted-foreground text-xs">{t.desc}</p>
                            </div>
                            {model === t.id ? (
                              <CheckIcon className="ml-auto size-4 shrink-0 text-brand-orange" />
                            ) : (
                              <div className="ml-auto size-4 shrink-0" />
                            )}
                          </div>
                        </ModelSelectorItem>
                      ))}
                    </ModelSelectorGroup>
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

export function AssistantPageClient({ initialSessionId }: { initialSessionId?: string | null }) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const paramId = params?.id ?? null;
  const { data: authSession } = authClient.useSession();
  const userId = (authSession?.user?.id as string | undefined) ?? null;
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeId, setActiveId] = useState<string>(initialSessionId ?? `s-${crypto.randomUUID().slice(0, 12)}`);
  const [history, setHistory] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SessionItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const _loaded = useRef<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const r = await fetch(`${AI_BASE}/ai/sessions`, {
        cache: "no-store",
        headers: userId ? { "x-user-id": userId } : {},
      });
      if (!r.ok) return;
      const d = (await r.json()) as { sessions: SessionItem[] };
      setSessions(d.sessions ?? []);
    } catch {
      /* nonblokir */
    }
  }, [userId]);

  /** Muat riwayat sesi lalu swap ke ChatRuntime baru (resume). */
  const openSession = async (id: string) => {
    setActiveId(id);
    setHistory([]);
    setReady(false);
    setMobileListOpen(false);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: openSession dibuat ulang tiap render — cukup trigger param
  useEffect(() => {
    if (paramId) {
      void openSession(paramId);
    } else if (initialSessionId) {
      void openSession(initialSessionId);
    } else if (process.env.NEXT_PUBLIC_CHAT_NO_REDIRECT !== "1") {
      const id = `s-${crypto.randomUUID().slice(0, 12)}`;
      (router.replace as any)(`/dashboard/student/assistant/chat/${id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId]);

  const handleNewChat = async () => {
    const id = `s-${crypto.randomUUID().slice(0, 12)}`;
    if (userId) {
      try {
        await fetch(`${AI_BASE}/ai/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": userId },
          body: JSON.stringify({ id }),
        });
      } catch {
        /* sesi tetap jalan pakai id lokal */
      }
    }
    setActiveId(id);
    setHistory([]);
    setReady(true);
    setShowSidebar(false);
    setMobileListOpen(false);
  };

  useEffect(() => {
    // Jangan fetch /ai/sessions sebelum userId diketahui — kalau nembak tanpa
    // user id → 401 noise di log & sidebar kosong. List ditarik via efek di bawah.
    // ChatRuntime DILARANG mount lebih dulu bila ada sesi yang harus dimuat:
    // useChat baca initialMessages hanya saat mount, jadi tunggu openSession selesai.
    if (!paramId && !initialSessionId) setReady(true);
  }, [paramId, initialSessionId]);

  useEffect(() => {
    if (userId) void refreshSessions();
  }, [userId, refreshSessions]);

  const active = sessions.find((s) => s.id === activeId);

  const saveRename = async (sessionId: string, title: string) => {
    const clean = title.trim().slice(0, 60);
    if (!clean || !userId) return;
    try {
      const r = await fetch(`${AI_BASE}/ai/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ title: clean }),
      });
      if (r.ok) {
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: clean } : s)));
      }
    } catch {
      /* noop */
    }
  };

  const doDeleteSession = async (target: SessionItem) => {
    try {
      await fetch(`${AI_BASE}/ai/sessions/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
        headers: userId ? { "x-user-id": userId } : {},
      });
    } catch {
      /* noop */
    }
    if (target.id === activeId) await handleNewChat();
    setDeleteTarget(null);
    void refreshSessions();
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1280px] gap-3 p-4 md:p-6 lg:p-8">
      {/* Sidebar percakapan */}
      {showSidebar && (
        <aside className="hidden min-h-0 w-[264px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white lg:flex">
          <div className="flex items-center justify-between border-border border-b p-3">
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
                // biome-ignore lint/a11y/useSemanticElements: container klik utk row percakapan (bukan button nested)
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => (router.replace as any)(`/dashboard/student/assistant/chat/${s.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (router.replace as any)(`/dashboard/student/assistant/chat/${s.id}`);
                    }
                  }}
                  title={s.title}
                  className={`group flex w-full cursor-pointer items-center gap-1.5 rounded-lg border-l-2 px-2 py-1.5 text-left transition-colors ${
                    s.id === activeId ? "border-brand-orange bg-brand-navy/10" : "border-transparent hover:bg-muted"
                  }`}
                >
                  <span className="min-w-0 flex-1 overflow-hidden">
                    {editingId === s.id ? (
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => {
                          void saveRename(s.id, draftTitle);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void saveRename(s.id, draftTitle);
                            setEditingId(null);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                          e.stopPropagation();
                        }}
                        className="w-full rounded-md border border-border bg-card px-1.5 py-0.5 font-manrope text-xs outline-none focus:border-brand-orange/60"
                      />
                    ) : (
                      <span className="block truncate font-manrope font-medium text-text-main text-xs">{s.title}</span>
                    )}
                    <span className="block truncate font-manrope text-[10px] text-text-muted-custom">
                      {fmtTime(s.lastActive)} · {s.messageCount} pesan
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    {s.id === activeId && <CheckMark className="size-3.5 text-brand-orange" />}
                    <button
                      type="button"
                      aria-label="Ubah judul"
                      title="Ubah judul"
                      className="hidden shrink-0 rounded-md p-1 text-text-muted-custom hover:bg-muted hover:text-brand-navy group-hover:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftTitle(s.title);
                        setEditingId((cur) => (cur === s.id ? null : s.id));
                      }}
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus ${s.title}`}
                      className="hidden shrink-0 rounded-md p-1 text-text-muted-custom transition-colors hover:bg-red-50 hover:text-red-500 group-hover:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(s);
                      }}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Dialog hapus percakapan — bukan confirm browser */}
          <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus percakapan?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{deleteTarget?.title ?? ""}&rdquo; akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteTarget && void doDeleteSession(deleteTarget)}
                >
                  Ya, hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </aside>
      )}

      {/* Mobile: daftar & manajemen percakapan (slide-over) */}
      <Dialog open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <DialogContent className="top-0 left-0 h-dvh w-[86vw] max-w-[320px] translate-x-0 rounded-r-xl rounded-l-none border-border bg-card p-0 shadow-xl sm:hidden sm:w-[320px]">
          <div className="flex h-full flex-col">
            <DialogHeader className="flex flex-row items-center justify-between border-border border-b p-3">
              <DialogTitle className="font-bold font-bricolage text-brand-navy text-sm">Percakapan</DialogTitle>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setMobileListOpen(false)}
                className="rounded-md p-1 font-manrope text-text-muted-custom text-xs hover:bg-muted"
              >
                ✕
              </button>
            </DialogHeader>
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
                  // biome-ignore lint/a11y/useSemanticElements: container klik utk row percakapan (bukan button nested)
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => (router.replace as any)(`/dashboard/student/assistant/chat/${s.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        (router.replace as any)(`/dashboard/student/assistant/chat/${s.id}`);
                      }
                    }}
                    title={s.title}
                    className={`group flex w-full cursor-pointer items-center gap-1.5 rounded-lg border-l-2 px-2 py-1.5 text-left transition-colors ${
                      s.id === activeId ? "border-brand-orange bg-brand-navy/10" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <span className="min-w-0 flex-1 overflow-hidden">
                      {editingId === s.id ? (
                        <input
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => {
                            void saveRename(s.id, draftTitle);
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void saveRename(s.id, draftTitle);
                              setEditingId(null);
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                            e.stopPropagation();
                          }}
                          className="w-full rounded-md border border-border bg-card px-1.5 py-0.5 font-manrope text-xs outline-none focus:border-brand-orange/60"
                        />
                      ) : (
                        <span className="block truncate font-manrope font-medium text-text-main text-xs">
                          {s.title}
                        </span>
                      )}
                      <span className="block truncate font-manrope text-[10px] text-text-muted-custom">
                        {fmtTime(s.lastActive)} · {s.messageCount} pesan
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5">
                      {s.id === activeId && <CheckMark className="size-3.5 text-brand-orange" />}
                      <button
                        type="button"
                        aria-label="Ubah judul"
                        title="Ubah judul"
                        className="hidden shrink-0 rounded-md p-1 text-text-muted-custom hover:bg-muted hover:text-brand-navy group-hover:inline-flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraftTitle(s.title);
                          setEditingId((cur) => (cur === s.id ? null : s.id));
                        }}
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus ${s.title}`}
                        className="hidden shrink-0 rounded-md p-1 text-text-muted-custom transition-colors hover:bg-red-50 hover:text-red-500 group-hover:inline-flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(s);
                        }}
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Dialog hapus digunakan bersama (deleteTarget) — sudah ada di level page */}
        </DialogContent>
      </Dialog>

      {/* Panel utama chat */}
      <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex shrink-0 items-center gap-2 rounded-xl border-border border-b bg-card/60 px-3 py-2 backdrop-blur-sm">
          {!showSidebar && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSidebar(true)}
              aria-label="Buka percakapan"
              className="hidden lg:inline-flex"
            >
              {/** menu icon */}
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileListOpen(true)}
            aria-label="Buka daftar percakapan"
            className="lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
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
              userId={userId}
              initialMessages={history}
              onChanged={() => void refreshSessions()}
            />
          </div>
        )}
      </section>
    </div>
  );
}
