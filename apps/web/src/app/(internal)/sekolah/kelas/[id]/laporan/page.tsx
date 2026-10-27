"use client";

// (M3) Laporan insight kelas: distribusi Holland, jurusan/karier teratas,
// kemampuan per dimensi, daftar "perlu perhatian" + unduh PDF ber-kop sekolah.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, History, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateCohortReportPdf } from "@/lib/cohort-report-pdf";
import { HOLLAND_ORDER, holland } from "@/lib/holland";
import { notify } from "@/lib/toast";
import { client, orpc } from "@/utils/orpc";

const DIM_LABEL: Record<string, string> = {
  verbal: "Verbal",
  numerical: "Numerik",
  logical: "Logika",
  spatial: "Spasial",
  clerical: "Ketelitian",
};

const fmt = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function SchoolCohortReportPage() {
  const params = useParams<{ id: string }>();
  const batchId = String(params?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    ...orpc.school.cohortInsight.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });
  const reports = useQuery({
    ...orpc.school.reports.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });
  const d: any = data;
  const insight = d?.ok ? d : null;

  const unduh = async () => {
    if (!insight) return;
    setBusy(true);
    try {
      const blob = await generateCohortReportPdf(insight as any);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-insight-${String(insight.batch?.className ?? "kelas").replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success("Laporan PDF diunduh");
    } catch {
      notify.error("Gagal membuat PDF");
    } finally {
      setBusy(false);
    }
  };

  /** Simpan snapshot: angka laporan "dibekukan" pada tanggal ini. */
  const simpan = async () => {
    setSaving(true);
    try {
      const r: any = await (client as any).school.saveReport({ batchId });
      if (!r?.ok) {
        notify.error(r?.error === "belum_ada_hasil" ? "Belum ada hasil untuk disimpan" : "Gagal menyimpan laporan");
        return;
      }
      notify.success("Laporan tersimpan (snapshot)");
      await qc.invalidateQueries({ queryKey: orpc.school.reports.queryKey({ input: { batchId } }) });
    } catch {
      notify.error("Gagal menyimpan laporan");
    } finally {
      setSaving(false);
    }
  };

  /** Cetak ulang PDF dari snapshot tersimpan (angka tidak berubah). */
  const unduhSnapshot = async (id: string) => {
    try {
      const r: any = await (client as any).school.report({ id });
      if (!r?.ok) {
        notify.error("Snapshot tidak ditemukan");
        return;
      }
      const blob = await generateCohortReportPdf(r.snapshot as any);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-tersimpan-${String(r.createdAt ?? "").slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notify.error("Gagal membuat PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  if (isError || !insight) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="rounded-xl bg-red-50 p-4 font-manrope text-red-700 text-sm" data-testid="report-error">
          Laporan tidak bisa dimuat. Pastikan kelas ini milik sekolah Anda.
        </p>
        <Link href="/sekolah/kelas" className="mt-3 inline-block font-manrope text-mentor-teal text-xs underline">
          ← Kembali ke daftar kelas
        </Link>
      </div>
    );
  }

  const c = insight.counts;

  return (
    <div className="w-full p-4 pb-16 sm:p-6">
      <Link
        href={`/sekolah/kelas/${batchId}`}
        className="inline-flex items-center gap-1 font-manrope text-gray-500 text-xs hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke kelas
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bricolage font-extrabold text-2xl text-brand-navy" data-testid="report-title">
            Laporan {insight.batch?.className ?? insight.batch?.name ?? "Kelas"}
          </h1>
          <p className="mt-1 font-manrope text-gray-500 text-xs">
            {insight.school ?? "Sekolah"} ·{" "}
            {fmt(insight.range?.first) === fmt(insight.range?.last)
              ? fmt(insight.range?.first)
              : `${fmt(insight.range?.first)} – ${fmt(insight.range?.last)}`}
          </p>
        </div>
        <Button
          data-testid="download-pdf"
          onClick={() => void unduh()}
          disabled={busy || !c.completed}
          className="rounded-xl font-bold font-manrope text-xs"
        >
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
          Unduh PDF
        </Button>
        <Button
          data-testid="save-report"
          variant="outline"
          onClick={() => void simpan()}
          disabled={saving || !c?.completed}
          className="rounded-xl font-bold font-manrope text-xs"
        >
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
          Simpan
        </Button>
      </div>

      {/* Ringkasan */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="report-summary">
        {[
          ["Peserta", c.total],
          ["Selesai", c.completed],
          ["Mengerjakan", c.inProgress],
          ["Belum mulai", c.invited],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="font-manrope text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="font-bricolage font-extrabold text-2xl text-brand-navy">{val as number}</p>
          </div>
        ))}
      </div>

      {c.completed === 0 ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 font-manrope text-amber-800 text-xs" data-testid="report-empty">
          Belum ada peserta yang menyelesaikan tes, insight akan muncul setelah ada hasil.
        </p>
      ) : (
        <>
          {/* Kualitas hasil */}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="font-manrope text-[10px] text-gray-500 uppercase tracking-wide">
                Rata-rata keyakinan jawaban
              </p>
              <p className="font-bricolage font-extrabold text-brand-navy text-xl">{insight.confidenceAvg ?? "—"}%</p>
            </div>
            <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-3">
              <p className="font-manrope text-[10px] text-teal-700 uppercase tracking-wide">Dimensi terkuat</p>
              <p className="font-bricolage font-extrabold text-teal-800 text-xl">
                {insight.strongest ? (DIM_LABEL[insight.strongest.key] ?? insight.strongest.key) : "—"}
                {insight.strongest ? (
                  <span className="ml-1 font-manrope font-semibold text-sm">({insight.strongest.pct}%)</span>
                ) : null}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
              <p className="font-manrope text-[10px] text-amber-700 uppercase tracking-wide">Perlu latihan</p>
              <p className="font-bricolage font-extrabold text-amber-800 text-xl">
                {insight.weakest ? (DIM_LABEL[insight.weakest.key] ?? insight.weakest.key) : "—"}
                {insight.weakest ? (
                  <span className="ml-1 font-manrope font-semibold text-sm">({insight.weakest.pct}%)</span>
                ) : null}
              </p>
            </div>
          </div>

          {/* Distribusi Holland */}
          <section
            className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            data-testid="holland-dist"
          >
            <h2 className="font-bold font-bricolage text-brand-navy text-sm">Sebaran minat siswa</h2>
            <div className="mt-2 space-y-1.5">
              {insight.hollandDist.map((h: any) => {
                const meta = holland(h.code);
                const max = Math.max(1, ...insight.hollandDist.map((x: any) => x.count));
                return (
                  <div key={h.code} className="flex items-center gap-2">
                    <span className="w-24 font-manrope text-[11px] text-gray-600">
                      <b className={meta.text}>{h.code}</b> {meta.name}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${meta.bar}`}
                        style={{ width: `${(h.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-manrope text-[10px] text-gray-500">
                      {h.count} · {h.pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Kemampuan */}
          {insight.ability.length > 0 && (
            <section
              className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              data-testid="ability-dist"
            >
              <h2 className="font-bold font-bricolage text-brand-navy text-sm">Kemampuan per Dimensi</h2>
              <div className="mt-2 space-y-1.5">
                {insight.ability.map((a: any) => (
                  <div key={a.key} className="flex items-center gap-2">
                    <span className="w-24 font-manrope text-[11px] text-gray-600">{DIM_LABEL[a.key] ?? a.key}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${a.pct >= 70 ? "bg-teal-500" : a.pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${a.pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-manrope text-[10px] text-gray-500">
                      {a.pct}% ({a.correct}/{a.total})
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Jurusan & karier */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-testid="top-majors">
              <h2 className="font-bold font-bricolage text-brand-navy text-sm">Jurusan Teratas</h2>
              {insight.topMajors.length === 0 ? (
                <p className="mt-2 font-manrope text-gray-400 text-xs">Belum ada rekomendasi.</p>
              ) : (
                <ol className="mt-2 space-y-1">
                  {insight.topMajors.map((m: any, i: number) => (
                    <li
                      key={m.name}
                      className="flex items-center justify-between gap-2 font-manrope text-gray-700 text-xs"
                    >
                      <span className="truncate">
                        <b className="text-gray-400">{i + 1}.</b> {m.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-500">
                        {m.count} · {m.pct}%
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-testid="top-careers">
              <h2 className="font-bold font-bricolage text-brand-navy text-sm">Karier Teratas</h2>
              {insight.topCareers.length === 0 ? (
                <p className="mt-2 font-manrope text-gray-400 text-xs">Belum ada rekomendasi.</p>
              ) : (
                <ol className="mt-2 space-y-1">
                  {insight.topCareers.map((m: any, i: number) => (
                    <li
                      key={m.name}
                      className="flex items-center justify-between gap-2 font-manrope text-gray-700 text-xs"
                    >
                      <span className="truncate">
                        <b className="text-gray-400">{i + 1}.</b> {m.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-500">
                        {m.count} · {m.pct}%
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {/* Perlu perhatian */}
          <section className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4" data-testid="attention-list">
            <h2 className="flex items-center gap-1 font-bold font-bricolage text-amber-900 text-sm">
              <FileText className="h-4 w-4" /> Perlu Perhatian ({insight.attention.length})
            </h2>
            {insight.attention.length === 0 ? (
              <p className="mt-1 font-manrope text-amber-800 text-xs">Semua peserta terpantau baik. 👏</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {insight.attention.map((a: any) => (
                  <li key={a.participantId} className="flex flex-wrap items-center gap-1 font-manrope text-xs">
                    <span className="font-semibold text-gray-800">{a.name}</span>
                    <span className="text-amber-700">— {a.reasons.join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Riwayat snapshot laporan */}
      <section className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-testid="report-history">
        <h2 className="flex items-center gap-1 font-bold font-bricolage text-brand-navy text-sm">
          <History className="h-4 w-4" /> Riwayat laporan
        </h2>
        {!(reports.data as any)?.items?.length ? (
          <p className="mt-1 font-manrope text-gray-400 text-xs">
            Belum ada laporan tersimpan. Tekan "Simpan" untuk membekukan angka hari ini.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-50">
            {(reports.data as any).items.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <p className="font-manrope font-semibold text-gray-800 text-xs">{fmt(r.createdAt)}</p>
                  <p className="font-manrope text-[10px] text-gray-500">
                    {r.completed}/{r.total} peserta selesai
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="history-pdf"
                  onClick={() => void unduhSnapshot(r.id)}
                  className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 font-manrope font-semibold text-[10px] text-gray-700 hover:bg-gray-50"
                >
                  ⬇ PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 font-manrope text-[10px] text-gray-400">
        Kode Holland: {HOLLAND_ORDER.map((k) => `${k}=${holland(k).name}`).join(" · ")}
      </p>
    </div>
  );
}
