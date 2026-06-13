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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // Load chat history on mount
  useEffect(() => {
    fetch(`/ai/history?session_id=${getSessionId()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
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
          "group fixed right-5 bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110 hover:shadow-2xl",
          open ? "hidden" : "flex",
          "bg-gradient-to-br from-brand-navy to-brand-navy/90",
        )}
        aria-label="Buka chat"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </button>

      <div
        className={cn(
          "fixed right-4 bottom-4 z-50 flex w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl transition-all duration-300 sm:right-6 sm:bottom-6",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
          "h-[560px] max-h-[80vh]",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand-navy to-brand-navy/90 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold font-bricolage text-sm text-white">MULAI+ AI</p>
              <p className="font-manrope text-[10px] text-white/60">
                {remaining !== null ? `${remaining} chat tersisa` : "Tanya apa aja"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && !streamContent ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy/10">
                <Sparkles className="h-7 w-7 text-brand-navy" />
              </div>
              <p className="font-bold font-bricolage text-brand-navy text-sm">Halo! 👋</p>
              <p className="mt-1 mb-4 max-w-xs font-manrope text-gray-500 text-xs leading-relaxed">
                Aku asisten MULAI+. Tanya seputar universitas, jurusan, passing grade, atau program mentoring!
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  "Cari universitas negeri di Jawa Timur",
                  "Rekomendasi jurusan untuk anak IPA",
                  "Info beasiswa mentoring",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="rounded-xl border border-gray-200 px-3.5 py-2 font-manrope text-gray-600 text-xs transition-all hover:border-brand-navy/30 hover:bg-brand-navy/5 hover:text-brand-navy"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
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
                      <span className="mt-0.5 px-1 font-manrope text-[9px] text-gray-400">
                        {formatTime(msg.createdAt)}
                      </span>
                    )}
                  </div>

                  {msg.id && msg.role === "assistant" && (
                    <div className="mt-0.5 ml-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => submitFeedback(msg.id!, "up")}
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded transition-colors",
                          msg.feedback === "up" ? "bg-green-50 text-green-600" : "text-gray-400 hover:text-gray-600",
                        )}
                      >
                        <ThumbsUp className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => submitFeedback(msg.id!, "down")}
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded transition-colors",
                          msg.feedback === "down" ? "bg-red-50 text-red-600" : "text-gray-400 hover:text-gray-600",
                        )}
                      >
                        <ThumbsDown className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming message with typewriter */}
              {streamContent && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-2xl bg-gray-100 px-3.5 py-2.5 text-gray-800 text-sm leading-relaxed">
                    <TypewriterMessage content={streamContent} />
                  </div>
                  {streamCreatedAt && (
                    <span className="mt-0.5 px-1 font-manrope text-[9px] text-gray-400">
                      {formatTime(streamCreatedAt)}
                    </span>
                  )}
                </div>
              )}

              {loading && !streamContent && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3.5 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="font-manrope text-gray-500 text-xs">Mengetik...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Auth gate */}
        {requiresAuth && (
          <div className="shrink-0 border-gray-100 border-t bg-amber-50 px-4 py-3">
            <p className="mb-2 font-manrope text-amber-800 text-xs">
              Chat gratis habis! Daftar untuk lanjut konsultasi.
            </p>
            <a href="/login?utm_source=chatbot&utm_medium=widget&utm_campaign=chat_limit" className="block">
              <Button className="w-full rounded-xl bg-brand-navy font-manrope text-white text-xs hover:bg-brand-navy/90">
                Login / Daftar Gratis
              </Button>
            </a>
          </div>
        )}

        {/* Input */}
        {!requiresAuth && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="shrink-0 border-gray-100 border-t p-3"
          >
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya sesuatu..."
                className="h-10 rounded-xl border-gray-200 bg-gray-50 font-manrope text-sm placeholder:text-gray-400"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl bg-brand-navy text-white hover:bg-brand-navy/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
