"use client";

import {
  Ban,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { client } from "@/lib/client";

interface Session {
  id: string;
  user_id: string | null;
  is_auth: boolean;
  message_count: number;
  credit_limit: number | null;
  remaining: number | null;
  banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  notes: string | null;
  created_at: string;
  last_active: string | null;
  total_messages: number;
  total_cost: number;
  user_name: string | null;
  user_email: string | null;
  user_image: string | null;
}

interface SessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  per_page: number;
}

interface Message {
  id: number;
  role: string;
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  model: string | null;
  cost: number;
  feedback: string | null;
  created_at: string;
}

interface SessionDetail {
  id: string;
  user_id: string | null;
  is_auth: boolean;
  message_count: number;
  credit_limit: number | null;
  remaining: number | null;
  banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  notes: string | null;
  created_at: string;
  last_active: string | null;
  messages: Message[];
  total_messages: number;
  total_cost: number;
  user_name: string | null;
  user_email: string | null;
  user_image: string | null;
}

type ActionType = "credit" | "ban" | "notes" | null;

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatbotUsersPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [bannedOnly, setBannedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail dialog
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action dialogs
  const [actionSession, setActionSession] = useState<Session | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [creditValue, setCreditValue] = useState("");
  const [banReason, setBanReason] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const PER_PAGE = 20;
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSessions = useCallback(async (p: number, q: string, banned: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(p),
        per_page: String(PER_PAGE),
      });
      if (q) params.set("search", q);
      if (banned) params.set("banned_only", "true");

      const data: SessionsResponse = await client.ai.admin.sessions.list({
        page: p,
        per_page: PER_PAGE,
        search: q,
        banned_only: banned,
      });
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(page, search, bannedOnly);
  }, [page, bannedOnly, fetchSessions, search]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      fetchSessions(0, val, bannedOnly);
    }, 400);
  };

  const openDetail = async (sessionId: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data: SessionDetail = await client.ai.admin.sessions.get({ session_id: sessionId });
      setDetail(data);
    } catch {
      setError("Failed to load session detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeAction = () => {
    setActionSession(null);
    setActionType(null);
    setCreditValue("");
    setBanReason("");
    setNotesValue("");
  };

  const openAction = (session: Session, type: ActionType) => {
    setActionSession(session);
    setActionType(type);
    if (type === "credit") setCreditValue(session.credit_limit !== null ? String(session.credit_limit) : "");
    if (type === "ban") setBanReason(session.banned_reason || "");
    if (type === "notes") setNotesValue(session.notes || "");
  };

  const handleAction = async (sessionId: string, action: string, body: unknown) => {
    setActionLoading(true);
    try {
      const method = action === "credit" ? "updateCredit" : action === "ban" ? "toggleBan" : "updateNotes";
      await (client.ai.admin.sessions as any)[method]({ session_id: sessionId, ...(body as Record<string, unknown>) });
      closeAction();
      await fetchSessions(page, search, bannedOnly);
      if (detail?.id === sessionId) {
        openDetail(sessionId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Chatbot Users</h2>
          <p className="font-manrope text-sm text-text-muted-custom">
            Kelola session chat, credit limit, dan ban user.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-brand-navy/10 font-manrope text-brand-navy">{total} session</Badge>
          <Button
            onClick={() => fetchSessions(page, search, bannedOnly)}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari session / user ID..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 rounded-xl pl-9 font-manrope text-sm"
          />
        </div>
        <Select
          value={bannedOnly ? "banned" : "all"}
          onValueChange={(v) => {
            setBannedOnly(v === "banned");
            setPage(0);
          }}
        >
          <SelectTrigger className="h-10 w-[140px] rounded-xl font-manrope text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-manrope">
              Semua
            </SelectItem>
            <SelectItem value="banned" className="font-manrope">
              Banned Only
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && <div className="rounded-xl bg-red-50 p-4 font-manrope text-red-700 text-sm">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <MessageSquare className="mb-4 h-12 w-12 text-gray-300" />
          <p className="font-bricolage font-semibold text-gray-900">Tidak ada session</p>
          <p className="mt-1 font-manrope text-gray-500 text-sm">Belum ada pengguna chatbot.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-gray-100 border-b font-manrope text-text-muted-custom text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">User / Session</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Pesan</th>
                  <th className="px-4 py-3 text-center">Credit</th>
                  <th className="px-4 py-3 text-center">Sisa</th>
                  <th className="px-4 py-3 text-center">Biaya</th>
                  <th className="px-4 py-3 text-right">Terakhir</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <tr key={s.id} className="font-manrope text-sm transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(s.id)}
                        className="text-left hover:text-brand-orange"
                      >
                        {s.is_auth && s.user_name ? (
                          <>
                            <p className="font-medium text-brand-navy">
                              {s.user_name}
                              {s.user_email ? (
                                <span className="font-normal text-gray-400 text-xs"> · {s.user_email}</span>
                              ) : null}
                            </p>
                            <p className="text-[10px] text-gray-400">Authenticated · {s.user_id}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-brand-navy">{s.user_id || `${s.id.slice(0, 12)}...`}</p>
                            <p className="text-[10px] text-gray-400">Guest · {s.id.slice(0, 16)}...</p>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {s.banned ? (
                        <Badge className="bg-red-100 font-manrope text-[10px] text-red-700">
                          <Ban className="mr-1 h-3 w-3" /> Banned
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 font-manrope text-[10px] text-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{s.total_messages}</td>
                    <td className="px-4 py-3 text-center">
                      {s.credit_limit !== null ? (
                        <Badge className="bg-amber-100 font-manrope text-[10px] text-amber-700">
                          {s.credit_limit === -1 ? "∞" : s.credit_limit}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 font-manrope text-[10px] text-gray-500">
                          {s.is_auth ? 5 : 1}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.remaining === null ? (
                        <Badge className="bg-purple-100 font-manrope text-[10px] text-purple-700">∞</Badge>
                      ) : s.remaining > 0 ? (
                        <Badge className="bg-green-100 font-manrope text-[10px] text-green-700">{s.remaining}</Badge>
                      ) : (
                        <Badge className="bg-red-100 font-manrope text-[10px] text-red-700">0</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">${(s.total_cost ?? 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatDate(s.last_active)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(s, "credit")}
                          className="h-8 rounded-lg px-2 font-manrope text-[10px]"
                        >
                          Credit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(s, "ban")}
                          className="h-8 rounded-lg px-2 font-manrope text-[10px]"
                        >
                          {s.banned ? "Unban" : "Ban"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(s, "notes")}
                          className="h-8 rounded-lg px-2 font-manrope text-[10px]"
                        >
                          Notes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (window.confirm(`Reset usage untuk session ini? (${s.message_count} → 0)`)) {
                              setActionLoading(true);
                              try {
                                await client.ai.admin.sessions.resetUsage({ session_id: s.id });
                                await fetchSessions(page, search, bannedOnly);
                              } catch {}
                              setActionLoading(false);
                            }
                          }}
                          disabled={actionLoading}
                          className="h-8 rounded-lg px-2 font-manrope text-[10px] text-red-500 hover:text-red-700"
                        >
                          Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-gray-100 border-t px-4 py-3">
            <p className="font-manrope text-gray-400 text-xs">
              {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, total)} dari {total}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg font-manrope text-xs"
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PER_PAGE >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg font-manrope text-xs"
              >
                Next →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bricolage text-brand-navy">
              <Bot className="h-5 w-5" /> Chat Session
            </DialogTitle>
            <DialogDescription className="font-manrope">
              {detail?.is_auth && detail?.user_name ? `${detail.user_name} (${detail.user_email})` : detail?.id}·{" "}
              {detail?.is_auth ? "Authenticated" : "Guest"}
              {detail?.banned && (
                <Badge className="ml-2 bg-red-100 font-manrope text-[10px] text-red-700">Banned</Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <p className="font-manrope text-[10px] text-gray-400">Messages</p>
                  <p className="font-bold font-bricolage text-brand-navy">{detail.total_messages}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <p className="font-manrope text-[10px] text-gray-400">Biaya</p>
                  <p className="font-bold font-bricolage text-brand-navy">${detail.total_cost.toFixed(4)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <p className="font-manrope text-[10px] text-gray-400">Credit Limit</p>
                  <p className="font-bold font-bricolage text-brand-navy">
                    {detail.credit_limit !== null ? detail.credit_limit : "Default"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <p className="font-manrope text-[10px] text-gray-400">Created</p>
                  <p className="font-bold font-bricolage text-brand-navy text-xs">{formatDate(detail.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 font-bold font-bricolage text-brand-navy text-sm">Riwayat Chat</p>
                <ScrollArea className="h-[400px] rounded-xl border">
                  <div className="space-y-2 p-3">
                    {detail.messages.length === 0 ? (
                      <p className="py-8 text-center font-manrope text-gray-400 text-sm">Belum ada pesan</p>
                    ) : (
                      detail.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            m.role === "user" ? "ml-8 bg-brand-navy text-white" : "mr-8 bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p className="mb-1 font-manrope text-[10px] opacity-60">
                            {m.role === "user" ? "User" : "AI"} · {formatDate(m.created_at)}
                            {m.model && ` · ${m.model}`}
                            {m.feedback && <span className="ml-1">· {m.feedback === "up" ? "👍" : "👎"}</span>}
                          </p>
                          <p className="whitespace-pre-wrap font-manrope">
                            {m.content.length > 500 ? `${m.content.slice(0, 500)}...` : m.content}
                          </p>
                          {(m.prompt_tokens || m.completion_tokens) && (
                            <p className="mt-1 font-manrope text-[9px] opacity-40">
                              {m.prompt_tokens}p / {m.completion_tokens}c{m.cost > 0 && ` · $${m.cost.toFixed(6)}`}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Action: Credit ── */}
      <Dialog open={actionType === "credit"} onOpenChange={(o) => !o && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">Atur Credit Limit</DialogTitle>
            <DialogDescription className="font-manrope">
              {actionSession?.user_name || actionSession?.user_id || actionSession?.id.slice(0, 16)}
              {actionSession?.user_email && <> · {actionSession.user_email}</>}
            </DialogDescription>
          </DialogHeader>

          {/* Current status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="font-manrope text-[10px] text-gray-400">Terpakai</p>
              <p className="font-bold font-bricolage text-brand-navy text-lg">{actionSession?.message_count ?? 0}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="font-manrope text-[10px] text-gray-400">Batas</p>
              <p className="font-bold font-bricolage text-brand-navy text-lg">
                {actionSession?.credit_limit !== null
                  ? actionSession?.credit_limit === -1
                    ? "∞"
                    : actionSession?.credit_limit
                  : actionSession?.is_auth
                    ? 5
                    : 1}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="font-manrope text-[10px] text-gray-400">Sisa</p>
              <p
                className={`font-bold font-bricolage text-lg ${actionSession?.remaining === null ? "text-purple-600" : (actionSession?.remaining ?? 0) > 0 ? "text-green-600" : "text-red-600"}`}
              >
                {actionSession?.remaining === null ? "∞" : (actionSession?.remaining ?? 0)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-manrope text-sm">Ubah Batas Credit</Label>
            <Input
              value={creditValue}
              onChange={(e) => setCreditValue(e.target.value)}
              placeholder="Kosongkan = reset ke default. -1 = unlimited."
              className="rounded-xl font-manrope"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditValue(String((actionSession?.message_count ?? 0) + 1))}
                className="rounded-lg font-manrope text-[10px]"
              >
                +1 dari pemakaian
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditValue("-1")}
                className="rounded-lg font-manrope text-[10px]"
              >
                Unlimited
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditValue("")}
                className="rounded-lg font-manrope text-[10px]"
              >
                Default
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeAction} className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={() =>
                actionSession?.id &&
                handleAction(actionSession.id, "credit", {
                  credit_limit: creditValue === "" ? null : Number(creditValue),
                })
              }
              disabled={actionLoading}
              className="rounded-xl bg-brand-navy text-white hover:bg-brand-navy/90"
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Action: Ban ── */}
      <Dialog open={actionType === "ban"} onOpenChange={(o) => !o && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bricolage text-brand-navy">
              {actionSession?.banned ? (
                <>
                  <UserCheck className="h-5 w-5 text-green-600" /> Unban User
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-red-600" /> Ban User
                </>
              )}
            </DialogTitle>
            <DialogDescription className="font-manrope">
              {actionSession?.user_id || actionSession?.id.slice(0, 16)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="font-manrope text-sm">
              {actionSession?.banned ? "Alasan ban sebelumnya" : "Alasan ban"}
            </Label>
            <Textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Contoh: Spam, abuse chatbot..."
              className="rounded-xl font-manrope"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={() =>
                actionSession?.id &&
                handleAction(actionSession.id, "ban", { banned: !actionSession?.banned, reason: banReason || null })
              }
              disabled={actionLoading}
              className={
                actionSession?.banned
                  ? "rounded-xl bg-green-600 text-white hover:bg-green-700"
                  : "rounded-xl bg-red-600 text-white hover:bg-red-700"
              }
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {actionSession?.banned ? "Unban" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Action: Notes ── */}
      <Dialog open={actionType === "notes"} onOpenChange={(o) => !o && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">Catatan Admin</DialogTitle>
            <DialogDescription className="font-manrope">
              {actionSession?.user_id || actionSession?.id.slice(0, 16)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="font-manrope text-sm">Notes</Label>
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Catatan internal tentang user ini..."
              className="rounded-xl font-manrope"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={() =>
                actionSession?.id && handleAction(actionSession.id, "notes", { notes: notesValue || null })
              }
              disabled={actionLoading}
              className="rounded-xl bg-brand-navy text-white hover:bg-brand-navy/90"
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
