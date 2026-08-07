"use client";

import { env } from "@mulai-plus/env/web";
import { MessageSquare, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "@/components/ui/chat";
import type { Message } from "@/components/ui/chat-message";
import { cn } from "@/lib/utils";

const RAW_BASE = env.NEXT_PUBLIC_SERVER_URL;
const AI_BASE = typeof RAW_BASE === "string" && RAW_BASE ? RAW_BASE.replace(/\/$/, "") : "";
const API_CHAT = `${AI_BASE}/ai/chat`;
const SESSION_KEY = "chatbot_session_id";
const HISTORY_LIMIT = 20;
const META_TIMEOUT = 8_000; // history/quota timeout
const SEND_TIMEOUT = 45_000; // batas total stream (LLM bisa 30s+)

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
    try {
      localStorage.setItem(SESSION_KEY, sid);
    } catch {
      /* storage penuh/private — pakai in-memory */
    }
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

/** fetch dengan timeout — sinyal eksternal (stop/unmount) tetap dihormati */
async function fetchWithTimeout(url: string, opts: RequestInit, timeout: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const ext = opts.signal;
  const onExtAbort = () => ctrl.abort();
  if (ext) {
    if (ext.aborted) ctrl.abort();
    else ext.addEventListener("abort", onExtAbort);
  }
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    ext?.removeEventListener("abort", onExtAbort);
  }
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
  const [conn, setConn] = useState<"loading" | "ok" | "error">("loading");
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // ── Load history + quota (dengan timeout & retry 1x) ──
  const loadMeta = useCallback(async (attempt = 0) => {
    if (!AI_BASE || !mountedRef.current) return;
    setConn((c) => (c === "ok" ? c : "loading"));
    const sid = getSessionId();
    try {
      const [histRes, quotaRes] = await Promise.all([
        fetchWithTimeout(
          `${AI_BASE}/ai/history?session_id=${sid}&limit=${HISTORY_LIMIT}&offset=0`,
          { credentials: "include" },
          META_TIMEOUT,
        ),
        fetchWithTimeout(`${AI_BASE}/ai/quota?session_id=${sid}`, { credentials: "include" }, META_TIMEOUT),
      ]);
      let anyOk = false;
      if (histRes.ok) {
        anyOk = true;
        const data = await histRes.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => {
            const byId = new Map(prev.map((m) => [m.id, m]));
            for (const m of data.messages) {
              const id = String(m.id);
              if (!byId.has(id)) byId.set(id, toKitMessage(m));
            }
            return [...byId.values()];
          });
        }
      }
      if (quotaRes.ok) {
        anyOk = true;
        const d = await quotaRes.json();
        if (typeof d.remaining === "number") setRemaining(d.remaining);
        if (typeof d.remaining === "number" && d.remaining <= 0) {
          setRequiresAuth(true);
          setRedirectUrl(d.redirect_url ?? "");
        }
      }
      if (mountedRef.current) setConn(anyOk ? "ok" : "error");
      if (!anyOk && attempt === 0) {
        setTimeout(() => loadMeta(1), 1200);
      }
    } catch {
      if (mountedRef.current) setConn("error");
      if (attempt === 0) setTimeout(() => loadMeta(1), 1200);
    }
  }, []);

  // ── Mount: load + reopen flow ──
  useEffect(() => {
    mountedRef.current = true;
    loadMeta();

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

    // Abort in-flight stream saat komponen lepas (pindah halaman/hard nav)
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [loadMeta]);

  // ── Refresh state tiap panel dibuka (biar selalu fresh setelah pindah halaman) ──
  useEffect(() => {
    if (open) {
      loadMeta(0);
      setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Write your prompt here"]')?.focus();
      }, 300);
    }
  }, [open, loadMeta]);

  // ── Send message (SSE streaming, retry 1x, partial reply disimpan) ──
  const sendMessage = useCallback(
    async (text: string, attempt = 0) => {
      if (!AI_BASE || loading) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      // Auth gate: jangan append user message kalau quota habis
      if (requiresAuth) {
        setConn("ok");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date() },
      ]);
      setInput("");
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetchWithTimeout(
          API_CHAT,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
            credentials: "include",
            body: JSON.stringify({ message: trimmed, session_id: getSessionId() }),
            signal: controller.signal,
          },
          SEND_TIMEOUT,
        );
        if (!res.ok) throw new Error(`API error ${res.status}`);

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

        // SSE path: server kirim event `data: {...full_reply...}`
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let buf = "";
        let reply = "";
        let dbId: string | null = null;
        let suggested: string[] | null = null;
        let streamError: Error | null = null;

        try {
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
                /* skip parse error per-baris */
              }
            }
          }
        } catch (e) {
          streamError = e instanceof Error ? e : new Error("stream error");
        }

        if (streamError && !reply) {
          // Stream putus tanpa hasil → retry sekali kalau belum
          throw streamError;
        }

        if (reply) {
          setMessages((prev) => [
            ...prev,
            { id: dbId ?? crypto.randomUUID(), role: "assistant", content: reply, createdAt: new Date() },
          ]);
          if (suggested) setSuggestions(suggested);
        } else if (streamError) {
          // Ada reply parsial tapi stream putus — simpan + tandai
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `${reply}\n\n_*(koneksi terputus — coba tanya lagi ya)*_`,
              createdAt: new Date(),
            },
          ]);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // user stop / unmount — tanpa pesan
          return;
        }
        // retry sekali (kecuali sudah retry atau auth gate)
        if (attempt === 0 && !requiresAuth) {
          // hapus pesan user yang tadi, biar tidak duplikat
          setMessages((prev) => prev.slice(0, -1));
          setLoading(false);
          setTimeout(() => sendMessage(trimmed, 1), 700);
          return;
        }
        setConn("error");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Maaf, koneksi ke asisten lagi bermasalah. Coba lagi sebentar ya 🙏",
            createdAt: new Date(),
          },
        ]);
      } finally {
        if (mountedRef.current) setLoading(false);
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
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: fb } : m)));
    fetch(`${AI_BASE}/ai/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: dbId, feedback: fb }),
    }).catch(() => {});
  }, []);

  // Kalau env server tidak terisi — jangan render apa-apa (hindari crash seluruh page)
  if (!AI_BASE) return null;

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
          "fixed z-[60] flex flex-col overflow-hidden border border-gray-200/80 bg-white shadow-2xl transition-all duration-300",
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
                {conn === "error"
                  ? "AI sedang tidak tersedia"
                  : remaining !== null
                    ? `${remaining} chat tersisa`
                    : "Tanya apa aja"}
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

        {/* Koneksi error banner */}
        {conn === "error" && !requiresAuth && (
          <div className="flex shrink-0 items-center gap-2 border-red-100 border-b bg-red-50 px-4 py-2">
            <p className="flex-1 font-manrope text-red-700 text-xs">Koneksi ke asisten bermasalah — riwayatmu aman.</p>
            <button
              type="button"
              onClick={() => loadMeta(0)}
              className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-bold font-manrope text-red-700 text-xs shadow-sm transition-colors hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3" /> Coba lagi
            </button>
          </div>
        )}

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
