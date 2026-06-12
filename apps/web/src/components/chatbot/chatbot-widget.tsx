"use client";

import { Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_ENDPOINT = "/ai/chat";
const SESSION_KEY = "mulaiplus-chat-session";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
}

interface ChatResponse {
  reply: string;
  session_id: string;
  requires_auth: boolean;
  remaining: number | null;
  suggested_questions: string[] | null;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    // crypto.randomUUID() fallback
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      // If already requires auth, don't send API call
      if (requiresAuth) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": getSessionId(),
          },
          body: JSON.stringify({ message: text, session_id: getSessionId() }),
        });

        if (!res.ok) throw new Error("API error");

        const data: ChatResponse = await res.json();
        const botMsg: ChatMessage = {
          role: "assistant",
          content: data.reply,
          followUps: data.suggested_questions ?? undefined,
        };

        setMessages((prev) => [...prev, botMsg]);
        setRemaining(data.remaining);
        setRequiresAuth(data.requires_auth);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Maaf, terjadi kesalahan. Coba lagi ya! 🙏",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, requiresAuth],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleFollowUpClick = (q: string) => {
    if (requiresAuth) {
      window.location.href = "/login?utm_source=chatbot&utm_medium=widget&utm_campaign=followup";
    } else {
      sendMessage(q);
    }
  };

  const handleSuggested = (q: string) => {
    sendMessage(q);
  };

  return (
    <>
      {/* Floating button */}
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

      {/* Chat panel */}
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
          {messages.length === 0 ? (
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
                    onClick={() => handleSuggested(q)}
                    className="rounded-xl border border-gray-200 px-3.5 py-2 font-manrope text-gray-600 text-xs transition-all hover:border-brand-navy/30 hover:bg-brand-navy/5 hover:text-brand-navy"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
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
                  </div>
                  {/* Follow-up suggestion boxes */}
                  {msg.followUps && msg.followUps.length > 0 && (
                    <div className="mt-2 ml-2 flex flex-col gap-1.5">
                      {msg.followUps.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleFollowUpClick(q)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-left font-manrope text-gray-700 text-xs shadow-xs transition-all hover:border-brand-navy/30 hover:bg-brand-navy/[0.02] hover:text-brand-navy hover:shadow-sm"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
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
          <form onSubmit={handleSubmit} className="shrink-0 border-gray-100 border-t p-3">
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
