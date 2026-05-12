"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Settings,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type TemplateInfo = {
  id: string;
  label: string;
  description: string;
  variables: { key: string; label: string; defaultValue: string }[];
};

type BatchResult = {
  index: number;
  email: string;
  success: boolean;
  error: string | null;
};

export default function AdminEmailPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({ admin_dashboard: ["access"] });

  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [sendTo, setSendTo] = useState("");

  // Batch state
  const [csvInput, setCsvInput] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);

  const { data: templates, isLoading: templatesLoading } = useQuery(orpc.email.listTemplates.queryOptions());
  const { data: stats, isLoading: statsLoading } = useQuery(orpc.email.getStats.queryOptions());

  const renderPreview = useMutation(
    orpc.email.renderPreview.mutationOptions({
      onSuccess: (data) => {
        setPreviewHtml(data.bodyContent);
        setShowPreview(true);
      },
      onError: (err) => toast.error(`Preview gagal: ${err.message}`),
    }),
  );

  const sendTemplate = useMutation(
    orpc.email.sendTemplate.mutationOptions({
      onSuccess: (data) => toast.success(`Email berhasil dikirim ke ${data.sentTo}`),
      onError: (err) => toast.error(`Gagal kirim: ${err.message}`),
    }),
  );

  const sendBatch = useMutation(
    orpc.email.sendBatch.mutationOptions({
      onSuccess: (data) => {
        setBatchResults(data.results);
        if (data.failed === 0) {
          toast.success(`${data.sent} email berhasil dikirim!`);
        } else {
          toast.warning(`${data.sent} terkirim, ${data.failed} gagal`);
        }
      },
      onError: (err) => toast.error(`Batch gagal: ${err.message}`),
    }),
  );

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

  const handleTemplateChange = useCallback(
    (id: string) => {
      setSelectedTemplateId(id);
      setShowPreview(false);
      setPreviewHtml("");
      setBatchResults(null);
      setCsvInput("");
      const tmpl = templates?.find((t) => t.id === id);
      if (tmpl) {
        const defaults: Record<string, string> = {};
        for (const v of tmpl.variables) defaults[v.key] = v.defaultValue;
        setVariableValues(defaults);
      }
    },
    [templates],
  );

  // Parse CSV: first col = email, rest = variables in order
  const parsedRecipients = useMemo(() => {
    if (!selectedTemplate || !csvInput.trim()) return [];
    const lines = csvInput.trim().split("\n").filter(Boolean);
    const varKeys = selectedTemplate.variables.map((v) => v.key);
    return lines.map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      const email = parts[0] ?? "";
      const variables: Record<string, string> = {};
      varKeys.forEach((key, i) => {
        if (parts[i + 1]) variables[key] = parts[i + 1];
      });
      return { to: email, variables };
    });
  }, [selectedTemplate, csvInput]);

  const handleBatchSend = useCallback(() => {
    if (!selectedTemplateId || !csvInput.trim()) {
      toast.error("Masukkan data penerima terlebih dahulu");
      return;
    }
    setBatchResults(null);
    sendBatch.mutate({
      templateId: selectedTemplateId,
      recipients: parsedRecipients,
    });
  }, [selectedTemplateId, csvInput, parsedRecipients, sendBatch]);

  const csvPlaceholder = useMemo(() => {
    if (!selectedTemplate) return "Pilih template terlebih dahulu";
    const varHeaders = selectedTemplate.variables.map((v) => v.key).join(", ");
    return `email${varHeaders ? `, ${varHeaders}` : ""}\nbudi@mail.com${selectedTemplate.variables.map(() => "").join(", ")}\nsiti@mail.com${selectedTemplate.variables.map(() => "").join(", ")}`;
  }, [selectedTemplate]);

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1F6D]">
          <Mail className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-[#1A1F6D]">Email Management</h1>
          <p className="font-manrope text-[#888888] text-sm">
            Kelola template, kirim tes, dan kirim massal ke banyak penerima
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap bg-[#1A1F6D]/5">
          <TabsTrigger
            value="templates"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger
            value="batch"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <Users className="mr-1.5 h-4 w-4" />
            Kirim Massal
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <Settings className="mr-1.5 h-4 w-4" />
            Pengaturan
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="font-manrope data-[state=active]:bg-[#1A1F6D] data-[state=active]:text-white"
          >
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Statistik
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════ TEMPLATES TAB ════════════════════════ */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* ─ Template List ─ */}
            <Card className="border-0 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
              <CardHeader className="border-gray-100 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
                  <FileText className="h-4 w-4 text-[#FE9114]" />
                  Template Tersedia
                </CardTitle>
                <CardDescription className="font-manrope text-[#888888] text-xs">
                  Pilih template untuk preview atau kirim tes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-2">
                    <div className="space-y-2">
                      {templates?.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTemplateChange(t.id)}
                          className={cn(
                            "w-full rounded-xl border p-4 text-left font-manrope transition-all duration-200",
                            selectedTemplateId === t.id
                              ? "border-[#1A1F6D] bg-[#1A1F6D]/5 ring-1 ring-[#1A1F6D]/20"
                              : "border-gray-200 hover:border-[#1A1F6D]/30 hover:bg-gray-50",
                          )}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className={cn(
                                "font-bricolage font-semibold text-sm",
                                selectedTemplateId === t.id ? "text-[#1A1F6D]" : "text-gray-900",
                              )}
                            >
                              {t.label}
                            </span>
                            {selectedTemplateId === t.id && (
                              <Badge className="border-0 bg-[#1A1F6D] px-2 py-0.5 font-manrope text-[10px] text-white">
                                Dipilih
                              </Badge>
                            )}
                          </div>
                          <p className="line-clamp-2 font-manrope text-[#888888] text-xs leading-relaxed">
                            {t.description}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5">
                            {t.variables.map((v) => (
                              <span
                                key={v.key}
                                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 font-manrope text-[10px] text-gray-500"
                              >
                                {v.key}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* ─ Preview & Single Send ─ */}
            <Card className="border-0 shadow-sm ring-1 ring-gray-200 lg:col-span-3">
              <CardHeader className="border-gray-100 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
                  <Eye className="h-4 w-4 text-[#FE9114]" />
                  {selectedTemplate ? selectedTemplate.label : "Pilih Template"}
                </CardTitle>
                <CardDescription className="font-manrope text-[#888888] text-xs">
                  {selectedTemplate
                    ? "Preview, kirim tes individu, atau lanjut ke Kirim Massal"
                    : "Pilih template dari daftar di samping"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!selectedTemplate ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#888888]">
                    <FileText className="mb-3 h-12 w-12 text-[#888888]/20" />
                    <p className="font-manrope text-sm">Belum ada template dipilih</p>
                    <p className="font-manrope text-[#888888]/60 text-xs">Pilih template dari daftar di samping</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Variables */}
                    <div>
                      <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
                        Variables
                      </Label>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {selectedTemplate.variables.map((v) => (
                          <div key={v.key}>
                            <Label htmlFor={`var-${v.key}`} className="font-manrope text-gray-600 text-xs">
                              {v.label}
                            </Label>
                            <Input
                              id={`var-${v.key}`}
                              value={variableValues[v.key] ?? ""}
                              onChange={(e) => setVariableValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                              placeholder={v.defaultValue}
                              className="mt-1 h-9 rounded-xl border-gray-200 font-manrope text-sm placeholder:text-[#888888]/50 focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-gray-100" />

                    {/* Actions: Preview + Single Send */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button
                        onClick={() => {
                          if (!selectedTemplateId) return;
                          renderPreview.mutate({
                            templateId: selectedTemplateId,
                            variables: variableValues,
                          });
                        }}
                        disabled={renderPreview.isPending}
                        variant="outline"
                        className="rounded-xl border-gray-200 font-manrope text-gray-700 hover:bg-gray-50 hover:text-[#1A1F6D]"
                      >
                        {renderPreview.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="mr-2 h-4 w-4" />
                        )}
                        Preview
                      </Button>

                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          placeholder="email@contoh.com"
                          value={sendTo}
                          onChange={(e) => setSendTo(e.target.value)}
                          className="h-9 rounded-xl border-gray-200 font-manrope text-sm placeholder:text-[#888888]/50 focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
                        />
                        <Button
                          onClick={() => {
                            if (!selectedTemplateId || !sendTo) {
                              toast.error("Masukkan email penerima");
                              return;
                            }
                            sendTemplate.mutate({
                              templateId: selectedTemplateId,
                              to: sendTo,
                              variables: variableValues,
                            });
                          }}
                          disabled={sendTemplate.isPending || !sendTo}
                          className="rounded-xl bg-[#1A1F6D] font-manrope font-semibold text-white hover:bg-[#1A1F6D]/90 disabled:opacity-50"
                        >
                          {sendTemplate.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Kirim Tes
                        </Button>
                      </div>
                    </div>

                    {/* Preview Result */}
                    {showPreview && previewHtml && (
                      <div className="overflow-hidden rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
                          <span className="flex items-center gap-1.5 font-manrope text-[#888888] text-xs">
                            <Eye className="h-3.5 w-3.5" />
                            Pratinjau HTML
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(renderPreview.data?.html ?? "");
                              toast.success("HTML disalin ke clipboard");
                            }}
                            className="h-7 rounded-lg px-2 font-manrope text-[#888888] text-xs hover:text-[#1A1F6D]"
                          >
                            Salin HTML
                          </Button>
                        </div>
                        <div className="h-[450px] w-full">
                          <iframe
                            srcDoc={previewHtml}
                            className="h-full w-full border-0"
                            title="Pratinjau Email"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════ BATCH SEND TAB ════════════════════════ */}
        <TabsContent value="batch">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* ─ Template List (compact) ─ */}
            <Card className="border-0 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
              <CardHeader className="border-gray-100 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
                  <FileText className="h-4 w-4 text-[#FE9114]" />
                  Pilih Template
                </CardTitle>
                <CardDescription className="font-manrope text-[#888888] text-xs">
                  Template yang akan dikirim massal
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {templates?.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left font-manrope transition-all duration-200",
                        selectedTemplateId === t.id
                          ? "border-[#1A1F6D] bg-[#1A1F6D]/5 ring-1 ring-[#1A1F6D]/20"
                          : "border-gray-200 hover:border-[#1A1F6D]/30",
                      )}
                    >
                      <span
                        className={cn(
                          "font-bricolage font-semibold text-sm",
                          selectedTemplateId === t.id ? "text-[#1A1F6D]" : "text-gray-900",
                        )}
                      >
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ─ Batch Input ─ */}
            <Card className="border-0 shadow-sm ring-1 ring-gray-200 lg:col-span-3">
              <CardHeader className="border-gray-100 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
                  <Users className="h-4 w-4 text-[#FE9114]" />
                  Kirim Massal
                </CardTitle>
                <CardDescription className="font-manrope text-[#888888] text-xs">
                  {selectedTemplate
                    ? `Template: ${selectedTemplate.label} — Masukkan data penerima`
                    : "Pilih template terlebih dahulu"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {!selectedTemplate ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#888888]">
                    <FileText className="mb-3 h-12 w-12 text-[#888888]/20" />
                    <p className="font-manrope text-sm">Pilih template dari panel samping</p>
                  </div>
                ) : (
                  <>
                    {/* CSV Instructions */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="font-manrope text-blue-800 text-xs leading-relaxed">
                        <strong>Format CSV:</strong> Kolom pertama = email, kolom selanjutnya = variabel sesuai urutan
                        di bawah (
                        {selectedTemplate.variables.map((v) => (
                          <code key={v.key} className="mx-0.5 rounded bg-blue-100 px-1 font-mono">
                            {v.key}
                          </code>
                        ))}
                        )
                      </p>
                    </div>

                    <div>
                      <Label className="font-manrope font-semibold text-[#1A1F6D] text-xs uppercase tracking-wider">
                        Data Penerima (CSV)
                      </Label>
                      <Textarea
                        placeholder={csvPlaceholder}
                        value={csvInput}
                        onChange={(e) => setCsvInput(e.target.value)}
                        className="mt-2 min-h-[200px] rounded-xl border-gray-200 font-manrope text-xs focus:border-[#1A1F6D] focus:ring-[#1A1F6D]/10"
                      />
                    </div>

                    {/* Parsed preview */}
                    {parsedRecipients.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-manrope font-semibold text-[#1A1F6D] text-xs">
                            {parsedRecipients.length} penerima
                          </span>
                          {parsedRecipients.length > 0 && (
                            <Badge className="border-0 bg-[#1A1F6D]/10 font-manrope text-[#1A1F6D] text-[10px]">
                              Siap dikirim
                            </Badge>
                          )}
                        </div>
                        <ScrollArea className="h-[120px]">
                          <div className="space-y-1">
                            {parsedRecipients.map((r, i) => (
                              <div key={i} className="flex items-center gap-2 font-manrope text-gray-600 text-xs">
                                <Mail className="h-3 w-3 shrink-0 text-gray-400" />
                                <span>{r.to}</span>
                                {Object.values(r.variables).filter(Boolean).length > 0 && (
                                  <span className="text-[#888888]">
                                    —{" "}
                                    {Object.entries(r.variables)
                                      .filter(([, v]) => v)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(", ")}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Send button */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleBatchSend}
                        disabled={sendBatch.isPending || parsedRecipients.length === 0}
                        className="rounded-xl bg-[#1A1F6D] px-6 font-manrope font-semibold text-white hover:bg-[#1A1F6D]/90 disabled:opacity-50"
                      >
                        {sendBatch.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Kirim ke {parsedRecipients.length} Penerima
                          </>
                        )}
                      </Button>

                      {parsedRecipients.length > 0 && !sendBatch.isPending && (
                        <p className="font-manrope text-[#888888] text-[10px]">
                          Akan dikirim via Unosend dengan concurrency 10
                        </p>
                      )}
                    </div>

                    {/* Results */}
                    {batchResults && (
                      <div className="overflow-hidden rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between border-gray-200 border-b bg-gray-50 px-4 py-2">
                          <span className="font-manrope font-semibold text-[#1A1F6D] text-xs">Hasil Pengiriman</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 font-manrope text-green-600 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {batchResults.filter((r) => r.success).length} sukses
                            </span>
                            {batchResults.filter((r) => !r.success).length > 0 && (
                              <span className="flex items-center gap-1 font-manrope text-red-600 text-xs">
                                <XCircle className="h-3.5 w-3.5" />
                                {batchResults.filter((r) => !r.success).length} gagal
                              </span>
                            )}
                          </div>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="divide-y divide-gray-100">
                            {batchResults.map((r) => (
                              <div key={r.index} className="flex items-center gap-3 px-4 py-2.5">
                                {r.success ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                )}
                                <span className="font-manrope text-gray-700 text-xs">{r.email}</span>
                                {r.error && (
                                  <span className="ml-auto font-manrope text-[10px] text-red-500">{r.error}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════ SETTINGS TAB ═════════════════════════ */}
        <TabsContent value="settings">
          <Card className="max-w-2xl border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="border-gray-100 border-b pb-4">
              <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
                <Settings className="h-4 w-4 text-[#FE9114]" />
                Konfigurasi Email
              </CardTitle>
              <CardDescription className="font-manrope text-[#888888] text-xs">
                Pengaturan integrasi Unosend untuk pengiriman email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-manrope text-amber-800 text-sm leading-relaxed">
                  <strong>Catatan:</strong> API Key dan From Email dikelola via environment variable. Buka{" "}
                  <strong>Admin &gt; Settings</strong> untuk mengaktifkan/mematikan pengiriman email.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="font-manrope text-[#888888] text-xs">Unosend API Key</Label>
                <Input
                  value="••••••••••••••••"
                  disabled
                  className="h-9 rounded-xl border-gray-200 bg-gray-50 font-manrope text-[#888888] text-xs"
                />
                <p className="font-manrope text-[#888888]/60 text-[10px]">
                  Diatur via <code className="rounded bg-gray-100 px-1 py-0.5 text-[#1A1F6D]">UNOSEND_API_KEY</code>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="font-manrope text-[#888888] text-xs">From Email</Label>
                <Input
                  value="noreply@captiveau.fun"
                  disabled
                  className="h-9 rounded-xl border-gray-200 bg-gray-50 font-manrope text-[#888888] text-xs"
                />
                <p className="font-manrope text-[#888888]/60 text-[10px]">
                  Diatur via <code className="rounded bg-gray-100 px-1 py-0.5 text-[#1A1F6D]">UNOSEND_FROM_EMAIL</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════ STATISTICS TAB ════════════════════════ */}
        <TabsContent value="stats">
          <Card className="max-w-2xl border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="border-gray-100 border-b pb-4">
              <CardTitle className="flex items-center gap-2 font-bricolage text-[#1A1F6D] text-base">
                <BarChart3 className="h-4 w-4 text-[#FE9114]" />
                Statistik Unosend
              </CardTitle>
              <CardDescription className="font-manrope text-[#888888] text-xs">
                Ringkasan status pengiriman email
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {statsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />
                </div>
              ) : stats ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="font-manrope text-[#888888] text-xs">Koneksi Unosend</p>
                      <div className="mt-2 flex items-center gap-2">
                        {stats.unosendConfigured ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-bricolage font-semibold text-gray-900 text-sm">
                          {stats.unosendConfigured ? "Terhubung" : "Belum Terkonfigurasi"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="font-manrope text-[#888888] text-xs">Template Lokal</p>
                      <p className="mt-2 font-bricolage font-semibold text-gray-900 text-sm">
                        {templates?.length ?? 0} template
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <div>
                        <p className="font-manrope font-semibold text-blue-800 text-xs">Dashboard Unosend</p>
                        <p className="mt-1 font-manrope text-blue-700 text-xs leading-relaxed">{stats.message}</p>
                        <a
                          href="https://app.unosend.co"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 font-manrope font-medium text-blue-700 text-xs hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Buka Dashboard Unosend
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center font-manrope text-[#888888] text-sm">Gagal memuat statistik.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageState>
  );
}
