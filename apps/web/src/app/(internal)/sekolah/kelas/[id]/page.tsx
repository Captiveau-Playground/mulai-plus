"use client";

// (M2.1) Detail kelas: daftar peserta + status pengerjaan + Holland code ringkas.
// READ-ONLY dulu (import/undang & jadwal menyusul di M2.2/M2.3).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, FileUp, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";
import { client, orpc } from "@/utils/orpc";

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: "Selesai", cls: "bg-teal-50 text-teal-700" },
  in_progress: { label: "Mengerjakan", cls: "bg-amber-50 text-amber-700" },
  invited: { label: "Belum mulai", cls: "bg-gray-100 text-gray-600" },
};

const fmt = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function SchoolCohortDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = String(params?.id ?? "");
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<null | "import" | "manual">(null);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState("nama,email,nis\n");
  const [manual, setManual] = useState({ name: "", email: "", nis: "" });
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: any[] } | null>(null);
  const [sched, setSched] = useState<{ mode: "anytime" | "scheduled"; start: string; end: string } | null>(null);
  // (M2.5) dialog hasil per peserta + export rekap
  const [detail, setDetail] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  // (impor Excel) file .xlsx/.xls dibaca di browser lalu dikirim sebagai CSV
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const bacaFile = async (file?: File | null) => {
    if (!file) return;
    setFileName(file.name);
    try {
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
        // baris pertama dianggap header; ambil 3 kolom pertama (nama, email, nis)
        const lines = rows
          .map((r) => (Array.isArray(r) ? r.slice(0, 3) : []))
          .filter((r) => r.some((c) => String(c ?? "").trim().length > 0))
          .map((r) =>
            r
              .map((c) =>
                String(c ?? "")
                  .replace(/[,;]/g, " ")
                  .trim(),
              )
              .join(","),
          );
        const hasHeader = /nama|name/i.test(lines[0] ?? "");
        const csvText = [hasHeader ? "nama,email,nis" : "nama,email,nis", ...lines.slice(hasHeader ? 1 : 0)].join("\n");
        setCsv(csvText);
        notify.success(`${Math.max(0, lines.length - (hasHeader ? 1 : 0))} baris terbaca dari ${file.name}`);
      } else {
        setCsv(await file.text());
        notify.success(`File ${file.name} dimuat`);
      }
    } catch {
      notify.error("Gagal membaca file — pastikan format Excel/CSV benar");
    }
  };
  // (M2.4) monitoring: filter status + "ingatkan" per peserta
  const [statusFilter, setStatusFilter] = useState<"all" | "invited" | "in_progress" | "completed">("all");
  const [nudging, setNudging] = useState<string | null>(null);

  const data = useQuery({
    ...orpc.school.participants.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });
  const invite = useQuery({
    ...orpc.school.invite.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });
  const hasil = useQuery({
    ...orpc.school.participantResult.queryOptions({ input: { batchId, participantId: detail?.id ?? "" } }),
    enabled: !!detail?.id,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: orpc.school.participants.key() });
    await qc.invalidateQueries({ queryKey: orpc.school.cohorts.key() });
  };

  /** ISO → nilai untuk <input type="datetime-local"> (waktu lokal). */
  const toLocalInput = (iso?: string | Date | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const fmtWaktu = (iso?: string | Date | null) =>
    iso
      ? new Date(iso).toLocaleString("id-ID", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  const WSTATE: Record<string, { label: string; cls: string }> = {
    tanpa_jadwal: { label: "Tanpa jadwal (bebas kapan saja)", cls: "bg-gray-100 text-gray-600" },
    belum_mulai: { label: "Belum mulai", cls: "bg-sky-50 text-sky-700" },
    berjalan: { label: "Berjalan", cls: "bg-teal-50 text-teal-700" },
    selesai: { label: "Selesai", cls: "bg-amber-50 text-amber-700" },
  };

  const simpanJadwal = async (mode: "anytime" | "scheduled" | "off") => {
    setBusy(true);
    try {
      const payload: any = { batchId, mode };
      if (mode !== "off") {
        if (!sched?.start || !sched?.end) {
          notify.warn("Isi tanggal & jam mulai dan selesai");
          return;
        }
        payload.startISO = new Date(sched.start).toISOString();
        payload.endISO = new Date(sched.end).toISOString();
      }
      const r: any = await (client as any).school.cohortSchedule(payload);
      if (!r?.ok) {
        notify.error(
          r?.error === "selesai_harus_setelah_mulai"
            ? "Waktu selesai harus setelah waktu mulai"
            : "Gagal menyimpan jadwal",
        );
        return;
      }
      notify.success(mode === "off" ? "Jadwal dihapus — tes bebas kapan saja" : "Jadwal tes disimpan");
      await qc.invalidateQueries({ queryKey: orpc.school.participants.key() });
      await qc.invalidateQueries({ queryKey: orpc.school.cohorts.key() });
    } finally {
      setBusy(false);
    }
  };

  /** (M2.4) Salin teks undangan yang sudah dipersonalisasi untuk satu siswa. */
  const ingatkan = async (p: any) => {
    setNudging(p.id);
    try {
      const r: any = await (client as any).school.invite({ batchId, participantId: p.id });
      if (!r?.ok) {
        notify.error("Gagal menyiapkan teks undangan");
        return;
      }
      await navigator.clipboard.writeText(r.waText);
      notify.success(`Teks undangan untuk ${r.studentName ?? p.name} tersalin — tempel ke WhatsApp`);
    } catch {
      notify.error("Gagal menyalin");
    } finally {
      setNudging(null);
    }
  };

  const exportRekap = async () => {
    setExporting(true);
    try {
      const r: any = await (client as any).school.exportRekap({ batchId });
      if (!r?.ok || !Array.isArray(r.rows)) {
        notify.error("Gagal menyiapkan rekap");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(r.rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap");
      XLSX.writeFile(wb, `rekap-${(r.batch?.name ?? "kelas").replace(/\s+/g, "-")}.xlsx`);
      notify.success("Rekap Excel diunduh");
    } catch {
      notify.error("Gagal export rekap");
    } finally {
      setExporting(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success(`${label} tersalin`);
    } catch {
      notify.error("Gagal menyalin — salin manual dari kotak teks");
    }
  };

  const unduhTemplate = () => {
    const blob = new Blob(["nama,email,nis\nBudi Santoso,budi@sekolah.sch.id,12345\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-peserta.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const jalankanImport = async () => {
    setBusy(true);
    setImportResult(null);
    try {
      const r: any = await (client as any).school.participantsImport({ batchId, csv });
      if (!r?.ok) {
        notify.error(
          r?.error === "kolom_nama_wajib"
            ? "CSV wajib punya kolom 'nama'"
            : r?.error === "terlalu_banyak_baris"
              ? "Maksimal 500 baris per import"
              : "Gagal import peserta",
        );
        return;
      }
      setImportResult({ imported: r.imported, skipped: r.skipped, failed: r.failed ?? [] });
      notify.success(`${r.imported} peserta ditambahkan${r.skipped ? `, ${r.skipped} dilewati (duplikat)` : ""}`);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const tambahSatu = async () => {
    if (!manual.name.trim()) {
      notify.warn("Nama peserta wajib diisi");
      return;
    }
    setBusy(true);
    try {
      const r: any = await (client as any).school.participantAdd({
        batchId,
        name: manual.name.trim(),
        email: manual.email.trim(),
        nis: manual.nis.trim(),
      });
      if (!r?.ok) {
        notify.error(r?.error === "peserta_sudah_ada" ? "Email itu sudah ada di kelas ini" : "Gagal menambah peserta");
        return;
      }
      notify.success("Peserta ditambahkan");
      setManual({ name: "", email: "", nis: "" });
      setDlg(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const items: any[] = (data.data as any)?.items ?? [];
  const batch = (data.data as any)?.batch;
  const totals = (data.data as any)?.totals;
  // (auth) guru BK (school_viewer) hanya melihat — aksi tulis disembunyikan
  const canManage = (data.data as any)?.canManage !== false;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!needle) return true;
      return [p.name, p.email, p.nis].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(needle));
    });
  }, [items, q, statusFilter]);

  if (data.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  if (!data.data || (data.data as any).ok === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" data-testid="cohort-not-found">
        <p className="font-manrope font-semibold text-gray-700 text-sm">Kelas tidak ditemukan</p>
        <p className="mt-1 font-manrope text-gray-500 text-xs">
          Kelas ini bukan milik sekolahmu, atau akun sekolah belum aktif.
        </p>
        <Link
          href={"/sekolah/kelas" as any}
          className="mt-4 inline-block font-manrope font-semibold text-mentor-teal text-xs"
        >
          ← Kembali ke daftar kelas
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6" data-testid="cohort-detail">
      <Link
        href={"/sekolah/kelas" as any}
        className="inline-flex items-center gap-1 font-manrope font-semibold text-mentor-teal text-xs hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Semua kelas
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-gray-900">{batch?.name}</h1>
          <p className="font-manrope text-gray-500 text-xs">
            {[batch?.className, batch?.major].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/sekolah/kelas/${batchId}/laporan`}
            data-testid="report-link"
            className="inline-flex items-center gap-1 rounded-xl bg-brand-navy px-3 py-2 font-bold font-manrope text-white text-xs hover:bg-brand-navy/90"
          >
            📊 Laporan kelas
          </Link>
          <Button
            data-testid="export-rekap"
            variant="outline"
            onClick={() => void exportRekap()}
            disabled={exporting}
            className="min-h-11 rounded-xl px-4 py-2.5 font-bold font-manrope text-sm"
          >
            {exporting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} ⬇ Unduh Excel
          </Button>
          {canManage && (
            <>
              <Button
                data-testid="participant-import-open"
                onClick={() => setDlg("import")}
                className="min-h-11 rounded-xl bg-brand-navy px-4 py-2.5 font-bold font-manrope text-sm text-white hover:brightness-110"
              >
                <FileUp className="mr-1 h-3.5 w-3.5" /> Import peserta
              </Button>
              <Button
                data-testid="participant-add-open"
                onClick={() => setDlg("manual")}
                variant="outline"
                className="min-h-11 rounded-xl px-4 py-2.5 font-bold font-manrope text-sm"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Tambah satu
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-2 font-manrope text-[11px]">
          <span className="rounded-full bg-teal-50 px-2 py-1 font-semibold text-teal-700">
            {totals?.selesai ?? 0} selesai
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">
            {totals?.mulai ?? 0} mengerjakan
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-600">
            {totals?.belum ?? 0} belum mulai
          </span>
        </div>
      </div>

      {/* Wizard 3 langkah — memandu staf sekolah, bukan menu yang harus ditebak */}
      {canManage && (
        <section
          className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/50 p-3 sm:p-4"
          data-testid="kelas-wizard"
        >
          <p className="font-manrope font-semibold text-sm text-teal-900">Langkah pengerjaan</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {[
              {
                n: 1,
                title: "Kelas dibuat",
                desc: (data.data as any)?.batch?.name ?? "Kelas ini",
                done: true,
                action: null as null | { label: string; onClick: () => void },
              },
              {
                n: 2,
                title: "Masukkan siswa",
                desc:
                  (totals?.total ?? 0) > 0
                    ? `${totals?.total} siswa sudah masuk`
                    : "Unggah file Excel atau ketik manual",
                done: (totals?.total ?? 0) > 0,
                action: {
                  label: (totals?.total ?? 0) > 0 ? "Tambah lagi" : "Masukkan siswa",
                  onClick: () => setDlg("import"),
                },
              },
              {
                n: 3,
                title: "Bagikan undangan",
                desc:
                  (totals?.total ?? 0) > 0
                    ? "Kirim kode kelas / pesan WhatsApp ke siswa"
                    : "Tersedia setelah ada siswa",
                done: (totals?.total ?? 0) > 0 && (totals?.selesai ?? 0) > 0,
                action:
                  (totals?.total ?? 0) > 0
                    ? {
                        label: "Salin pesan WA",
                        onClick: () => {
                          const wa = (invite.data as any)?.waText;
                          if (wa) void copy(wa, "Teks WhatsApp");
                          else notify.warn("Menyiapkan pesan… coba lagi sebentar");
                        },
                      }
                    : null,
              },
            ].map((st) => (
              <div
                key={st.n}
                className={`rounded-xl border bg-white p-3 ${st.done ? "border-teal-200" : "border-gray-200"}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                      st.done ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {st.done ? "✓" : st.n}
                  </span>
                  <p className="font-bold font-manrope text-gray-900 text-sm">{st.title}</p>
                </div>
                <p className="mt-1 font-manrope text-gray-600 text-sm leading-snug">{st.desc}</p>
                {st.action && (
                  <button
                    type="button"
                    onClick={st.action.onClick}
                    className="mt-2 min-h-10 w-full rounded-lg bg-brand-navy px-3 py-2 font-bold font-manrope text-sm text-white"
                  >
                    {st.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          data-testid="participant-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / email / NIS…"
          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
        <span className="shrink-0 font-manrope text-[11px] text-gray-400">
          {filtered.length}/{items.length}
        </span>
      </div>

      {/* (M2.4) Filter status peserta */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="participant-filter">
        {(
          [
            ["all", "Semua", totals?.total ?? items.length],
            ["invited", "Belum mulai", totals?.belum ?? 0],
            ["in_progress", "Mengerjakan", totals?.mulai ?? 0],
            ["completed", "Selesai", totals?.selesai ?? 0],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            data-testid={`filter-${key}`}
            onClick={() => setStatusFilter(key)}
            className={`min-h-10 rounded-full px-3.5 py-2 font-manrope font-semibold text-sm transition-colors ${
              statusFilter === key ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label} · {n}
          </button>
        ))}
      </div>

      {/* Mobile: kartu (tabel 6 kolom tidak terbaca di layar kecil) */}
      <div className="mt-3 space-y-2 md:hidden" data-testid="participant-cards">
        {filtered.map((p) => {
          const st = STATUS[p.status] ?? STATUS.invited;
          return (
            <div
              key={p.id}
              data-testid="participant-card"
              className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => setDetail(p)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-bold font-manrope text-base text-gray-900">{p.name}</p>
                  <p className="truncate font-manrope text-gray-600 text-sm">
                    {[p.nis, p.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </button>
                <span className={`shrink-0 rounded-full px-2.5 py-1 font-manrope font-semibold text-xs ${st.cls}`}>
                  {st.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 font-manrope text-gray-700 text-sm">
                <span className="rounded-lg bg-gray-50 px-2 py-1">Minat: {p.hollandCode ?? "—"}</span>
                <span className="rounded-lg bg-gray-50 px-2 py-1">Selesai: {fmt(p.selesaiPada)}</span>
                {!p.email && p.claimCode ? (
                  <span
                    className={`rounded-lg px-2 py-1 font-bold font-mono ${
                      p.claimCodeUsed ? "bg-gray-100 text-gray-400 line-through" : "bg-teal-50 text-teal-700"
                    }`}
                  >
                    Kode siswa: {p.claimCode}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetail(p)}
                  className="min-h-10 flex-1 rounded-xl bg-brand-navy px-3 py-2 font-bold font-manrope text-sm text-white"
                >
                  Lihat hasil
                </button>
                {p.status !== "completed" && (
                  <button
                    type="button"
                    data-testid="nudge-button-mobile"
                    onClick={() => void ingatkan(p)}
                    disabled={nudging === p.id}
                    className="min-h-10 rounded-xl border border-teal-200 px-3 py-2 font-manrope font-semibold text-sm text-teal-700 disabled:opacity-50"
                  >
                    {nudging === p.id ? "…" : "Salin pesan WA"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center font-manrope text-gray-500 text-sm">
            Belum ada peserta yang cocok.
          </p>
        )}
      </div>

      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
        <table className="w-full text-left">
          <thead className="bg-gray-50 font-manrope text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3">Nama</th>
              <th className="px-3 py-3">Email / NIS</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Holland</th>
              <th className="px-3 py-3">Selesai</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center font-manrope text-gray-500 text-sm">
                  {items.length === 0
                    ? "Belum ada peserta di kelas ini."
                    : "Tidak ada peserta yang cocok dengan pencarian."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const st = STATUS[p.status] ?? { label: p.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr
                    key={p.id}
                    data-testid="participant-row"
                    onClick={() => setDetail(p)}
                    className="cursor-pointer border-gray-50 border-t transition-colors hover:bg-teal-50/40"
                    title="Lihat hasil peserta"
                  >
                    <td className="px-3 py-3 font-manrope font-semibold text-gray-900 text-sm">
                      {p.name}
                      <span className="ml-1 text-teal-600 text-xs">›</span>
                      {/* (M2.6) kode akses sekali pakai untuk peserta tanpa email */}
                      {!p.email && p.claimCode ? (
                        <span
                          data-testid="claim-code"
                          title="Kode akses sekali pakai (peserta tanpa email)"
                          className={`ml-1 rounded px-1.5 py-0.5 font-bold font-mono text-xs ${
                            p.claimCodeUsed ? "bg-gray-100 text-gray-400 line-through" : "bg-teal-50 text-teal-700"
                          }`}
                        >
                          {p.claimCode}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-manrope text-gray-600 text-sm">
                      {[p.email, p.nis].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2.5 py-1 font-manrope font-semibold text-xs ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-manrope font-semibold text-gray-800 text-sm">
                      {p.hollandCode ?? "—"}
                    </td>
                    <td className="px-3 py-3 font-manrope text-gray-600 text-sm">{fmt(p.selesaiPada)}</td>
                    <td className="px-3 py-3 text-right">
                      {p.status !== "completed" && (
                        <button
                          type="button"
                          data-testid="nudge-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void ingatkan(p);
                          }}
                          disabled={nudging === p.id}
                          className="min-h-9 rounded-lg border border-teal-200 px-3 py-1.5 font-manrope font-semibold text-teal-700 text-xs hover:bg-teal-50 disabled:opacity-50"
                        >
                          {nudging === p.id ? "…" : "Salin pesan WA"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Kartu jadwal tes (M2.3) */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-testid="schedule-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-manrope font-semibold text-gray-800 text-xs">Jadwal tes kelas</p>
          <span
            data-testid="schedule-state"
            className={`rounded-full px-2 py-0.5 font-manrope font-semibold text-[10px] ${
              (WSTATE[batch?.windowState as string] ?? WSTATE.tanpa_jadwal).cls
            }`}
          >
            {(WSTATE[batch?.windowState as string] ?? WSTATE.tanpa_jadwal).label}
          </span>
        </div>
        <p className="mt-1 font-manrope text-[11px] text-gray-500">
          {batch?.windowStart
            ? `${fmtWaktu(batch.windowStart)} → ${fmtWaktu(batch.windowEnd)}`
            : "Siswa bisa mengerjakan kapan saja. Atur jadwal untuk ujian serentak."}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Mulai</Label>
            <Input
              type="datetime-local"
              data-testid="schedule-start"
              value={sched?.start ?? toLocalInput(batch?.windowStart)}
              onChange={(e) =>
                setSched((v) => ({
                  mode: v?.mode ?? (batch?.scheduleMode as any) ?? "anytime",
                  start: e.target.value,
                  end: v?.end ?? toLocalInput(batch?.windowEnd),
                }))
              }
              className="mt-1 rounded-xl border-gray-200 bg-gray-50 text-xs"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Selesai</Label>
            <Input
              type="datetime-local"
              data-testid="schedule-end"
              value={sched?.end ?? toLocalInput(batch?.windowEnd)}
              onChange={(e) =>
                setSched((v) => ({
                  mode: v?.mode ?? (batch?.scheduleMode as any) ?? "anytime",
                  start: v?.start ?? toLocalInput(batch?.windowStart),
                  end: e.target.value,
                }))
              }
              className="mt-1 rounded-xl border-gray-200 bg-gray-50 text-xs"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            data-testid="schedule-save-scheduled"
            onClick={() => void simpanJadwal("scheduled")}
            disabled={busy}
            className="min-h-10 rounded-lg bg-brand-navy px-3 py-2 font-bold font-manrope text-sm text-white hover:brightness-110"
          >
            Simpan jadwal (serentak)
          </Button>
          <Button
            data-testid="schedule-save-anytime"
            variant="outline"
            onClick={() => void simpanJadwal("anytime")}
            disabled={busy}
            className="min-h-10 rounded-lg px-3 py-2 font-manrope text-sm"
          >
            Simpan sebagai rentang bebas
          </Button>
          <Button
            data-testid="schedule-clear"
            variant="ghost"
            onClick={() => void simpanJadwal("off")}
            disabled={busy}
            className="min-h-10 rounded-lg px-3 py-2 font-manrope text-gray-600 text-sm"
          >
            Hapus jadwal
          </Button>
        </div>
      </div>

      {/* Kartu undangan (M2.2) */}
      {invite.data && (invite.data as any).ok && (
        <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/50 p-4" data-testid="invite-card">
          <p className="font-manrope font-semibold text-base text-teal-900">Undangan peserta</p>
          <p className="mt-1 font-manrope text-[11px] text-gray-600">
            Bagikan kode ini ke siswa. Mereka masuk/daftar dengan email yang terdaftar di sekolah.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code
              data-testid="invite-code"
              className="rounded-lg bg-white px-3 py-1.5 font-bold font-bricolage text-base text-gray-900 tracking-widest"
            >
              {(invite.data as any).code ?? "—"}
            </code>
            <Button
              data-testid="invite-copy-link"
              variant="outline"
              onClick={() => void copy((invite.data as any).link, "Link undangan")}
              className="min-h-10 rounded-lg text-sm"
            >
              <Copy className="mr-1 h-4 w-4" /> Salin link
            </Button>
            <Button
              data-testid="invite-copy-wa"
              onClick={() => void copy((invite.data as any).waText, "Teks WhatsApp")}
              className="min-h-10 rounded-lg bg-teal-600 font-bold font-manrope text-sm text-white hover:bg-teal-700"
            >
              Salin teks WA
            </Button>
          </div>
          <p className="mt-2 break-all font-manrope text-[10px] text-gray-500">{(invite.data as any).link}</p>
        </div>
      )}

      <p className="mt-3 font-manrope text-[10px] text-gray-400">
        Hasil lengkap per peserta (skor per dimensi + rekomendasi jurusan) menyusul di tahap berikutnya.
      </p>

      {/* Dialog hasil peserta (M2.5) */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" data-testid="result-dialog">
          <DialogHeader>
            <DialogTitle className="font-bricolage">{detail?.name}</DialogTitle>
            <DialogDescription className="font-manrope text-xs">
              {[detail?.email, detail?.nis].filter(Boolean).join(" · ") || "—"}
            </DialogDescription>
          </DialogHeader>
          {hasil.isLoading ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-mentor-teal" />
            </div>
          ) : !(hasil.data as any)?.result ? (
            <p className="rounded-lg bg-gray-50 p-3 font-manrope text-gray-600 text-xs" data-testid="result-empty">
              Belum ada hasil — peserta ini belum menyelesaikan tes.
            </p>
          ) : (
            <div className="space-y-4" data-testid="result-content">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 font-bold font-bricolage text-sm text-teal-700">
                  Holland: {(hasil.data as any).result.hollandCode || "—"}
                </span>
                <span className="font-manrope text-[11px] text-gray-500">
                  Selesai {(hasil.data as any).result.completedAt ? fmt(detail?.selesaiPada) : "—"} · keyakinan{" "}
                  {(hasil.data as any).result.confidenceScore ?? "—"}%
                </span>
              </div>

              {/* Sebaran minat (Holland) */}
              {(() => {
                const hs = (hasil.data as any).result.hollandScores ?? {};
                const keys = ["R", "I", "A", "S", "E", "C"];
                const max = Math.max(1, ...keys.map((k) => Number(hs[k] ?? 0)));
                return (
                  <div>
                    <p className="font-manrope font-semibold text-gray-700 text-xs">Sebaran minat</p>
                    <div className="mt-1 space-y-1">
                      {keys.map((k) => {
                        const v = Number(hs[k] ?? 0);
                        return (
                          <div key={k} className="flex items-center gap-2">
                            <span className="w-4 font-manrope font-semibold text-[10px] text-gray-500">{k}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-brand-navy"
                                style={{ width: `${Math.round((v / max) * 100)}%` }}
                              />
                            </div>
                            <span className="w-6 text-right font-manrope text-[10px] text-gray-500">{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Kemampuan per dimensi */}
              {(() => {
                const ab: any = (hasil.data as any).result.abilityScores ?? {};
                const scores = ab?.scores ?? ab ?? {};
                const entries = Object.entries(scores).filter(([, v]: any) => v && typeof v === "object");
                if (!entries.length) return null;
                return (
                  <div>
                    <p className="font-manrope font-semibold text-gray-700 text-xs">Kemampuan per dimensi</p>
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      {entries.map(([k, v]: any) => (
                        <div key={k} className="rounded-lg bg-gray-50 px-2 py-1.5 font-manrope text-[11px]">
                          <span className="text-gray-500 capitalize">{k}</span>:{" "}
                          <b className="text-gray-800">
                            {v.correct ?? 0}/{v.total ?? 0}
                          </b>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Rekomendasi jurusan & karier */}
              {(hasil.data as any).majors?.length > 0 && (
                <div>
                  <p className="font-manrope font-semibold text-gray-700 text-xs">Rekomendasi jurusan</p>
                  <ol className="mt-1 space-y-0.5">
                    {(hasil.data as any).majors.slice(0, 5).map((m: any) => (
                      <li key={m.rank} className="font-manrope text-[11px] text-gray-700">
                        {m.rank}. {m.name}
                        {m.confidence ? <span className="text-gray-400"> · {m.confidence}%</span> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {(hasil.data as any).careers?.length > 0 && (
                <div>
                  <p className="font-manrope font-semibold text-gray-700 text-xs">Rekomendasi karier</p>
                  <ol className="mt-1 space-y-0.5">
                    {(hasil.data as any).careers.slice(0, 5).map((c: any) => (
                      <li key={c.rank} className="font-manrope text-[11px] text-gray-700">
                        {c.name}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog import CSV */}
      <Dialog
        open={dlg === "import"}
        onOpenChange={(o) => {
          if (!o) {
            setDlg(null);
            setImportResult(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" data-testid="import-dialog">
          <DialogHeader>
            <DialogTitle className="font-bricolage">Masukkan siswa</DialogTitle>
            <DialogDescription className="font-manrope text-gray-600 text-sm">
              Paling mudah: unggah file <b>Excel</b> (.xlsx/.xls) atau CSV dengan kolom{" "}
              <code className="rounded bg-gray-100 px-1">nama, email, nis</code>. Duplikat otomatis dilewati.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              data-testid="import-file"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="min-h-11 rounded-xl font-bold font-manrope text-sm"
            >
              <FileUp className="mr-1.5 h-4 w-4" /> Pilih file Excel / CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              className="hidden"
              data-testid="import-file-input"
              onChange={(e) => void bacaFile(e.target.files?.[0])}
            />
            {fileName && (
              <span className="font-manrope text-gray-600 text-sm" data-testid="import-file-name">
                {fileName}
              </span>
            )}
          </div>
          <p className="font-manrope text-gray-500 text-xs">
            Atau tempel daftar dari Excel di kolom bawah ini (satu baris = satu siswa):
          </p>
          <Textarea
            data-testid="import-csv"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            className="rounded-xl font-mono text-xs"
          />
          {importResult && (
            <div
              className="rounded-lg bg-gray-50 p-3 font-manrope text-[11px] text-gray-700"
              data-testid="import-result"
            >
              ✓ {importResult.imported} ditambahkan · {importResult.skipped} dilewati
              {importResult.failed.length > 0 && (
                <span className="text-amber-700">
                  {" "}
                  · {importResult.failed.length} gagal (baris {importResult.failed.map((f) => f.row).join(", ")})
                </span>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={unduhTemplate} className="mr-auto text-xs">
              ⬇ Template CSV
            </Button>
            <Button variant="ghost" onClick={() => setDlg(null)} disabled={busy}>
              Tutup
            </Button>
            <Button
              data-testid="import-submit"
              onClick={() => void jalankanImport()}
              disabled={busy}
              className="bg-brand-navy font-bold font-manrope text-white text-xs hover:brightness-110"
            >
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tambah satu peserta */}
      <Dialog open={dlg === "manual"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="sm:max-w-md" data-testid="manual-dialog">
          <DialogHeader>
            <DialogTitle className="font-bricolage">Tambah peserta</DialogTitle>
            <DialogDescription className="font-manrope text-sm">
              Email dipakai siswa untuk masuk. NIS opsional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama *</Label>
              <Input
                data-testid="manual-name"
                value={manual.name}
                onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Email</Label>
              <Input
                data-testid="manual-email"
                value={manual.email}
                onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))}
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">NIS</Label>
              <Input
                data-testid="manual-nis"
                value={manual.nis}
                onChange={(e) => setManual((m) => ({ ...m, nis: e.target.value }))}
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDlg(null)} disabled={busy}>
              Batal
            </Button>
            <Button
              data-testid="manual-submit"
              onClick={() => void tambahSatu()}
              disabled={busy}
              className="bg-brand-navy font-bold font-manrope text-white text-xs hover:brightness-110"
            >
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
