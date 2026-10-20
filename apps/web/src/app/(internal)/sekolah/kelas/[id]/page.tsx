"use client";

// (M2.1) Detail kelas: daftar peserta + status pengerjaan + Holland code ringkas.
// READ-ONLY dulu (import/undang & jadwal menyusul di M2.2/M2.3).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, FileUp, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
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

  const data = useQuery({
    ...orpc.school.participants.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });
  const invite = useQuery({
    ...orpc.school.invite.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
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
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((p) =>
      [p.name, p.email, p.nis].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(needle)),
    );
  }, [items, q]);

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
    <div className="mx-auto max-w-5xl px-4 py-6" data-testid="cohort-detail">
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
          <Button
            data-testid="participant-import-open"
            onClick={() => setDlg("import")}
            className="rounded-xl bg-brand-navy px-3 py-2 font-bold font-manrope text-white text-xs hover:brightness-110"
          >
            <FileUp className="mr-1 h-3.5 w-3.5" /> Import peserta
          </Button>
          <Button
            data-testid="participant-add-open"
            onClick={() => setDlg("manual")}
            variant="outline"
            className="rounded-xl px-3 py-2 font-bold font-manrope text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah satu
          </Button>
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

      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 font-manrope text-[10px] text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Email / NIS</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Holland</th>
              <th className="px-3 py-2">Selesai</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center font-manrope text-gray-400 text-xs">
                  {items.length === 0
                    ? "Belum ada peserta di kelas ini."
                    : "Tidak ada peserta yang cocok dengan pencarian."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const st = STATUS[p.status] ?? { label: p.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={p.id} data-testid="participant-row" className="border-gray-50 border-t">
                    <td className="px-3 py-2 font-manrope font-semibold text-gray-800 text-xs">{p.name}</td>
                    <td className="px-3 py-2 font-manrope text-[11px] text-gray-500">
                      {[p.email, p.nis].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-manrope font-semibold text-[10px] ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-manrope font-semibold text-gray-700 text-xs">
                      {p.hollandCode ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-manrope text-[11px] text-gray-500">{fmt(p.selesaiPada)}</td>
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
              (WSTATE[batch?.windowState as string] ?? WSTATE.tanpa_jadwal!).cls
            }`}
          >
            {(WSTATE[batch?.windowState as string] ?? WSTATE.tanpa_jadwal!).label}
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
            className="rounded-lg bg-brand-navy px-3 py-1.5 font-bold font-manrope text-[11px] text-white hover:brightness-110"
          >
            Simpan jadwal (serentak)
          </Button>
          <Button
            data-testid="schedule-save-anytime"
            variant="outline"
            onClick={() => void simpanJadwal("anytime")}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 font-manrope text-[11px]"
          >
            Simpan sebagai rentang bebas
          </Button>
          <Button
            data-testid="schedule-clear"
            variant="ghost"
            onClick={() => void simpanJadwal("off")}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 font-manrope text-[11px] text-gray-500"
          >
            Hapus jadwal
          </Button>
        </div>
      </div>

      {/* Kartu undangan (M2.2) */}
      {invite.data && (invite.data as any).ok && (
        <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/50 p-4" data-testid="invite-card">
          <p className="font-manrope font-semibold text-teal-800 text-xs">Undangan peserta</p>
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
              className="rounded-lg text-xs"
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Salin link
            </Button>
            <Button
              data-testid="invite-copy-wa"
              onClick={() => void copy((invite.data as any).waText, "Teks WhatsApp")}
              className="rounded-lg bg-teal-600 font-bold font-manrope text-white text-xs hover:bg-teal-700"
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
            <DialogTitle className="font-bricolage">Import peserta (CSV)</DialogTitle>
            <DialogDescription className="font-manrope text-sm">
              Format kolom: <code>nama,email,nis</code>. Duplikat (email/NIS yang sudah ada) dilewati otomatis.
            </DialogDescription>
          </DialogHeader>
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
