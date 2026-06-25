"use client";

import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, MessageSquare, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_ENDPOINT = "/ai/chat";
const SESSION_KEY = "mulaiplus-chat-session";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  followUps?: string[];
  feedback?: string | null;
  displayedContent?: string;
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

/** Typewriter: reveal text char by char */
function useTypewriter(fullText: string, speed = 15) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!fullText) return;
    indexRef.current = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      if (indexRef.current < fullText.length) {
        setDisplayed(fullText.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [fullText, speed]);

  return displayed;
}

function TypewriterMessage({ content }: { content: string }) {
  const displayed = useTypewriter(content);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        strong: ({ children }) => <span className="font-bold">{children}</span>,
        ul: ({ children }) => <ul className="my-1 list-disc pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 list-decimal pl-4">{children}</ol>,
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
            {children}
          </a>
        ),
      }}
    >
      {content ? displayed || "█" : ""}
    </ReactMarkdown>
  );
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamCreatedAt, setStreamCreatedAt] = useState<string>("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // Load history + auto-open after login
  useEffect(() => {
    fetch(`/ai/history?session_id=${getSessionId()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});

    // Cek sisa quota — kalo 0 langsung show CTA
    fetch(`/ai/quota?session_id=${getSessionId()}`)
      .then((r) => r.json())
      .then((data) => {
        setRemaining(data.remaining);
        if (data.remaining <= 0) {
          setRequiresAuth(true);
          setRedirectUrl(data.redirect_url || "");
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
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const now = new Date().toISOString();
      const userMsg: ChatMessage = { role: "user", content: text, createdAt: now };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setStreamContent("");

      if (requiresAuth) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
          body: JSON.stringify({ message: text, session_id: getSessionId() }),
        });
        if (!res.ok) throw new Error("API error");

        const contentType = res.headers.get("content-type") || "";

        // Handle JSON response (limit reached, not SSE)
        if (contentType.includes("application/json")) {
          const data = await res.json();
          const botMsg: ChatMessage = {
            role: "assistant",
            content: data.reply || "Chat habis. Login untuk lanjut.",
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botMsg]);
          setRequiresAuth(data.requires_auth ?? true);
          setRedirectUrl(data.redirect_url || "");
          setRemaining(0);
          return;
        }

        // Handle SSE stream
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data: StreamMetadata = JSON.parse(line.slice(6));
                setStreamMsgId(data.message_id);
                setStreamCreatedAt(data.created_at);
                setRemaining(data.remaining);
                setRequiresAuth(data.requires_auth);
                setStreamContent(data.full_reply);
                if (data.redirect_url) setRedirectUrl(data.redirect_url);
              } catch {}
            }
          }
        }
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
    [loading, requiresAuth],
  );

  const [streamMsgId, setStreamMsgId] = useState<number | null>(null);

  // When streaming finishes, add the message to history
  useEffect(() => {
    if (!streamContent || loading) return;

    const timer = setTimeout(() => {
      // Typewriter effect is handled by TypewriterMessage component
      // but we need to add the final message to history
      const botMsg: ChatMessage = {
        id: streamMsgId ?? undefined,
        role: "assistant",
        content: streamContent,
        createdAt: streamCreatedAt || new Date().toISOString(),
        followUps: undefined, // will be set after stream
      };

      // Check if we already have suggested questions (from stream metadata)
      // We need to store them - for now, set them after stream
      setMessages((prev) => {
        // Don't add duplicate if stream already added
        if (prev.some((m) => m.role === "assistant" && m.content === streamContent)) {
          return prev;
        }
        return [...prev, botMsg];
      });
      setStreamContent("");
      setStreamMsgId(null);
    }, 3000); // Wait for typewriter to finish

    return () => clearTimeout(timer);
  }, [streamContent, loading, streamMsgId, streamCreatedAt]);

  // Actually, let's use a simpler approach:
  // When stream finishes and loading stops, add to messages
  const prevLoading = useRef(loading);
  useEffect(() => {
    if (prevLoading.current && !loading && streamContent) {
      setMessages((prev) => {
        if (prev.some((m) => m.role === "assistant" && m.content === streamContent)) return prev;
        return [
          ...prev,
          {
            id: streamMsgId ?? undefined,
            role: "assistant" as const,
            content: streamContent,
            createdAt: streamCreatedAt || new Date().toISOString(),
          },
        ];
      });
      // Don't clear streamContent yet — typewriter still showing
      const t = setTimeout(() => {
        setStreamContent("");
        setStreamMsgId(null);
      }, 100);
      return () => clearTimeout(t);
    }
    prevLoading.current = loading;
  }, [loading, streamContent, streamMsgId, streamCreatedAt]);

  const submitFeedback = async (messageId: number, feedback: "up" | "down") => {
    try {
      await fetch("/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, feedback }),
      });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback } : m)));
    } catch {}
  };

  const _handleFollowUpClick = (q: string) => {
    if (requiresAuth) {
      window.location.href = "/login?utm_source=chatbot&utm_medium=widget&utm_campaign=followup";
    } else {
      sendMessage(q);
    }
  };

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
          // Mobile: full width with margin, not full height
          "right-4 bottom-4 left-4 h-[520px] max-h-[70vh] rounded-2xl",
          // Tablet: fixed width bottom-right
          "sm:right-6 sm:bottom-6 sm:left-auto sm:h-[600px] sm:w-[400px]",
          // Large screens
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
            <div className="space-y-3 sm:space-y-2">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:px-3.5 sm:py-2.5",
                        msg.role === "user" ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-800",
                      )}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({ children }) => <span className="font-bold">{children}</span>,
                          ul: ({ children }) => <ul className="my-1 list-disc pl-4">{children}</ul>,
                          ol: ({ children }) => <ol className="my-1 list-decimal pl-4">{children}</ol>,
                          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.createdAt && (
                      <span className="mt-0.5 px-1 font-manrope text-[10px] text-gray-400 sm:text-[9px]">
                        {formatTime(msg.createdAt)}
                      </span>
                    )}
                  </div>

                  {msg.id && msg.role === "assistant" && (
                    <div className="mt-0.5 ml-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => submitFeedback(msg.id!, "up")}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded transition-colors sm:h-5 sm:w-5",
                          msg.feedback === "up" ? "bg-green-50 text-green-600" : "text-gray-400 hover:text-gray-600",
                        )}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => submitFeedback(msg.id!, "down")}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded transition-colors sm:h-5 sm:w-5",
                          msg.feedback === "down" ? "bg-red-50 text-red-600" : "text-gray-400 hover:text-gray-600",
                        )}
                      >
                        <ThumbsDown className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming message with typewriter */}
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

              {loading && !streamContent && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2.5 rounded-2xl bg-gray-100 px-4 py-3 sm:gap-2 sm:px-3.5 sm:py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="font-manrope text-gray-500 text-xs sm:text-xs">Mengetik...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Auth gate */}
        {requiresAuth && (
          <div className="shrink-0 border-gray-100 border-t bg-amber-50 px-4 py-4 sm:px-5 sm:py-3">
            <p className="mb-3 font-manrope text-amber-800 text-sm leading-relaxed sm:mb-2 sm:text-xs">
              {remaining === 0 && redirectUrl.includes("wa.me")
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
                  window.location.href = `/login?callbackUrl=${encodeURIComponent(page)}&utm_source=chatbot&utm_medium=widget&utm_campaign=chat_limit`;
                }
              }}
              className="w-full cursor-pointer rounded-xl bg-brand-navy px-5 py-3.5 font-manrope text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90 active:scale-[0.98] sm:px-4 sm:py-3"
            >
              {redirectUrl.includes("wa.me") ? "Request via WhatsApp" : "Login / Daftar Gratis"}
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
