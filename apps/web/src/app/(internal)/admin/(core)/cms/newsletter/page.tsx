"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Hash,
  Loader2,
  Mail,
  Megaphone,
  Plus,
  RefreshCw,
  Rocket,
  Send,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-amber-100 text-amber-700",
  sending: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
};

export default function AdminNewsletterPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({ admin_dashboard: ["access"] });
  const [activeTab, setActiveTab] = useState("broadcasts");

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1F6D]">
          <Megaphone className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-[#1A1F6D]">Newsletter</h1>
          <p className="font-manrope text-[#888888] text-sm">
            Kelola subscriber, broadcast, dan kirim newsletter via Resend
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap bg-[#1A1F6D]/5">
          <TabsTrigger
            value="broadcasts"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <Megaphone className="mr-1.5 h-4 w-4" /> Broadcasts
          </TabsTrigger>
          <TabsTrigger
            value="compose"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Buat Baru
          </TabsTrigger>
          <TabsTrigger
            value="subscribers"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <Users className="mr-1.5 h-4 w-4" /> Subscribers
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <Settings className="mr-1.5 h-4 w-4" /> Pengaturan
          </TabsTrigger>
        </TabsList>
        <TabsContent value="broadcasts">
          <BroadcastsTab />
        </TabsContent>
        <TabsContent value="compose">
          <ComposeTab />
        </TabsContent>
        <TabsContent value="subscribers">
          <SubscribersTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </PageState>
  );
}

// ═══════════════════════════ BROADCASTS ═══════════════════════════

function BroadcastsTab() {
  const [page, setPage] = useState(0);
  const limit = 20;
  const { data, isLoading, refetch } = useQuery(
    orpc.newsletter.broadcasts.list.queryOptions({ input: { limit, offset: page * limit } }),
  );

  const deleteBroadcast = useMutation(
    orpc.newsletter.broadcasts.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Broadcast dihapus");
        refetch();
      },
      onError: (err) => toast.error(`Gagal hapus: ${err.message}`),
    }),
  );
  const sendBroadcast = useMutation(
    orpc.newsletter.broadcasts.send.mutationOptions({
      onSuccess: () => {
        toast.success("Broadcast dikirim!");
        refetch();
      },
      onError: (err) => toast.error(`Gagal kirim: ${err.message}`),
    }),
  );

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-200">
      <CardHeader className="flex flex-row items-center justify-between border-gray-100 border-b pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
            <Megaphone className="h-4 w-4 text-[#FE9114]" /> Riwayat Broadcast
          </CardTitle>
          <CardDescription className="font-manrope text-[#888888] text-xs">
            {data?.pagination?.total ?? 0} broadcast tercatat
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#888888]" />
          </div>
        ) : !data?.data?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#888888]">
            <Megaphone className="mb-3 h-12 w-12 text-[#888888]/20" />
            <p className="font-manrope text-sm">Belum ada broadcast</p>
            <p className="font-manrope text-[#888888]/60 text-xs">Buat broadcast baru dari tab "Buat Baru"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.data.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-bricolage font-semibold text-gray-900 text-sm">{b.name}</span>
                    <Badge className={cn("font-manrope text-[10px]", statusStyles[b.status] ?? "bg-gray-100")}>
                      {b.status}
                    </Badge>
                  </div>
                  <p className="font-manrope text-[#888888] text-xs">{b.subject}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-manrope text-[#888888] text-[10px]">
                    {b.sentAt && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Dikirim: {new Date(b.sentAt).toLocaleDateString("id-ID")}
                      </span>
                    )}
                    {b.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        Dijadwalkan: {new Date(b.scheduledAt).toLocaleDateString("id-ID")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Dibuat: {new Date(b.createdAt).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {b.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl border-green-200 font-manrope text-green-700 text-xs hover:bg-green-50"
                      onClick={() => sendBroadcast.mutate({ id: b.id })}
                      disabled={sendBroadcast.isPending}
                    >
                      <Send className="mr-1 h-3 w-3" /> Kirim
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-xl font-manrope text-red-600 text-xs hover:bg-red-50"
                    onClick={() => {
                      if (confirm("Hapus broadcast ini?")) deleteBroadcast.mutate({ id: b.id });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {data.pagination && data.pagination.total > limit && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl font-manrope text-xs"
                >
                  ← Sebelumnya
                </Button>
                <span className="font-manrope text-[#888888] text-xs">
                  Halaman {page + 1} dari {Math.ceil(data.pagination.total / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * limit >= data.pagination.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl font-manrope text-xs"
                >
                  Selanjutnya →
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════ COMPOSE ═══════════════════════════

function ComposeTab() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"now" | "draft" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const queryClient = useQueryClient();
  const { data: templates } = useQuery(orpc.newsletter.listTemplates.queryOptions());

  const sendNow = useMutation(
    orpc.newsletter.sendNow.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Broadcast terkirim! ID: ${data.broadcastId}`);
        resetForm();
      },
      onError: (err) => toast.error(`Gagal kirim: ${err.message}`),
    }),
  );
  const createDraft = useMutation(
    orpc.newsletter.broadcasts.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Draft disimpan! ID: ${data.broadcastId}`);
        resetForm();
      },
      onError: (err) => toast.error(`Gagal simpan: ${err.message}`),
    }),
  );
  const schedule = useMutation(
    orpc.newsletter.schedule.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Broadcast dijadwalkan! ID: ${data.broadcastId}`);
        resetForm();
      },
      onError: (err) => toast.error(`Gagal jadwalkan: ${err.message}`),
    }),
  );
  const sendTest = useMutation(
    orpc.newsletter.sendTest.mutationOptions({
      onSuccess: () => toast.success("Test email terkirim!"),
      onError: (err) => toast.error(`Gagal: ${err.message}`),
    }),
  );

  function resetForm() {
    setName("");
    setSubject("");
    setHtml("");
    setText("");
    setScheduledAt("");
    setPreviewHtml("");
  }
  const isPending = sendNow.isPending || createDraft.isPending || schedule.isPending;

  const handleSubmit = useCallback(() => {
    if (!name || !subject || !html) {
      toast.error("Nama, subject, dan konten HTML wajib diisi");
      return;
    }
    const payload = { name, subject, html, text: text || undefined };
    switch (mode) {
      case "now":
        sendNow.mutate(payload);
        break;
      case "draft":
        createDraft.mutate(payload);
        break;
      case "schedule":
        if (!scheduledAt) {
          toast.error("Isi jadwal pengiriman");
          return;
        }
        schedule.mutate({ ...payload, scheduledAt });
        break;
    }
  }, [name, subject, html, text, mode, scheduledAt, sendNow, createDraft, schedule]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-0 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
        <CardHeader className="border-gray-100 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
            <Plus className="h-4 w-4 text-[#FE9114]" /> Buat Broadcast Baru
          </CardTitle>
          <CardDescription className="font-manrope text-[#888888] text-xs">
            Kirim newsletter ke seluruh subscriber via Resend Broadcast
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div>
            <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
              Nama Broadcast
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Newsletter Edisi Mei 2026"
              className="mt-2 h-9 rounded-xl border-gray-200 font-manrope text-sm focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
              Subject
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Update Terbaru dari MULAI+"
              className="mt-2 h-9 rounded-xl border-gray-200 font-manrope text-sm focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
              Template Siap Pakai
            </Label>
            <Select
              value={selectedTemplateId}
              onValueChange={async (id) => {
                if (!id) return;
                setSelectedTemplateId(id);
                if (!id || id === "_blank") return;
                try {
                  const opts = orpc.newsletter.getTemplate.queryOptions({ input: { templateId: id } });
                  const tpl = await queryClient.fetchQuery(opts);
                  setHtml(tpl.html);
                  if (!name) setName(`${tpl.label} — ${new Date().toLocaleDateString("id-ID")}`);
                  if (!subject) setSubject(tpl.label);
                } catch {
                  toast.error("Gagal load template");
                }
              }}
            >
              <SelectTrigger className="mt-2 h-9 rounded-xl border-gray-200 font-manrope text-sm">
                <SelectValue placeholder="Pilih template (opsional) — auto-isi HTML" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_blank">— Mulai dari kosong —</SelectItem>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateId && selectedTemplateId !== "_blank" && (
              <p className="mt-1 font-manrope text-[#888888] text-[10px]">
                {templates?.find((t) => t.id === selectedTemplateId)?.description}
              </p>
            )}
          </div>
          <div>
            <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
              Konten HTML
            </Label>
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder={`<h1>Halo {"{{{contact.first_name|peserta}}}"}!</h1>\n<p>Update terbaru dari MULAI+...</p>\n<p><a href={{"{{{RESEND_UNSUBSCRIBE_URL}}}"}}>Unsubscribe</a></p>`}
              className="mt-2 min-h-[250px] rounded-xl border-gray-200 font-mono text-xs focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
            />
            <p className="mt-1 font-manrope text-[#888888]/60 text-[10px]">
              Gunakan <code className="rounded bg-gray-100 px-1 py-0.5">{"{{{contact.first_name|fallback}}}"}</code>{" "}
              untuk personalisasi dan{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5">{"{{{RESEND_UNSUBSCRIBE_URL}}}"}</code> untuk link
              unsubscribe.
            </p>
          </div>
          <div>
            <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
              Plain Text <span className="font-normal text-[#888888]">(opsional)</span>
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Versi plain text dari email..."
              className="mt-2 min-h-[100px] rounded-xl border-gray-200 font-manrope text-xs focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
            />
          </div>
          <Separator className="bg-gray-100" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
                Mode Pengiriman
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={mode === "now" ? "default" : "outline"}
                  onClick={() => setMode("now")}
                  className={cn(
                    "rounded-xl font-manrope text-xs",
                    mode === "now" ? "bg-[#1A1F6D] text-white hover:bg-[#1A1F6D]/90" : "",
                  )}
                >
                  <Rocket className="mr-1 h-3 w-3" /> Kirim Sekarang
                </Button>
                <Button
                  size="sm"
                  variant={mode === "draft" ? "default" : "outline"}
                  onClick={() => setMode("draft")}
                  className={cn(
                    "rounded-xl font-manrope text-xs",
                    mode === "draft" ? "bg-[#1A1F6D] text-white hover:bg-[#1A1F6D]/90" : "",
                  )}
                >
                  <FileText className="mr-1 h-3 w-3" /> Simpan Draft
                </Button>
                <Button
                  size="sm"
                  variant={mode === "schedule" ? "default" : "outline"}
                  onClick={() => setMode("schedule")}
                  className={cn(
                    "rounded-xl font-manrope text-xs",
                    mode === "schedule" ? "bg-[#1A1F6D] text-white hover:bg-[#1A1F6D]/90" : "",
                  )}
                >
                  <Clock className="mr-1 h-3 w-3" /> Jadwalkan
                </Button>
              </div>
              {mode === "schedule" && (
                <Input
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  placeholder='Contoh: "in 1 hour" atau "next Monday 9am"'
                  className="h-9 max-w-sm rounded-xl border-gray-200 font-manrope text-sm focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
                />
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-xl bg-[#1A1F6D] px-6 font-manrope font-semibold text-white hover:bg-[#1A1F6D]/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : mode === "now" ? (
                <Rocket className="mr-2 h-4 w-4" />
              ) : mode === "draft" ? (
                <FileText className="mr-2 h-4 w-4" />
              ) : (
                <Clock className="mr-2 h-4 w-4" />
              )}
              {mode === "now" ? "Kirim Sekarang" : mode === "draft" ? "Simpan Draft" : "Jadwalkan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit border-0 shadow-sm ring-1 ring-gray-200">
        <CardHeader className="border-gray-100 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
            <Eye className="h-4 w-4 text-[#FE9114]" /> Preview &amp; Tes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl border-gray-200 font-manrope text-xs"
            onClick={() => setPreviewHtml(html)}
            disabled={!html}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview HTML
          </Button>
          {previewHtml && (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="h-[350px] w-full">
                <iframe
                  srcDoc={previewHtml}
                  className="h-full w-full border-0"
                  title="Preview Newsletter"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
          <Separator className="bg-gray-100" />
          <div>
            <Label className="font-manrope font-semibold text-[#1A1F6D] text-[10px] uppercase tracking-wider">
              Kirim Tes
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email@contoh.com"
                className="h-8 flex-1 rounded-xl border-gray-200 font-manrope text-xs focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
              />
              <Button
                size="sm"
                className="h-8 rounded-xl bg-[#1A1F6D] font-manrope text-white text-xs hover:bg-[#1A1F6D]/90"
                onClick={() => {
                  if (!testEmail || !subject || !html) {
                    toast.error("Isi email, subject, dan konten HTML");
                    return;
                  }
                  sendTest.mutate({ to: testEmail, subject, html });
                }}
                disabled={!testEmail || sendTest.isPending}
              >
                {sendTest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="font-manrope text-[10px] text-blue-700 leading-relaxed">
              <strong>Template variabel:</strong>{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-blue-800">{"{{{contact.first_name}}}"}</code>,{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-blue-800">{"{{{contact.last_name}}}"}</code>,{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-blue-800">{"{{{contact.email}}}"}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════ SUBSCRIBERS ═══════════════════════════

function SubscribersTab() {
  const { data: stats, isLoading: statsLoading } = useQuery(orpc.newsletter.stats.queryOptions());
  const { data: subData, isLoading: subsLoading } = useQuery(
    orpc.cms.newsletter.admin.list.queryOptions({ input: { limit: 50 } }),
  );

  const syncContacts = useMutation(
    orpc.newsletter.contacts.sync.mutationOptions({
      onSuccess: (data) =>
        toast.success(`${data.synced} subscriber disinkronkan, ${data.skipped} sudah ada, ${data.failed} gagal`),
      onError: (err) => toast.error(`Sync gagal: ${err.message}`),
    }),
  );

  const syncAllUsers = useMutation(
    orpc.newsletter.contacts.syncAllUsers.mutationOptions({
      onSuccess: (data) =>
        toast.success(`${data.synced} user disinkronkan, ${data.skipped} sudah ada, ${data.failed} gagal`),
      onError: (err) => toast.error(`Sync semua user gagal: ${err.message}`),
    }),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit border-0 shadow-sm ring-1 ring-gray-200">
        <CardHeader className="border-gray-100 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
            <BarChart3 className="h-4 w-4 text-[#FE9114]" /> Statistik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {statsLoading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#888888]" />
          ) : (
            <>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="font-manrope text-blue-700 text-xs">Total User (Semua)</p>
                <p className="mt-1 font-bold font-bricolage text-2xl text-blue-800">{stats?.totalUsers ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="font-manrope text-[#888888] text-xs">Newsletter Subscribers</p>
                <p className="mt-1 font-bold font-bricolage text-2xl text-[#1A1F6D]">{stats?.totalSubscribers ?? 0}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="font-manrope text-green-700 text-xs">Subscriber Aktif</p>
                <p className="mt-1 font-bold font-bricolage text-2xl text-green-800">{stats?.activeSubscribers ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="font-manrope text-[#888888] text-xs">Total Broadcasts</p>
                <p className="mt-1 font-bold font-bricolage text-2xl text-[#1A1F6D]">{stats?.totalBroadcasts ?? 0}</p>
              </div>
              <Separator />
              <div>
                <Label className="font-manrope text-[#888888] text-[10px]">Resend Segment</Label>
                <p className="font-manrope text-gray-900 text-xs">
                  {stats?.segmentName ?? "Belum dibuat"} —{" "}
                  {stats?.resendConfigured ? (
                    <span className="text-green-600">Terkonfigurasi</span>
                  ) : (
                    <span className="text-red-600">API Key belum di-set</span>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-xl font-manrope text-xs"
                onClick={() => syncContacts.mutate(void 0)}
                disabled={syncContacts.isPending || !stats?.resendConfigured}
              >
                {syncContacts.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Sync Subscriber ke Resend
              </Button>
              <Button
                size="sm"
                variant="default"
                className="w-full rounded-xl bg-[#FE9114] font-manrope text-white text-xs hover:bg-[#FE9114]/90"
                onClick={() => syncAllUsers.mutate(void 0)}
                disabled={syncAllUsers.isPending || !stats?.resendConfigured}
              >
                {syncAllUsers.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                )}
                Sync SEMUA User ke Resend
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between border-gray-100 border-b pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
              <Users className="h-4 w-4 text-[#FE9114]" /> Daftar Subscriber
            </CardTitle>
            <CardDescription className="font-manrope text-[#888888] text-xs">
              {subData?.pagination?.total ?? 0} subscriber dari CMS
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {subsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#888888]" />
            </div>
          ) : !subData?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#888888]">
              <Users className="mb-3 h-12 w-12 text-[#888888]/20" />
              <p className="font-manrope text-sm">Belum ada subscriber</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-2">
                {subData.data.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1F6D]/10">
                        <Mail className="h-3.5 w-3.5 text-[#1A1F6D]" />
                      </div>
                      <div>
                        <p className="font-manrope font-medium text-gray-900 text-sm">{sub.email}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge
                            className={cn(
                              "font-manrope text-[10px]",
                              sub.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                            )}
                          >
                            {sub.status}
                          </Badge>
                          {sub.source && (
                            <span className="font-manrope text-[#888888] text-[10px]">via {sub.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="font-manrope text-[#888888] text-[10px]">
                      {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString("id-ID") : "-"}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════ SETTINGS ═══════════════════════════

function SettingsTab() {
  const { data: stats, isLoading, refetch: refetchStats } = useQuery(orpc.newsletter.stats.queryOptions());
  const {
    data: segments,
    isLoading: segsLoading,
    refetch: refetchSegs,
  } = useQuery(orpc.newsletter.segment.list.queryOptions());

  const ensureSegment = useMutation(
    orpc.newsletter.segment.ensure.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Segment siap: ${data.segmentId}`);
        refetchStats();
        refetchSegs();
      },
      onError: (err) => toast.error(`Gagal: ${err.message}`),
    }),
  );

  const deleteSegment = useMutation(
    orpc.newsletter.segment.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Segment dihapus");
        refetchSegs();
        refetchStats();
      },
      onError: (err) => toast.error(`Gagal hapus: ${err.message}`),
    }),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ─ Segment Management ─ */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-200">
        <CardHeader className="flex flex-row items-center justify-between border-gray-100 border-b pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
              <Hash className="h-4 w-4 text-[#FE9114]" /> Segment
            </CardTitle>
            <CardDescription className="font-manrope text-[#888888] text-xs">
              Kelola segment / audience untuk broadcast
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="rounded-xl bg-[#1A1F6D] font-manrope text-white text-xs hover:bg-[#1A1F6D]/90"
            onClick={() => ensureSegment.mutate(void 0)}
            disabled={ensureSegment.isPending}
          >
            {ensureSegment.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Buat Segment Default
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {segsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />
            </div>
          ) : !segments?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#888888]">
              <Hash className="mb-3 h-10 w-10 text-[#888888]/20" />
              <p className="font-manrope text-sm">Belum ada segment</p>
              <p className="font-manrope text-[#888888]/60 text-xs">Klik "Buat Segment Default"</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-2">
              <div className="space-y-2">
                {segments.map((seg) => {
                  const isActive = seg.id === stats?.segmentId;
                  return (
                    <div
                      key={seg.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3",
                        isActive ? "border-[#1A1F6D] bg-[#1A1F6D]/5" : "border-gray-200",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-bricolage font-semibold text-gray-900 text-sm">
                            {seg.name}
                          </span>
                          {isActive && (
                            <Badge className="border-0 bg-green-100 font-manrope text-[10px] text-green-700">
                              Aktif
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-[#888888] text-[10px]">{seg.id}</p>
                        <p className="font-manrope text-[#888888] text-[10px]">
                          Dibuat: {new Date(seg.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 rounded-lg font-manrope text-red-600 text-xs hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Hapus segment "${seg.name}"?`)) deleteSegment.mutate({ id: seg.id });
                        }}
                        disabled={deleteSegment.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          <Separator className="mt-4" />
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="font-manrope text-blue-700 text-xs leading-relaxed">
              <strong>Environment:</strong> Production →{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5">Newsletter Subscribers</code>, Dev/Staging →{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5">Newsletter Subscribers (dev)</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─ Config & Stats ─ */}
      <div className="space-y-6">
        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardHeader className="border-gray-100 border-b pb-4">
            <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
              <Settings className="h-4 w-4 text-[#FE9114]" /> Koneksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {isLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#888888]" />
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="font-manrope font-semibold text-gray-900 text-sm">Resend API</p>
                </div>
                <Badge
                  className={cn(
                    "font-manrope text-xs",
                    stats?.resendConfigured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                  )}
                >
                  {stats?.resendConfigured ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardHeader className="border-gray-100 border-b pb-4">
            <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
              <BarChart3 className="h-4 w-4 text-[#FE9114]" /> Ringkasan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {isLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#888888]" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <Users className="mb-2 h-5 w-5 text-blue-600" />
                  <p className="font-bold font-bricolage text-2xl text-blue-800">{stats?.totalUsers ?? 0}</p>
                  <p className="font-manrope text-blue-700 text-xs">Total User</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <Users className="mb-2 h-5 w-5 text-[#1A1F6D]" />
                  <p className="font-bold font-bricolage text-2xl text-gray-900">{stats?.totalSubscribers ?? 0}</p>
                  <p className="font-manrope text-[#888888] text-xs">Subscribers</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-green-600" />
                  <p className="font-bold font-bricolage text-2xl text-green-800">{stats?.activeSubscribers ?? 0}</p>
                  <p className="font-manrope text-green-700 text-xs">Aktif</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <Megaphone className="mb-2 h-5 w-5 text-[#FE9114]" />
                  <p className="font-bold font-bricolage text-2xl text-gray-900">{stats?.totalBroadcasts ?? 0}</p>
                  <p className="font-manrope text-[#888888] text-xs">Broadcasts</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
