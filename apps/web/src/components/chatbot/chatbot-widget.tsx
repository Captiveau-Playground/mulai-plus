"use client";

import { env } from "@mulai-plus/env/web";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Check, Copy, Loader2, MessageSquare, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────

const AI_BASE = env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, "");
const API_CHAT = `${AI_BASE}/ai/chat`;
const SESSION_KEY = "mulaiplus-chat-session";
const PAGE_SIZE = 10;

// ─── Types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  feedback?: string | null;
}

interface StreamMetadata {
  session_id: string;
  message_id: number;
  created_at: string;
  remaining: number;
  requires_auth: boolean;
  suggested_questions: string[] | null;
  full_reply: string;
  redirect_url?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function formatTime(isoStr?: string): string {
  if (!isoStr) return "";
  return format(new Date(isoStr), "HH:mm", { locale: id });
}

// ─── Typewriter ───────────────────────────────────────────────────────────

function useTypewriter(fullText: string, speed = 15) {
  const [displayed, setDisplayed] = useState("");
  const ref = useRef(0);

  useEffect(() => {
    if (!fullText) return;
    ref.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        if (ref.current < fullText.length) {
          ref.current++;
          return fullText.slice(0, ref.current);
        }
        clearInterval(interval);
        return prev;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [fullText, speed]);

  return displayed;
}

// ─── Markdown Components ──────────────────────────────────────────────────

const mdComponents = {
  strong: ({ children }: any) => <strong className="font-bold text-gray-900">{children}</strong>,
  em: ({ children }: any) => <em className="text-gray-700 italic">{children}</em>,
  p: ({ children }: any) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }: any) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  li: ({ children }: any) => <li className="text-gray-800 leading-relaxed">{children}</li>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
      {children}
    </a>
  ),
  h1: ({ children }: any) => <h1 className="mt-3 mb-1 font-bold text-base text-gray-900">{children}</h1>,
  h2: ({ children }: any) => <h2 className="mt-2 mb-1 font-bold text-gray-900 text-sm">{children}</h2>,
  h3: ({ children }: any) => <h3 className="mt-2 mb-1 font-semibold text-gray-800 text-sm">{children}</h3>,
  code: ({ children, className }: any) => {
    if (!className)
      return <code className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-pink-600 text-sm">{children}</code>;
    return (
      <code className="block w-full overflow-x-auto rounded-lg bg-gray-900 p-3 font-mono text-gray-100 text-sm">
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => <div className="my-2">{children}</div>,
  table: ({ children }: any) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }: any) => <th className="px-3 py-2 text-left font-semibold text-gray-700">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2 text-gray-600">{children}</td>,
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 border-brand-navy/30 border-l-4 pl-3 text-gray-500 italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
};

function TypewriterMessage({ content }: { content: string }) {
  const displayed = useTypewriter(content);
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {displayed || "█"}
    </ReactMarkdown>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────

export function ChatbotWidget() {
  // ── State ────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamCreatedAt, _setStreamCreatedAt] = useState<string>("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const [totalHistory, setTotalHistory] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // ── Refs ──────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingHistoryRef = useRef(false); // guard double-fetch
  const hasUserScrolledRef = useRef(false); // prevent auto-load on mount
  const historyFullyLoadedRef = useRef(false); // shortcut once all loaded
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Safety timeout: force-clear loading ──────────────
  useEffect(() => {
    if (loading) {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setStreamContent("");
      }, 30_000);
    }
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [loading]);

  // ── Scroll helpers ────────────────────────────────────
  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (!force) {
      const threshold = 120;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      if (!isNearBottom) return; // user sedang baca history — jangan ganggu
    }
    bottomRef.current?.scrollIntoView({ behavior: force ? "instant" : "smooth" });
  }, []);

  // Initial load: paksa ke bawah. Load more / chat baru: cek posisi user
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // ResizeObserver — scroll ke bawah kalo user di bawah
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => scrollToBottom());
    obs.observe(el);
    return () => obs.disconnect();
  }, [scrollToBottom]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // ── Load history ──────────────────────────────────────
  const fetchHistory = useCallback(async (offset: number) => {
    if (loadingHistoryRef.current || historyFullyLoadedRef.current) return;
    loadingHistoryRef.current = true;
    setLoadingHistory(true);

    const prevScroll = scrollRef.current?.scrollHeight ?? 0;

    try {
      const res = await fetch(
        `${AI_BASE}/ai/history?session_id=${getSessionId()}&limit=${PAGE_SIZE}&offset=${offset}`,
        { credentials: "include" },
      );
      const data = await res.json();

      if (data.messages?.length > 0) {
        const mapped: ChatMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        }));

        if (offset === 0) {
          setMessages(mapped);
          // Initial load: tunggu DOM render dulu, baru scroll ke bawah
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              bottomRef.current?.scrollIntoView({ behavior: "instant" });
            });
          });
        } else {
          setMessages((prev) => [...mapped, ...prev]);
          // Preserve scroll position after prepend
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const el = scrollRef.current;
              if (el) {
                el.scrollTop = el.scrollHeight - prevScroll;
              }
            });
          });
        }

        setTotalHistory(data.total);
        if (data.total <= offset + mapped.length) {
          historyFullyLoadedRef.current = true;
        }
      } else {
        historyFullyLoadedRef.current = true;
      }
    } catch {
      // silent
    }

    loadingHistoryRef.current = false;
    setLoadingHistory(false);
  }, []);

  // Initial load on mount
  useEffect(() => {
    fetchHistory(0);
    // Quota check
    fetch(`${AI_BASE}/ai/quota?session_id=${getSessionId()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: any) => {
        if (d.remaining <= 0) {
          setRequiresAuth(true);
          setRedirectUrl(d.redirect_url ?? "");
        }
      })
      .catch(() => {});

    const reopen = localStorage.getItem("chatbot_reopen");
    if (reopen === "true") {
      localStorage.removeItem("chatbot_reopen");
      setOpen(true);
      const redirect = localStorage.getItem("chatbot_redirect");
      if (redirect && window.location.pathname !== redirect.split("?")[0]) {
        localStorage.removeItem("chatbot_redirect");
        window.location.href = redirect;
      }
    }
  }, [fetchHistory]);

  // ── Infinite scroll up ────────────────────────────────
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container) return;

    // Only activate after user explicitly scrolls up
    const handleScroll = () => {
      hasUserScrolledRef.current = true;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          messages.length < totalHistory &&
          !loadingHistoryRef.current &&
          hasUserScrolledRef.current
        ) {
          fetchHistory(messages.length);
        }
      },
      { root: container, rootMargin: "80px" },
    );
    obs.observe(sentinel);

    return () => {
      obs.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [messages.length, totalHistory, fetchHistory]);

  // ── Send message ──────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const now = new Date().toISOString();
      setMessages((prev) => [...prev, { role: "user", content: text, createdAt: now }]);
      setInput("");
      setLoading(true);
      setStreamContent("");

      if (requiresAuth) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(API_CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
          credentials: "include",
          body: JSON.stringify({ message: text, session_id: getSessionId() }),
        });
        if (!res.ok) throw new Error("API error");

        const ct = res.headers.get("content-type") ?? "";

        if (ct.includes("application/json")) {
          const data: any = await res.json();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.reply ?? "Chat habis. Login untuk lanjut.",
              createdAt: new Date().toISOString(),
            },
          ]);
          setRequiresAuth(data.requires_auth ?? true);
          setRedirectUrl(data.redirect_url ?? "");
          setRemaining(0);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buf = "";
        let msgId: number | null = null;
        let createdAt = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const d: StreamMetadata = JSON.parse(line.slice(6));
              msgId = d.message_id;
              createdAt = d.created_at;
              setRemaining(d.remaining);
              setRequiresAuth(d.requires_auth);
              setStreamContent(d.full_reply);
              if (d.redirect_url) setRedirectUrl(d.redirect_url);
            } catch {
              /* ignore parse errors */
            }
          }
        }

        // SSR stream finished — add to messages after typewriter
        if (!msgId && !createdAt) return;
        const _serverMsgId = msgId;
        const _serverCreatedAt = createdAt;

        // Wait for typewriter (~200ms buffer), then add to history
        const _content = streamContent;
        // Use a longer delay so typewriter runs smoothly
        // The actual streamContent state will be used in the cleanup effect below
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Maaf, terjadi kesalahan. Coba lagi ya! 🙏",
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, requiresAuth, streamContent],
  );

  // ── After streaming completes, persist to message list ──
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    if (prevLoadingRef.current && !loading && streamContent) {
      setMessages((prev) => {
        if (prev.some((m) => m.role === "assistant" && m.content === streamContent)) return prev;
        return [
          ...prev,
          {
            role: "assistant" as const,
            content: streamContent,
            createdAt: streamCreatedAt || new Date().toISOString(),
          },
        ];
      });
      const timer = setTimeout(() => setStreamContent(""), 100);
      return () => clearTimeout(timer);
    }
    prevLoadingRef.current = loading;
  }, [loading, streamContent, streamCreatedAt]);

  // ── Feedback ──────────────────────────────────────────
  const submitFeedback = async (messageId: number, fb: "up" | "down") => {
    if (feedbackLoading.has(messageId)) return;
    setFeedbackLoading((prev) => new Set(prev).add(messageId));
    try {
      await fetch(`${AI_BASE}/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, feedback: fb }),
      });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: fb } : m)));
    } catch {
      /* */
    }
    setFeedbackLoading((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110 hover:shadow-2xl sm:right-6 sm:bottom-6",
          open ? "hidden" : "flex",
          "bg-gradient-to-br from-brand-navy to-brand-navy/90",
        )}
        aria-label="Buka chat"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </button>

      <div
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden border border-gray-200/80 bg-white shadow-2xl transition-all duration-300",
          "right-4 bottom-4 left-4 h-[520px] max-h-[70vh] rounded-2xl",
          "sm:right-6 sm:bottom-6 sm:left-auto sm:h-[600px] sm:w-[400px]",
          "lg:h-[640px] lg:w-[440px]",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand-navy to-brand-navy/90 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 sm:h-9 sm:w-9">
              <Sparkles className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="font-bold font-bricolage text-sm text-white sm:text-base">MULAI+ AI</p>
              <p className="font-manrope text-[10px] text-white/60 sm:text-xs">
                {remaining !== null ? `${remaining} chat tersisa` : "Tanya apa aja"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10 sm:h-9 sm:w-9"
            aria-label="Tutup chat"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {messages.length === 0 && !streamContent ? (
            /* ── Empty state ── */
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10 sm:h-20 sm:w-20">
                <Sparkles className="h-8 w-8 text-brand-navy sm:h-10 sm:w-10" />
              </div>
              <p className="font-bold font-bricolage text-base text-brand-navy sm:text-lg">Halo! 👋</p>
              <p className="mt-1.5 mb-5 max-w-xs font-manrope text-gray-500 text-sm leading-relaxed sm:text-base">
                Aku asisten MULAI+. Tanya seputar universitas, jurusan, passing grade, atau program mentoring!
              </p>
              <div className="flex w-full flex-col gap-2 sm:max-w-sm">
                {[
                  "Cari universitas negeri di Jawa Timur",
                  "Rekomendasi jurusan untuk anak IPA",
                  "Info beasiswa mentoring",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 font-manrope text-gray-600 text-sm transition-all hover:border-brand-navy/30 hover:bg-brand-navy/5 hover:text-brand-navy active:scale-[0.98] sm:text-base"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Messages list ── */
            <div className="space-y-3 sm:space-y-2">
              {/* Sentinel */}
              <div ref={topSentinelRef} className="h-1" />
              {loadingHistory && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:px-3.5 sm:py-2.5",
                        msg.role === "user" ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-800",
                      )}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.createdAt && (
                      <span className="mt-0.5 px-1 font-manrope text-[10px] text-gray-400 sm:text-[9px]">
                        {formatTime(msg.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Assistant actions: thumbs + copy */}
                  {msg.id && msg.role === "assistant" && (
                    <div className="mt-0.5 ml-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => submitFeedback(msg.id!, "up")}
                        disabled={msg.feedback === "up" || feedbackLoading.has(msg.id!)}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded transition-colors sm:h-5 sm:w-5",
                          msg.feedback === "up" ? "bg-green-50 text-green-600" : "text-gray-400 hover:text-gray-600",
                          (msg.feedback === "up" || feedbackLoading.has(msg.id!)) && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => submitFeedback(msg.id!, "down")}
                        disabled={msg.feedback === "down" || feedbackLoading.has(msg.id!)}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded transition-colors sm:h-5 sm:w-5",
                          msg.feedback === "down" ? "bg-red-50 text-red-600" : "text-gray-400 hover:text-gray-600",
                          (msg.feedback === "down" || feedbackLoading.has(msg.id!)) && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <ThumbsDown className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(msg.content);
                          setCopiedId(msg.id!);
                          setTimeout(() => setCopiedId(null), 1500);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:text-gray-600 sm:h-5 sm:w-5"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500 sm:h-2.5 sm:w-2.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {streamContent && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[88%] rounded-2xl bg-gray-100 px-4 py-3 text-gray-800 text-sm leading-relaxed sm:max-w-[80%] sm:px-3.5 sm:py-2.5">
                    <TypewriterMessage content={streamContent} />
                  </div>
                  {streamCreatedAt && (
                    <span className="mt-0.5 px-1 font-manrope text-[10px] text-gray-400 sm:text-[9px]">
                      {formatTime(streamCreatedAt)}
                    </span>
                  )}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Typing indicator — fixed above input */}
        {loading && !streamContent && (
          <div className="flex shrink-0 items-center gap-2.5 border-gray-100 border-t bg-gray-50/50 px-4 py-3 sm:px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy/10">
              <Loader2 className="h-4 w-4 animate-spin text-brand-navy" />
            </div>
            <div>
              <p className="font-manrope font-medium text-brand-navy text-sm">Mengetik...</p>
              <p className="font-manrope text-gray-400 text-xs">AI sedang memproses jawaban</p>
            </div>
          </div>
        )}

        {/* Auth gate */}
        {requiresAuth && (
          <div className="shrink-0 border-gray-100 border-t bg-amber-50 px-4 py-4 sm:px-5 sm:py-3">
            <p className="mb-3 font-manrope text-amber-800 text-sm leading-relaxed sm:mb-2 sm:text-xs">
              {redirectUrl?.includes("wa.me")
                ? "Limit chat habis! Klik tombol di bawah untuk request tambahan."
                : "Chat gratis habis! Daftar untuk lanjut konsultasi."}
            </p>
            <button
              type="button"
              onClick={() => {
                if (redirectUrl) {
                  window.location.href = redirectUrl;
                } else {
                  const page = window.location.pathname + window.location.search;
                  localStorage.setItem("chatbot_reopen", "true");
                  localStorage.setItem("chatbot_redirect", page);
                  fetch(`${AI_BASE}/ai/track/login-click`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: getSessionId() }),
                  }).catch(() => {});
                  window.location.href = `/login?callbackUrl=${encodeURIComponent(page)}&utm_source=chatbot&utm_medium=widget&utm_campaign=chat_limit`;
                }
              }}
              className="w-full cursor-pointer rounded-xl bg-brand-navy px-5 py-3.5 font-manrope text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90 active:scale-[0.98] sm:px-4 sm:py-3"
            >
              {redirectUrl?.includes("wa.me") ? "Request via WhatsApp" : "Login / Daftar Gratis"}
            </button>
          </div>
        )}

        {/* Input */}
        {!requiresAuth && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="shrink-0 border-gray-100 border-t px-3 py-3 sm:px-4 sm:py-3"
          >
            <div className="flex gap-2.5 sm:gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya sesuatu..."
                className="h-12 rounded-xl border-gray-200 bg-gray-50 font-manrope text-sm placeholder:text-gray-400 sm:h-10"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="icon"
                className="h-12 w-12 shrink-0 rounded-xl bg-brand-navy text-white hover:bg-brand-navy/90 active:scale-[0.95] sm:h-10 sm:w-10"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
                ) : (
                  <Send className="h-5 w-5 sm:h-4 sm:w-4" />
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
