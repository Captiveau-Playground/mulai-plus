"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, FileSpreadsheet, Loader2, Mail, QrCode, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

const STATUS_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  invited: { label: "Belum Mulai", cls: "bg-gray-50 text-gray-500", dot: "bg-gray-400" },
  in_progress: { label: "Sedang Mengerjakan", cls: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  completed: { label: "Selesai", cls: "bg-green-50 text-green-600", dot: "bg-green-500" },
};

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.batches.get.queryOptions({ input: { id: batchId } }),
    enabled: !!batchId,
  });

  const [studentName, setStudentName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const addStudent = useMutation({
    ...orpc.tmbAdmin.students.add.mutationOptions(),
    onSuccess: () => {
      toast.success("Siswa ditambahkan");
      setStudentName("");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.batches.get.key() });
    },
  });

  const removeStudent = useMutation({
    ...orpc.tmbAdmin.students.remove.mutationOptions(),
    onSuccess: () => {
      toast.success("Siswa dihapus");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.batches.get.key() });
    },
  });

  const importCsv = useMutation({
    ...orpc.tmbAdmin.students.import.mutationOptions(),
    onSuccess: (d) => {
      toast.success(`${d.imported} siswa berhasil diimport!`);
      setCsvText("");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.batches.get.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal import"),
  });

  const invite = useMutation({
    ...orpc.tmbAdmin.students.sendInviteEmails.mutationOptions(),
    onSuccess: (d) => {
      toast.success(
        d.sent > 0
          ? `${d.sent} email undangan terkirim! 📧`
          : "Kode sudah siap — kirim via email atau bagikan link/QR.",
      );
      if (d.failed?.length) toast.error(`${d.failed.length} email gagal terkirim`);
    },
    onError: (e) => toast.error(e.message || "Gagal mengirim undangan"),
  });

  const copyCode = (link: string) => {
    const full = `${window.location.origin}${link}`;
    navigator.clipboard.writeText(full);
    setCopied("code");
    setTimeout(() => setCopied(null), 1500);
    toast.success("Link undangan disalin!");
  };

  const [sendEmail, setSendEmail] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ name: string; link: string; dataUrl: string } | null>(null);

  const showQr = async (link: string) => {
    const full = `${window.location.origin}${link}`;
    const dataUrl = await QRCode.toDataURL(full, { width: 220, margin: 1 });
    setQrTarget({ name: "Undangan Batch", link: full, dataUrl });
  };

  const analytics = useQuery({
    ...orpc.tmbAdmin.analytics.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });

  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const { rows } = await client.tmbAdmin.students.exportRekap({ batchId });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap");
      XLSX.writeFile(wb, `rekap-${(batch?.name ?? "batch").replace(/\s+/g, "-")}.xlsx`);
      toast.success("Rekap Excel diunduh!");
    } catch {
      toast.error("Gagal export");
    } finally {
      setExporting(false);
    }
  };

  const batch = data?.batch;
  const students = data?.students ?? [];
  const ana = analytics.data;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="py-20 text-center">
        <p className="font-manrope text-gray-500">Batch tidak ditemukan.</p>
        <Link href="/admin/assessment" className="mt-3 inline-block font-bold font-manrope text-mentor-teal text-sm">
          ← Kembali
        </Link>
      </div>
    );
  }

  const done = students.filter((s: any) => s.status === "completed").length;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/assessment"
          className="flex items-center gap-1 font-manrope font-semibold text-gray-400 text-xs hover:text-gray-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kelola Sekolah
        </Link>
        <h1 className="mt-1 font-bold font-bricolage text-gray-900 text-xl">{batch.name}</h1>
        <p className="font-manrope text-gray-500 text-xs">
          {[batch.className, batch.major, batch.graduationYear ? `Lulus ${batch.graduationYear}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-4">
        {[
          { label: "Total", value: students.length, color: "text-brand-navy" },
          { label: "Selesai", value: done, color: "text-green-600" },
          {
            label: "Progres",
            value: students.length ? `${Math.round((done / students.length) * 100)}%` : "0%",
            color: "text-mentor-teal",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm">
            <p className={cn("font-bold font-bricolage text-xl", s.color)}>{s.value}</p>
            <p className="mt-0.5 font-manrope text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Analytics mini */}
      {ana && ana.total > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <h3 className="font-bold font-bricolage text-gray-900 text-sm">Distribusi Minat (Top)</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {ana.hollandDistribution.slice(0, 3).map((h: any) => (
              <span
                key={h.code}
                className="rounded-full bg-mentor-teal/10 px-3 py-1 font-bold font-manrope text-teal-800 text-xs"
              >
                {h.code} · {h.count} siswa
              </span>
            ))}
          </div>
          {ana.topMajors.length > 0 && (
            <>
              <h3 className="mt-3 font-bold font-bricolage text-gray-900 text-sm">Rekomendasi Terpopuler</h3>
              <div className="mt-2 space-y-1">
                {ana.topMajors.slice(0, 3).map((m: any) => (
                  <div key={m.name} className="flex items-center justify-between font-manrope text-xs">
                    <span className="text-gray-700">{m.name}</span>
                    <span className="font-bold text-gray-400">{m.count}x</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Invite */}
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="font-bold font-bricolage text-gray-900 text-sm">📨 Undangan</h3>
        <p className="mt-1 font-manrope text-gray-500 text-xs">
          1 kode untuk seluruh batch — siswa login & klaim dengan email yang terdaftar.
        </p>

        {batch.inviteCode && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-brand-navy p-4 text-white">
            <div className="flex-1">
              <p className="font-manrope text-[10px] text-white/60 uppercase tracking-wide">Kode Undangan</p>
              <p className="font-bold font-bricolage text-3xl tracking-widest">{batch.inviteCode}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => showQr(`/assessment/invite/${batch.inviteCode}`)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 transition-colors hover:bg-white/25"
                aria-label="QR"
              >
                <QrCode className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => copyCode(`/assessment/invite/${batch.inviteCode}`)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 transition-colors hover:bg-white/25"
                aria-label="Salin link"
              >
                {copied === "code" ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 accent-mentor-teal"
            />
            <span className="font-manrope font-semibold text-gray-600 text-xs">Kirim via email ke semua siswa</span>
          </label>
          <Button
            onClick={() => {
              if (sendEmail) {
                invite.mutate({ batchId });
              } else if (batch.inviteCode) {
                copyCode(`/assessment/invite/${batch.inviteCode}`);
              }
            }}
            disabled={invite.isPending || !batch.inviteCode}
            className="rounded-xl bg-brand-navy px-4 py-2 font-bold font-manrope text-white text-xs hover:bg-brand-navy-light"
          >
            {invite.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : sendEmail ? (
              <Mail className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}{" "}
            {sendEmail ? "Kirim Email Undangan" : "Salin Kode / Bagikan"}
          </Button>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold font-bricolage text-gray-900 text-sm">📥 Export Rekap</h3>
            <p className="mt-1 font-manrope text-gray-500 text-xs">
              Rekap seluruh siswa: nama, Holland code, confidence, top jurusan.
            </p>
          </div>
          <Button
            onClick={exportExcel}
            disabled={exporting || students.length === 0}
            className="rounded-xl bg-green-600 px-4 py-2 font-bold font-manrope text-white text-xs hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}{" "}
            Excel
          </Button>
        </div>
      </div>

      {/* Add student */}
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="font-bold font-bricolage text-gray-900 text-sm">➕ Tambah Siswa</h3>
        <div className="mt-2 flex gap-2">
          <Input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Nama siswa…"
            className="rounded-xl border-gray-200 bg-gray-50"
          />
          <Button
            onClick={() => addStudent.mutate({ batchId, name: studentName })}
            disabled={!studentName.trim()}
            className="shrink-0 rounded-xl bg-mentor-teal px-4 font-bold font-manrope text-white text-xs hover:bg-teal-700"
          >
            Tambah
          </Button>
        </div>
      </div>

      {/* Import CSV */}
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="font-bold font-bricolage text-gray-900 text-sm">📤 Import CSV</h3>
        <p className="mt-1 font-manrope text-gray-500 text-xs">
          Format: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">nama,email,nis</code> — baris pertama
          header.
        </p>
        <Textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={4}
          placeholder={"nama,email,nis\nBudi Santoso,budi@mail.com,1234\nSiti Aminah,siti@mail.com,1235"}
          className="mt-2 rounded-xl border-gray-200 bg-gray-50 font-mono text-xs"
        />
        <Button
          onClick={() => importCsv.mutate({ batchId, csv: csvText })}
          disabled={!csvText.trim() || importCsv.isPending}
          className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 font-bold font-manrope text-white text-xs hover:bg-brand-navy-light disabled:opacity-50"
        >
          {importCsv.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{" "}
          Import
        </Button>
      </div>

      {/* Student list */}
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="font-bold font-bricolage text-gray-900 text-sm">Siswa ({students.length})</h3>
        {students.length === 0 ? (
          <p className="mt-3 font-manrope text-gray-400 text-xs">Belum ada siswa. Tambahkan manual atau import CSV.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {students.map((s: any) => {
              const st = STATUS_BADGE[s.status] ?? STATUS_BADGE.invited;
              return (
                <div key={s.id} className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-manrope font-semibold text-gray-800 text-sm">{s.name}</p>
                    <p className="font-manrope text-[10px] text-gray-400">
                      {s.nis ? `NIS ${s.nis} · ` : ""}
                      {s.email ?? "tanpa email"}
                    </p>
                    {!s.email && (
                      <p className="font-manrope font-semibold text-[10px] text-amber-600">
                        ⚠️ perlu email agar bisa klaim undangan
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-manrope font-semibold text-[10px]",
                      st.cls,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                    {st.label}
                  </span>
                  {s.resultId && (
                    <Link
                      href={`/admin/assessment/students/${s.id}`}
                      className="shrink-0 rounded-lg bg-white px-2.5 py-1 font-bold font-manrope text-[10px] text-mentor-teal shadow-sm hover:bg-mentor-teal/5"
                    >
                      Lihat
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStudent.mutate({ id: s.id })}
                    className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    aria-label="Hapus siswa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Dialog */}
      <Dialog open={!!qrTarget} onOpenChange={(o) => !o && setQrTarget(null)}>
        <DialogContent className="max-w-xs rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">QR Undangan</DialogTitle>
            <DialogDescription className="font-manrope">{qrTarget?.name}</DialogDescription>
          </DialogHeader>
          {qrTarget && (
            <div className="flex flex-col items-center gap-3">
              {/* biome-ignore lint/performance/noImgElement: QR data URL lokal */}
              <img src={qrTarget.dataUrl} alt="QR undangan" className="h-48 w-48 rounded-xl border border-gray-100" />
              <p className="w-full break-all rounded-xl bg-gray-50 p-2 font-manrope text-[10px] text-gray-500">
                {qrTarget.link}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
