"use client";

import { env } from "@mulai-plus/env/web";
import { MessageSquare, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "@/components/ui/chat";
import type { Message } from "@/components/ui/chat-message";
import { cn } from "@/lib/utils";

const AI_BASE = env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, "");
const API_CHAT = `${AI_BASE}/ai/chat`;
const SESSION_KEY = "chatbot_session_id";
const HISTORY_LIMIT = 20;

const INITIAL_SUGGESTIONS = [
  "Cari universitas negeri di Jawa Timur",
  "Rekomendasi jurusan untuk anak IPA",
  "Info beasiswa mentoring",
];

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function toKitMessage(m: any): Message {
  return {
    id: m.id ? String(m.id) : crypto.randomUUID(),
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content ?? "",
    feedback: m.feedback === "up" ? "up" : m.feedback === "down" ? "down" : null,
    createdAt: m.created_at ? new Date(m.created_at) : new Date(),
  };
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load history + quota on mount ──
  useEffect(() => {
    fetch(`${AI_BASE}/ai/history?session_id=${getSessionId()}&limit=${HISTORY_LIMIT}&offset=0`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data: any) => {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages.map(toKitMessage));
        }
      })
      .catch(() => {});

    fetch(`${AI_BASE}/ai/quota?session_id=${getSessionId()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: any) => {
        if (typeof d.remaining === "number") setRemaining(d.remaining);
        if (d.remaining <= 0) {
          setRequiresAuth(true);
          setRedirectUrl(d.redirect_url ?? "");
        }
      })
      .catch(() => {});

    // Reopen flow (dari halaman login/WA)
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

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Write your prompt here"]')?.focus();
      }, 300);
    }
  }, [open]);

  // ── Send message (SSE streaming) ──
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date() },
      ]);
      setInput("");
      setLoading(true);

      if (requiresAuth) {
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(API_CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
          credentials: "include",
          body: JSON.stringify({ message: trimmed, session_id: getSessionId() }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("API error");

        const ct = res.headers.get("content-type") ?? "";

        // Sync (JSON) path
        if (ct.includes("application/json")) {
          const data: any = await res.json();
          setMessages((prev) => [
            ...prev,
            {
              id: data.message_id ? String(data.message_id) : crypto.randomUUID(),
              role: "assistant",
              content: data.reply ?? "Maaf, aku tidak bisa menjawab saat ini.",
              createdAt: new Date(),
            },
          ]);
          setRequiresAuth(data.requires_auth ?? false);
          setRedirectUrl(data.redirect_url ?? "");
          if (typeof data.remaining === "number") setRemaining(data.remaining);
          return;
        }

        // SSE path: server kirim 1 event `data: {...full_reply...}`
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let buf = "";
        let reply = "";
        let dbId: string | null = null;
        let suggested: string[] | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const d: any = JSON.parse(line.slice(6));
              if (d.full_reply) reply = d.full_reply;
              if (d.message_id) dbId = String(d.message_id);
              if (Array.isArray(d.suggested_questions) && d.suggested_questions.length > 0) {
                suggested = d.suggested_questions;
              }
              if (typeof d.remaining === "number") setRemaining(d.remaining);
              if (d.requires_auth) setRequiresAuth(true);
              if (d.redirect_url) setRedirectUrl(d.redirect_url);
            } catch {
              /* ignore parse errors */
            }
          }
        }

        if (reply) {
          setMessages((prev) => [
            ...prev,
            { id: dbId ?? crypto.randomUUID(), role: "assistant", content: reply, createdAt: new Date() },
          ]);
          if (suggested) setSuggestions(suggested);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return; // user stop — biarkan tanpa pesan
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Maaf, terjadi kesalahan. Coba lagi ya! 🙏",
            createdAt: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [loading, requiresAuth],
  );

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      sendMessage(input);
    },
    [input, sendMessage],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const append = useCallback((m: { role: "user"; content: string }) => sendMessage(m.content), [sendMessage]);

  const onRateResponse = useCallback((messageId: string, rating: "thumbs-up" | "thumbs-down") => {
    const dbId = Number(messageId);
    if (!dbId) return;
    const fb = rating === "thumbs-up" ? "up" : "down";
    // Update state biar tombol aktif langsung
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: fb } : m)));
    // Simpan ke backend
    fetch(`${AI_BASE}/ai/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: dbId, feedback: fb }),
    }).catch(() => {});
  }, []);

  return (
    <>
      {/* Floating button */}
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

      {/* Panel */}
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

        {/* Auth gate banner */}
        {requiresAuth && (
          <div className="shrink-0 border-gray-100 border-b bg-amber-50 px-4 py-3 sm:px-5 sm:py-2.5">
            <p className="mb-2 font-manrope text-amber-800 text-sm leading-relaxed sm:text-xs">
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
              className="w-full cursor-pointer rounded-lg bg-brand-navy px-4 py-2.5 font-manrope text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90 active:scale-[0.98] sm:py-2"
            >
              {redirectUrl?.includes("wa.me") ? "Request via WhatsApp" : "Login / Daftar Gratis"}
            </button>
          </div>
        )}

        {/* Chat (kit: MessageList + MessageInput + PromptSuggestions + TypingIndicator) */}
        <div className="min-h-0 flex-1 px-3 pt-3 pb-3 sm:px-4">
          <Chat
            messages={messages}
            input={input}
            handleInputChange={(e) => setInput(e.target.value)}
            handleSubmit={handleSubmit}
            isGenerating={loading}
            stop={stop}
            append={append}
            suggestions={suggestions}
            onRateResponse={onRateResponse}
            suggestionsLabel="Halo! 👋 Aku asisten MULAI+. Tanya seputar universitas, jurusan, passing grade, atau program mentoring:"
          />
        </div>
      </div>
    </>
  );
}
