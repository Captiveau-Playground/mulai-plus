"use client";

import { useChat } from "@ai-sdk/react";
import { env } from "@mulai-plus/env/web";
import { DefaultChatTransport } from "ai";
import {
  BarChart3,
  BookOpen,
  BrainIcon,
  Building2,
  CheckCircle2,
  CheckIcon,
  Check as CheckMark,
  ChevronDownIcon,
  CircleAlert,
  CopyIcon,
  GraduationCap,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
  ThumbsDown,
  ThumbsUp,
  Trash2Icon,
  X,
  ZapIcon,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const TOOL_LABELS: Record<string, string> = {
  search_universities: "Mencari universitas",
  search_programs: "Mencari program studi",
  get_passing_grade: "Cek passing grade",
  search_knowledge: "Mencari dokumentasi",
};

import ProfileGate from "@/components/student/profile-gate";
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
import { LoaderCircle } from "@/components/ui/loader-circle";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";
import type { UserContext } from "./types";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");
const SESSION_HEADER = "x-session-id";
const ACTIVE_SESSION_KEY = "mulai-ai-active-session";

const TIERS = [
  {
    id: "simple",
    name: "Mulai Cerdas",
    desc: "Cepat & hemat untuk tanya ringan",
    icon: <ZapIcon className="size-4" />,
  },
  { id: "smart", name: "Mulai Pintar", desc: "Seimbang, jawaban mendalam", icon: <BrainIcon className="size-4" /> },
  {
    id: "premium",
    name: "Mulai Bijak",
    desc: "Kualitas maksimal — kuota 5/hari",
    icon: <SparklesIcon className="size-4" />,
  },
];

// Skills ala Gemini Gems / Claude Skills — preset agentik Mul.ai
const SKILLS = [
  { id: "general", name: "Umum", icon: <SparklesIcon className="size-3.5" />, desc: "Semua keperluan", suggest: [] },
  {
    id: "univ",
    name: "Universitas",
    icon: <Building2 className="size-3.5" />,
    desc: "Kampus PTN/PTS",
    suggest: [
      "Cari universitas negeri di Jawa Timur",
      "Kampus terbaik utk Teknik Informatika?",
      "Info akreditasi & biaya kuliah",
    ],
  },
  {
    id: "prodi",
    name: "Prodi & Jurusan",
    icon: <BookOpen className="size-3.5" />,
    desc: "Pilih jurusan",
    suggest: [
      "Rekomendasi jurusan sesuai minatku",
      "Prodi dengan prospek kerja bagus",
      "Cari prodi kedokteran + persyaratan",
    ],
  },
  {
    id: "pg",
    name: "Passing Grade",
    icon: <BarChart3 className="size-3.5" />,
    desc: "Data SNBP/SNBT",
    suggest: [
      "Passing grade kedokteran di UI",
      "Bandingkan passing grade 3 kampus",
      "Jurusan dengan passing grade bersaing utk aku",
    ],
  },
  {
    id: "mentor",
    name: "Mentoring",
    icon: <GraduationCap className="size-3.5" />,
    desc: "Program & bimbingan",
    suggest: ["Info program mentoring 1-on-1", "Beasiswa mentoring MULAI+", "Cara daftar mentoring"],
  },
];

const EMPTY_CARDS = [
  {
    icon: <Building2 className="size-4.5" />,
    title: "Cari kampus",
    desc: "universitas negeri di Jawa Timur",
    prompt: "Cari universitas negeri di Jawa Timur",
  },
  {
    icon: <BrainIcon className="size-4.5" />,
    title: "Rekomendasi jurusan",
    desc: "sesuai minat & profil kamu",
    prompt: "Rekomendasi jurusan sesuai minatku",
  },
  {
    icon: <BarChart3 className="size-4.5" />,
    title: "Passing grade",
    desc: "kedokteran di UI tahun lalu",
    prompt: "Berapa passing grade kedokteran di UI tahun lalu?",
  },
  {
    icon: <GraduationCap className="size-4.5" />,
    title: "Program mentoring",
    desc: "1-on-1 & beasiswa mentoring",
    prompt: "Info program mentoring MULAI+",
  },
];

// Tour Mul.ai — highlight elemen asli (first-visit)
const TOUR_STEPS = [
  {
    target: "tour-header",
    title: "Ini Mul.ai",
    desc: "Asisten AI personalmu — semua jawaban dipersonalisasi dengan profil & hasil tes minat bakat.",
  },
  {
    target: "tour-skills",
    title: "Pilih Skill",
    desc: "Chip ini memandu AI fokus: Universitas, Prodi & Jurusan, Passing Grade, atau Mentoring — saran pertanyaan ikut menyesuaikan.",
  },
  {
    target: "tour-model",
    title: "Atur Model",
    desc: "Pilih Mulai Cerdas (cepat), Mulai Pintar (seimbang), atau Mulai Bijak (maksimal, kuota 5/hari).",
  },
  {
    target: "tour-composer",
    title: "Tanya di Sini",
    desc: "Ketik pertanyaan lalu Enter. Lihat langkah tool saat AI mengecek data (universitas/prodi/passing grade) dan beri feedback 👍/👎 di tiap jawaban.",
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
/** Skeleton percakapan — shimmer ala mesh chat (loading inisial & switch sesi). */
function ChatSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4" aria-hidden>
      {/* header palsu */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-brand-navy/10" />
        <div className="h-3 w-40 animate-pulse rounded-full bg-brand-navy/10" />
      </div>
      {/* bubble user */}
      <div className="ml-auto h-10 w-3/5 animate-pulse rounded-2xl rounded-tr-sm bg-brand-navy/10" />
      {/* tool chip: spinner oranye + line */}
      <div className="flex items-center gap-2">
        <span className="size-3.5 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        <div className="h-3 w-36 animate-pulse rounded-full bg-brand-navy/10" />
      </div>
      {/* jawaban AI 3 baris (semakin pendek) */}
      <div className="mt-1 h-3 w-4/5 animate-pulse rounded-full bg-brand-navy/10" />
      <div className="h-3 w-3/5 animate-pulse rounded-full bg-brand-navy/10" style={{ animationDelay: "120ms" }} />
      <div className="h-3 w-2/5 animate-pulse rounded-full bg-brand-navy/10" style={{ animationDelay: "240ms" }} />
      {/* pseudo composer */}
      <div className="mt-auto flex items-center gap-2 rounded-2xl border border-gray-100 px-3 py-2.5">
        <div className="h-3 flex-1 animate-pulse rounded-full bg-gray-100" />
        <div className="h-7 w-7 animate-pulse rounded-full bg-brand-navy/15" />
      </div>
    </div>
  );
}

function ChatRuntime({
  sessionId,
  userId,
  initialMessages,
  onChanged,
  ctx,
  dailyLeft,
  dailyLimit,
}: {
  sessionId: string;
  userId: string | null;
  initialMessages: any[];
  onChanged: () => void;
  ctx: UserContext | null;
  dailyLeft: number | null;
  dailyLimit: number;
}) {
  const [text, setText] = useState("");
  const [skill, setSkill] = useState("general");
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

  const quotaOut = dailyLeft !== null && dailyLeft <= 0;
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
    if (quotaOut) {
      notify.error(`Kuota harian ${dailyLimit} pertanyaan sudah habis — reset otomatis besok, yaa!`);
      return;
    }
    (chatRef.current as any)?.sendMessage(
      { text: message.text?.trim() || "Sent with attachment(s)", files: message.files },
      { body: { model: modelRef.current, branch_group: `g-${crypto.randomUUID().slice(0, 12)}`, skill } },
    );
    setText("");
  };

  const sendText = (q: string) => {
    if (quotaOut) {
      notify.error(`Kuota harian ${dailyLimit} pertanyaan sudah habis — reset otomatis besok, yaa!`);
      return;
    }
    (chatRef.current as any)?.sendMessage({ text: q }, { body: { model: modelRef.current, skill } });
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

  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down" | null>>({});
  const sendFeedback = async (m: any, val: "up" | "down") => {
    setFeedbackState((prev) => ({ ...prev, [m.id]: prev[m.id] === val ? null : val }));
    const numMatch = /^m(\d+)$/.exec(m.id || "");
    if (numMatch) {
      try {
        await fetch(`${AI_BASE}/ai/feedback`, {
          method: "POST",
          headers: { [SESSION_HEADER]: sessionId, "Content-Type": "application/json" },
          body: JSON.stringify({ message_id: Number(numMatch[1]), feedback: val }),
        });
      } catch {
        /* nonblokir */
      }
    }
    notify.info(val === "up" ? "Terima kasih atas feedback positif 🙏" : "Kami catat feedbacknya — terima kasih");
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

  /** Suggestion dinamis — menyesuaikan profil + isi percakapan (tool & kata kunci terakhir). */
  const dynamicSuggestions = useMemo(() => {
    const activeSkill = SKILLS.find((x) => x.id === skill);
    if (activeSkill && activeSkill.id !== "general") {
      return activeSkill.suggest.slice(0, 4);
    }
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
  }, [messages, ctx, skill]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Percakapan */}
      <Conversation className="min-h-0 flex-1 rounded-none border-0 bg-card">
        <ConversationContent className="gap-3 px-3 py-3 sm:px-5 sm:py-4">
          {messages.length === 0 && (
            <div className="flex min-h-[36vh] flex-col items-center justify-center px-4 pb-4 text-center sm:min-h-[52vh] sm:pb-6">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-light font-bold font-bricolage text-sm text-white shadow-lg sm:size-12 sm:rounded-2xl sm:text-lg">
                M
              </span>
              <h2 className="mt-2.5 font-bold font-bricolage text-brand-navy text-lg sm:mt-4 sm:text-3xl">
                Kamu bisa bertanya apa saja
              </h2>
              <p className="mt-1 max-w-md font-manrope text-muted-foreground text-xs sm:mt-1.5 sm:text-sm">
                Cari universitas, rekomendasi jurusan, sampai passing grade — dipersonalisasi buat kamu.
              </p>
              <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3">
                {EMPTY_CARDS.map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => sendText(card.prompt)}
                    className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-orange/50 hover:shadow-md sm:gap-1.5 sm:rounded-2xl sm:p-4"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-navy sm:size-9 sm:rounded-xl">
                      {card.icon}
                    </span>
                    <span className="font-manrope font-semibold text-brand-navy text-xs sm:text-sm">{card.title}</span>
                    <span className="font-manrope text-[11px] text-muted-foreground sm:text-xs">{card.desc}</span>
                  </button>
                ))}
              </div>
              {(ctx?.school || ctx?.riasecPrimary) && (
                <p className="mt-6 font-manrope text-muted-foreground text-xs">
                  Konteks kamu: {[ctx.school, ctx.riasecPrimary].filter(Boolean).join(" · ")}
                </p>
              )}
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
              {(() => {
                const prevU = idx > 0 ? messages[idx - 1] : null;
                const blockKey = prevU && prevU.role === "user" ? `b${prevU.id}` : null;
                const block = blockKey ? branchState[blockKey] : undefined;
                const hasBranch = !!block && block.versions.length > 1;
                const useStored = hasBranch && block?.active < block?.versions.length - 1;
                const stored = useStored ? block?.versions[block?.active] : "";
                const msgPartsTxt = (m.parts ?? [])
                  .map((pp: any) => ((pp.kind ?? pp.type) === "text" ? (pp.text ?? "") : ""))
                  .join("");
                const msgHasTool = (m.parts ?? []).some((pp: any) => {
                  const k = pp.kind ?? pp.type;
                  return k === "tool-invocation" || k === "tool";
                });
                return (
                  <MessageBranch defaultBranch={0} key={`br-${m.id}`}>
                    <MessageBranchContent>
                      <Message from={m.role === "user" ? "user" : "assistant"}>
                        {(() => {
                          const isUser = m.role === "user";
                          const showBubble = isUser || msgPartsTxt.length > 0 || msgHasTool;
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
                                        className="my-1 overflow-hidden rounded-lg border border-border bg-card"
                                      >
                                        <TaskTrigger title="" asChild>
                                          <div className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5">
                                            <span className="flex min-w-0 items-center gap-1.5 font-manrope font-medium text-[11px] text-brand-navy">
                                              {done ? (
                                                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                                              ) : (
                                                <LoaderCircle className="size-3.5 shrink-0 animate-spin text-brand-orange" />
                                              )}
                                              <span className="truncate">
                                                {TOOL_LABELS[ti.toolName ?? ti.name ?? ""] ??
                                                  ti.toolName ??
                                                  ti.name ??
                                                  "tool"}
                                              </span>
                                            </span>
                                            <span
                                              className={`shrink-0 font-manrope text-[10px] ${
                                                done ? "text-emerald-600" : "animate-pulse text-muted-foreground"
                                              }`}
                                            >
                                              {done ? "✓ selesai" : "berjalan…"}
                                            </span>
                                          </div>
                                        </TaskTrigger>
                                        <TaskContent>
                                          <pre className="overflow-x-auto bg-muted/40 p-3 font-mono text-[10px] text-text-muted-custom leading-relaxed">
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
                        {m.role === "assistant" &&
                          !(busy && idx === messages.length - 1) &&
                          (msgHasTool || msgPartsTxt.length > 0) && (
                            <MessageToolbar className="mt-1! gap-1.5">
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
                                <MessageAction
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Bermanfaat"
                                  aria-label="Feedback positif"
                                  className={feedbackState[m.id] === "up" ? "bg-brand-orange/10 text-brand-orange" : ""}
                                  onClick={() => void sendFeedback(m, "up")}
                                >
                                  <ThumbsUp className="size-3.5" />
                                </MessageAction>
                                <MessageAction
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Kurang bermanfaat"
                                  aria-label="Feedback negatif"
                                  className={
                                    feedbackState[m.id] === "down" ? "bg-brand-orange/10 text-brand-orange" : ""
                                  }
                                  onClick={() => void sendFeedback(m, "down")}
                                >
                                  <ThumbsDown className="size-3.5" />
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
          <div className="flex flex-col gap-1 px-2 pt-1.5 pb-0.5">
            <div id="tour-skills" className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {SKILLS.map((sk) => (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => setSkill(sk.id)}
                  title={sk.desc}
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-manrope text-[10px] transition-colors ${
                    skill === sk.id
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-border bg-card text-brand-navy hover:bg-muted"
                  }`}
                >
                  {sk.icon}
                  {sk.name}
                </button>
              ))}
            </div>
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
        {quotaOut && (
          <div className="mx-1 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 sm:mx-3 sm:gap-3 sm:px-4 sm:py-3">
            <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-red-500" />
            <div>
              <p className="font-manrope font-semibold text-red-600 text-sm">
                Kuota harian habis ({dailyLimit}/{dailyLimit} terpakai)
              </p>
              <p className="mt-0.5 font-manrope text-red-500/90 text-xs leading-relaxed">
                Kamu sudah memakai semua pertanyaan hari ini. Kuota di-reset otomatis besok (24 jam) — sampai jumpa
                besok ya, dan terima kasih sudah bertanya! 💙
              </p>
            </div>
          </div>
        )}

        <PromptInput id="tour-composer" onSubmit={handleSubmit} multiple className="w-full px-1.5 pt-1 pb-1">
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              readOnly={quotaOut}
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
                    id="tour-model"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full border border-gray-200 px-2.5 text-[11px] sm:px-3 sm:text-xs"
                  >
                    {current.icon}
                    {current.name}
                    <ChevronDownIcon className="size-3 text-muted-foreground" />
                  </Button>
                </ModelSelectorTrigger>
                <ModelSelectorContent
                  title="Pilih model"
                  className="overflow-hidden! rounded-2xl! border-border! bg-card! p-0! shadow-2xl! sm:max-h-[520px] sm:w-[430px]"
                >
                  <ModelSelectorInput
                    placeholder="Cari model…"
                    className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 font-manrope text-sm"
                  />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>Model tidak ditemukan.</ModelSelectorEmpty>
                    <ModelSelectorGroup
                      heading="Pilihan Mul.ai"
                      className="px-3 pb-1 font-manrope font-semibold text-[10px] text-muted-foreground uppercase tracking-wider"
                    >
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
            <PromptInputSubmit
              status={status}
              disabled={quotaOut}
              className="bg-brand-navy! text-white! hover:bg-brand-navy-light!"
            />
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
  const [activeId, setActiveId] = useState<string>(
    initialSessionId ??
      (typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_SESSION_KEY) : null) ??
      `s-${crypto.randomUUID().slice(0, 12)}`,
  );
  const [loadingSession, setLoadingSession] = useState(false);
  const activeIdRef = useRef<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourRect, setTourRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Tampilkan tour sekali (first-visit)
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mulai-ai-onboard-seen")) {
      setTourOpen(true);
    }
  }, []);
  useEffect(() => {
    if (!tourOpen) return;
    const target = document.getElementById(TOUR_STEPS[tourStep].target);
    const update = () => {
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      const r = target.getBoundingClientRect();
      setTourRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [tourOpen, tourStep]);
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
    setLoadingSession(true);
    setMobileListOpen(false);
    if (id !== activeIdRef.current) {
      // ChatRuntime ganti key hanya setelah history siap → TIDAK blank.
    }
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
    setLoadingSession(false);
    setReady(true);
    activeIdRef.current = id;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: openSession dibuat ulang tiap render — cukup trigger param
  useEffect(() => {
    if (paramId) {
      void openSession(paramId);
    } else if (initialSessionId) {
      void openSession(initialSessionId);
    } else if (process.env.NEXT_PUBLIC_CHAT_NO_REDIRECT !== "1") {
      const id = `s-${crypto.randomUUID().slice(0, 12)}`;
      window.localStorage.setItem(ACTIVE_SESSION_KEY, id);
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
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [dailyLeft, setDailyLeft] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState(40);
  const loadProfile = useCallback(async () => {
    if (!activeId) return;
    try {
      const r = await fetch(`${AI_BASE}/ai/context`, { headers: { [SESSION_HEADER]: activeId } });
      const d = (await r.json()) as any;
      setCtx(d?.profile ?? null);
    } catch {
      setCtx(null);
    }
    try {
      const r = await fetch(`${AI_BASE}/ai/quota`, {
        headers: { [SESSION_HEADER]: activeId, ...(userId ? { "x-user-id": userId } : {}) },
      });
      const d = (await r.json()) as any;
      setDailyLeft(typeof d?.daily?.remaining === "number" ? d.daily.remaining : null);
      if (typeof d?.daily?.limit === "number") setDailyLimit(d.daily.limit);
    } catch {
      /* nonblokir */
    }
  }, [activeId, userId]);

  // Gate kelengkapan profil — sekolah & jenjang wajib utk akses Mul.ai & tes
  const gateBlocked = ctx !== null && !(String(ctx.school || "").trim() && String(ctx.level || "").trim());
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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

  if (gateBlocked) {
    return (
      <div className="flex h-full min-h-0 w-full gap-2 p-2">
        <section className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <header
            id="tour-header"
            className="flex h-11 shrink-0 items-center gap-2 border-border border-b bg-card px-3"
          >
            <span className="flex size-6 items-center justify-center rounded-lg bg-brand-navy/10 font-manrope text-brand-navy text-xs">
              M
            </span>
            <h1 className="truncate font-bold font-bricolage text-brand-navy text-sm">Mul.ai</h1>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ProfileGate />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full gap-2 p-2 md:p-3">
      {/* Tour first-visit Mul.ai */}
      {tourOpen && tourRect && (
        <div className="fixed inset-0 z-[90]" style={{ pointerEvents: "none" }}>
          <div
            className="rounded-xl bg-transparent transition-all duration-300"
            style={{
              position: "absolute",
              top: tourRect.top - 4,
              left: tourRect.left - 4,
              width: tourRect.width + 8,
              height: tourRect.height + 8,
              boxShadow: "0 0 0 9999px rgba(9,9,11,0.55)",
            }}
          />
          <div
            className="absolute z-[91] max-w-[90vw] rounded-2xl border border-border bg-card p-4 shadow-2xl sm:max-w-sm"
            style={{
              pointerEvents: "auto",
              top: Math.min(tourRect.top + tourRect.height + 16, window.innerHeight - 190),
              left: Math.max(16, Math.min(tourRect.left, window.innerWidth - 360)),
            }}
          >
            <p className="font-manrope font-semibold text-[10px] text-brand-orange uppercase tracking-wider">
              {tourStep + 1} / {TOUR_STEPS.length}
            </p>
            <h4 className="mt-0.5 font-bold font-bricolage text-base text-brand-navy">{TOUR_STEPS[tourStep].title}</h4>
            <p className="mt-1 font-manrope text-muted-foreground text-sm leading-relaxed">
              {TOUR_STEPS[tourStep].desc}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("mulai-ai-onboard-seen", "1");
                  setTourOpen(false);
                }}
                className="font-manrope text-muted-foreground text-xs hover:text-brand-navy"
              >
                Lewati
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tourStep === 0}
                  onClick={() => setTourStep((v) => Math.max(0, v - 1))}
                  className="rounded-xl border border-border px-3 py-1.5 font-manrope text-brand-navy text-xs transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tourStep < TOUR_STEPS.length - 1) setTourStep((v) => v + 1);
                    else {
                      localStorage.setItem("mulai-ai-onboard-seen", "1");
                      setTourOpen(false);
                    }
                  }}
                  className="rounded-xl bg-brand-navy px-4 py-1.5 font-manrope font-semibold text-white text-xs transition-colors hover:bg-brand-navy-light"
                >
                  {tourStep < TOUR_STEPS.length - 1 ? "Lanjut" : "Mulai pakai"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar percakapan */} {/* Sidebar percakapan */}
      {showSidebar && (
        <aside className="hidden min-h-0 w-[264px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white lg:flex">
          <div className="flex items-center justify-between border-border border-b p-2.5">
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
              onClick={() => void handleNewChat()}
              className="w-full gap-1.5 rounded-xl bg-brand-navy font-manrope text-white text-xs transition-colors hover:bg-brand-navy-light"
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
                  onClick={() => {
                    if (s.id !== activeId) (router.push as any)(`/dashboard/student/assistant/chat/${s.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (router.push as any)(`/dashboard/student/assistant/chat/${s.id}`);
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

          {/* Profil & kuota — mentok bawah list chat */}
          <div className="mt-auto space-y-2 border-border border-t px-3 py-3">
            {(ctx?.school || ctx?.riasecPrimary) && (
              <div className="flex flex-wrap gap-1.5">
                {ctx?.school && (
                  <span className="rounded-full bg-brand-navy/5 px-2 py-1 font-manrope text-[10px] text-brand-navy">
                    🏫 {ctx.school}
                  </span>
                )}
                {ctx?.riasecPrimary && (
                  <span className="rounded-full bg-brand-orange/10 px-2 py-1 font-manrope text-[10px] text-brand-orange">
                    🧭 {ctx.riasecPrimary}
                  </span>
                )}
              </div>
            )}
            {dailyLeft !== null && (
              <div>
                <div className="flex items-center justify-between pb-1 font-manrope text-[10px] text-muted-foreground">
                  <span>
                    🗨️ {Math.max(0, dailyLimit - dailyLeft)}/{dailyLimit} hari ini
                  </span>
                  {dailyLeft <= 0 ? (
                    <span className="font-semibold text-red-500">habis·besok reset</span>
                  ) : (
                    <span>reset besok</span>
                  )}
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dailyLeft <= 0
                        ? "bg-red-500"
                        : dailyLeft <= Math.ceil(dailyLimit * 0.2)
                          ? "bg-brand-orange"
                          : "bg-brand-orange/70"
                    }`}
                    style={{ width: `${Math.min(100, Math.round(((dailyLimit - dailyLeft) / dailyLimit) * 100))}%` }}
                  />
                </div>
              </div>
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
      {/* Mobile: drawer percakapan — selalu ter-mount, transisi smooth (bukan cilukba) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileListOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileListOpen}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: scrim overlay tutup drawer */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: scrim overlay tutup drawer */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${
            mobileListOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileListOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-[86vw] max-w-[340px] flex-col bg-card shadow-2xl transition-transform duration-300 ease-out ${
            mobileListOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-border border-b p-3">
            <h2 className="font-bold font-bricolage text-brand-navy text-sm">Percakapan</h2>
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => setMobileListOpen(false)}
              className="flex size-7 items-center justify-center rounded-md text-text-muted-custom transition-colors hover:bg-muted"
            >
              ✕
            </button>
          </div>
          <div className="p-2">
            <Button
              type="button"
              onClick={() => void handleNewChat()}
              className="w-full gap-1.5 rounded-xl bg-brand-navy font-manrope text-white text-xs transition-colors hover:bg-brand-navy-light"
            >
              <PlusIcon className="size-4" /> Percakapan baru
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-6">
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
                  onClick={() => {
                    if (s.id !== activeId) (router.push as any)(`/dashboard/student/assistant/chat/${s.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (router.push as any)(`/dashboard/student/assistant/chat/${s.id}`);
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
          <div className="border-border border-t px-3 py-2 font-manrope text-[10px] text-text-muted-custom">
            Kelola: pilih untuk lanjut · ✏️ ubah judul · 🗑 hapus
          </div>
          <div className="border-border border-t px-3 py-2.5">
            {(ctx?.school || ctx?.riasecPrimary) && (
              <div className="flex flex-wrap gap-1.5 pb-2">
                {ctx?.school && (
                  <span className="rounded-full bg-brand-navy/5 px-2 py-1 font-manrope text-[10px] text-brand-navy">
                    🏫 {ctx.school}
                  </span>
                )}
                {ctx?.riasecPrimary && (
                  <span className="rounded-full bg-brand-orange/10 px-2 py-1 font-manrope text-[10px] text-brand-orange">
                    🧭 {ctx.riasecPrimary}
                  </span>
                )}
              </div>
            )}
            {dailyLeft !== null && (
              <div>
                <div className="flex items-center justify-between pb-1 font-manrope text-[10px] text-muted-foreground">
                  <span>
                    🗨️ {Math.max(0, dailyLimit - dailyLeft)}/{dailyLimit} hari ini
                  </span>
                  {dailyLeft <= 0 ? (
                    <span className="font-semibold text-red-500">habis·besok reset</span>
                  ) : (
                    <span>reset besok</span>
                  )}
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dailyLeft <= 0
                        ? "bg-red-500"
                        : dailyLeft <= Math.ceil(dailyLimit * 0.2)
                          ? "bg-brand-orange"
                          : "bg-brand-orange/70"
                    }`}
                    style={{ width: `${Math.min(100, Math.round(((dailyLimit - dailyLeft) / dailyLimit) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Panel utama chat */}
      <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <header
          id="tour-header"
          className="flex shrink-0 items-center gap-2 border-border border-b bg-card px-3 py-2.5"
        >
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
            Mul.ai
            {active && (
              <span className="ml-2 font-manrope font-normal text-[10px] text-text-muted-custom">· {active.title}</span>
            )}
          </h1>
        </header>

        {!ready || loadingSession ? (
          <ChatSkeleton />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatRuntime
              key={activeId}
              sessionId={activeId}
              userId={userId}
              initialMessages={history}
              ctx={ctx}
              dailyLeft={dailyLeft}
              dailyLimit={dailyLimit}
              onChanged={() => {
                void refreshSessions();
                void loadProfile();
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
