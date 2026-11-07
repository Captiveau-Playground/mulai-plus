"use client";

// Komponen tab analitik B2C — dipakai halaman /admin/assessment/b2c.
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Clock, Filter, Gauge, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { EmptyBlock, SkeletonRows, StatCard } from "@/components/admin/assessment-page-header";
import { holland } from "@/lib/holland";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type Scope = { code?: string; batchId?: string; schoolId?: string };

/** Ambil objek input untuk endpoint (buang key undefined). */
const scopeInput = (scope: Scope) => ({
  code: scope.code || undefined,
  batchId: scope.batchId,
  schoolId: scope.schoolId,
});

const nf = (v: number | null | undefined, suffix = "") =>
  v === null || v === undefined || Number.isNaN(v) ? "—" : `${v}${suffix}`;

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold font-bricolage text-gray-900">{title}</h2>
        {hint ? <span className="font-manrope text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Pilih tes (kode) — satu filter untuk semua tab. */
export function TestPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { code: string; name: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="analytics-code"
      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-manrope font-semibold text-gray-700 text-xs"
    >
      <option value="">Semua tes</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name || o.code}
        </option>
      ))}
    </select>
  );
}

// ── Funnel ────────────────────────────────────────────────────────────
export function FunnelTab({ scope }: { scope: Scope }) {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.analytics.funnel.queryOptions({ input: scopeInput(scope) }),
  });
  if (isLoading) return <SkeletonRows rows={4} />;
  if (!data || data.total === 0)
    return (
      <EmptyBlock icon={Filter} title="Belum ada sesi tes" description="Muncul setelah ada siswa mulai mengerjakan." />
    );

  const steps = [
    { label: "Mulai tes", value: data.total, tone: "bg-brand-navy" },
    { label: "Selesai", value: data.completed, tone: "bg-teal-500" },
    { label: "Timeout", value: data.timeouts, tone: "bg-amber-500" },
    { label: "Masih berjalan", value: data.byStatus.in_progress ?? 0, tone: "bg-gray-400" },
  ];
  const max = Math.max(1, ...steps.map((s) => s.value));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total sesi" value={data.total} sub="semua status" />
        <StatCard
          icon={Gauge}
          label="Tingkat selesai"
          value={`${data.completionRatePct}%`}
          sub={`${data.completed} sesi selesai`}
          tone="teal"
        />
        <StatCard
          icon={Clock}
          label="Median durasi"
          value={nf(data.medianDurationMinutes, " mnt")}
          sub={`P25 ${nf(data.p25DurationMinutes, " mnt")} · P75 ${nf(data.p75DurationMinutes, " mnt")}`}
          tone="violet"
        />
        <StatCard icon={AlertTriangle} label="Timeout" value={data.timeouts} sub="waktu habis" tone="amber" />
      </div>

      <Card title="Funnel penyelesaian" hint="proporsi terhadap total sesi">
        <div className="space-y-2.5">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 font-manrope text-gray-600 text-xs">{s.label}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span
                  className={cn("block h-full rounded-full", s.tone)}
                  style={{ width: `${(s.value / max) * 100}%` }}
                />
              </span>
              <span className="w-24 shrink-0 text-right font-manrope text-gray-500 text-xs tabular-nums">
                {s.value} · {data.total ? Math.round((s.value / data.total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Drop-off per dimensi" hint="sesi yang sampai ke bagian itu">
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 font-manrope text-[11px] text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Dimensi</th>
                <th className="px-3 py-2 text-right">Sampai</th>
                <th className="px-3 py-2 text-right">Drop</th>
              </tr>
            </thead>
            <tbody>
              {data.perDimension.slice(0, 12).map((d) => (
                <tr key={d.dimensionId} className="border-gray-50 border-t">
                  <td className="px-3 py-2 font-manrope text-gray-700 text-xs">
                    <span className="font-bold">{d.code}</span> · {d.name}
                  </td>
                  <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">{d.answered}</td>
                  <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">
                    <span className={d.dropRatePct > 30 ? "text-amber-600" : "text-gray-500"}>{d.dropRatePct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Butir soal ────────────────────────────────────────────────────────
const FLAG_STYLE: Record<string, string> = {
  "terlalu sulit": "bg-rose-50 text-rose-600 border-rose-200",
  "terlalu mudah": "bg-sky-50 text-sky-600 border-sky-200",
  "daya beda rendah": "bg-amber-50 text-amber-700 border-amber-200",
  "distractor mati": "bg-violet-50 text-violet-700 border-violet-200",
  "banyak dilewati": "bg-gray-100 text-gray-600 border-gray-200",
};

export function ItemsTab({ scope }: { scope: Scope }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.analytics.items.queryOptions({ input: { ...scopeInput(scope), minAnswers: 1 } }),
  });
  if (isLoading) return <SkeletonRows rows={5} />;
  if (!data || data.items.length === 0)
    return (
      <EmptyBlock
        icon={BarChart3}
        title="Belum ada jawaban per butir"
        description="Analitik butir muncul setelah ada sesi tes yang selesai."
      />
    );

  const rows = (onlyFlagged ? data.items.filter((i) => i.flags.length > 0) : data.items).slice(0, 300);
  const dimName = new Map(data.dimensions.map((d) => [d.id, d.code]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={BarChart3}
          label="Butir berjawaban"
          value={data.items.length}
          sub={`${data.questionCount} soal di versi`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Butir bermasalah"
          value={data.summary.flagged}
          sub="perlu ditinjau"
          tone="amber"
        />
        <StatCard
          icon={Gauge}
          label="Rata-rata kesulitan"
          value={nf(data.summary.avgP, "%")}
          sub="p-value (benar/dijawab)"
          tone="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="Rata-rata daya beda"
          value={nf(data.summary.avgDiscrimination)}
          sub="point-biserial"
          tone="violet"
        />
      </div>

      <Card title="Statistik butir soal" hint="p = proporsi benar · r = daya beda">
        <label className="mb-3 flex items-center gap-2 font-manrope text-gray-600 text-xs">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          Hanya butir bermasalah ({data.summary.flagged})
        </label>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 font-manrope text-[11px] text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Versi</th>
                <th className="px-3 py-2">Soal</th>
                <th className="px-3 py-2">Dim</th>
                <th className="px-3 py-2 text-right">Dijawab</th>
                <th className="px-3 py-2 text-right">Benar</th>
                <th className="px-3 py-2 text-right">p / poin</th>
                <th className="px-3 py-2 text-right">r</th>
                <th className="px-3 py-2">Sebaran</th>
                <th className="px-3 py-2">Tanda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.questionId} className="border-gray-50 border-t align-top">
                  <td className="px-3 py-2 font-manrope text-gray-400 text-xs tabular-nums">{it.order + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-manrope text-[10px] text-gray-500">
                    {(it as any).testCode} v{(it as any).versionNumber ?? "?"}
                  </td>
                  <td className="max-w-[320px] px-3 py-2">
                    <p className="truncate font-manrope text-gray-800 text-xs" title={it.text}>
                      {it.text}
                    </p>
                    {it.code ? <span className="font-manrope text-[10px] text-gray-400">{it.code}</span> : null}
                  </td>
                  <td className="px-3 py-2 font-bold font-manrope text-gray-500 text-xs">
                    {dimName.get(it.dimensionId) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">
                    {it.answered}
                  </td>
                  <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">{it.correct}</td>
                  <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">
                    {it.type === "likert"
                      ? it.meanScore === null
                        ? "—"
                        : `Ø ${it.meanScore}`
                      : it.p === null
                        ? "—"
                        : `${Math.round(it.p * 100)}%`}
                  </td>
                  <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">
                    <span
                      className={
                        it.discrimination === null
                          ? "text-gray-400"
                          : it.discrimination < 0.2
                            ? "text-amber-600"
                            : "text-teal-600"
                      }
                    >
                      {it.discrimination === null ? "—" : it.discrimination.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-manrope text-[10px] text-gray-500">
                    {Object.entries(it.options)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(" · ")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {it.flags.map((f) => (
                        <span
                          key={f}
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 font-manrope text-[10px]",
                            FLAG_STYLE[f] ?? "border-gray-200 bg-gray-50 text-gray-600",
                          )}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Versi ─────────────────────────────────────────────────────────────
export function VersionsTab({ scope }: { scope: Scope }) {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.analytics.versions.queryOptions({ input: scopeInput(scope) }),
  });
  if (isLoading) return <SkeletonRows rows={4} />;
  if (!data || data.versions.length === 0)
    return <EmptyBlock icon={Filter} title="Belum ada versi" description="Versi muncul setelah tes punya sesi." />;

  return (
    <Card title="Perbandingan versi soal" hint="versi mana yang paling baik menyelesaikan siswa">
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 font-manrope text-[11px] text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2">Tes</th>
              <th className="px-3 py-2">Versi</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Soal</th>
              <th className="px-3 py-2 text-right">Sesi</th>
              <th className="px-3 py-2 text-right">Selesai</th>
              <th className="px-3 py-2 text-right">Konversi</th>
              <th className="px-3 py-2 text-right">Confidence</th>
              <th className="px-3 py-2 text-right">Rata p</th>
              <th className="px-3 py-2 text-right">Median durasi</th>
            </tr>
          </thead>
          <tbody>
            {data.versions.map((v) => (
              <tr key={v.versionId} className="border-gray-50 border-t">
                <td className="px-3 py-2 font-manrope text-gray-600 text-xs">{(v as any).testCode || "—"}</td>
                <td className="px-3 py-2 font-bold font-manrope text-gray-800 text-xs">v{v.versionNumber ?? "?"}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-manrope text-[10px]",
                      v.status === "live" ? "bg-teal-500/10 text-teal-700" : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {v.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">{v.items}</td>
                <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">{v.sessions}</td>
                <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">{v.completed}</td>
                <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">{v.completionRatePct}%</td>
                <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">{nf(v.avgConfidence, "%")}</td>
                <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">{nf(v.avgPPct, "%")}</td>
                <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">
                  {nf(v.medianDurationMinutes, " mnt")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Tren ──────────────────────────────────────────────────────────────
export function TrendTab({ scope }: { scope: Scope }) {
  const [days, setDays] = useState(14);
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.analytics.timeseries.queryOptions({ input: { ...scopeInput(scope), days } }),
  });
  if (isLoading) return <SkeletonRows rows={3} />;
  const points = data?.points ?? [];
  const max = Math.max(1, ...points.map((p) => Math.max(p.started, p.completed)));

  return (
    <Card title="Tren harian" hint={`${days} hari terakhir`}>
      <div className="mb-3 flex gap-1">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              "rounded-lg px-2.5 py-1 font-manrope font-semibold text-xs",
              days === d ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600",
            )}
          >
            {d}h
          </button>
        ))}
      </div>
      {points.length === 0 ? (
        <EmptyBlock icon={TrendingUp} title="Belum ada data" description="Belum ada sesi pada rentang ini." />
      ) : (
        <>
          <div className="flex h-40 items-end gap-1.5">
            {points.map((p) => (
              <div key={p.date} className="group flex flex-1 flex-col items-center justify-end gap-0.5">
                <span className="font-manrope text-[9px] text-gray-400 tabular-nums">{p.started || ""}</span>
                <div className="flex w-full items-end gap-0.5" style={{ height: 110 }}>
                  <div
                    className="w-1/2 rounded-t bg-brand-navy/70"
                    style={{ height: `${(p.started / max) * 100}%` }}
                    title={`${p.date} · mulai ${p.started}`}
                  />
                  <div
                    className="w-1/2 rounded-t bg-teal-500"
                    style={{ height: `${(p.completed / max) * 100}%` }}
                    title={`${p.date} · selesai ${p.completed}`}
                  />
                </div>
                <span className="font-manrope text-[9px] text-gray-400">{p.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 font-manrope text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-brand-navy/70" /> mulai
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-teal-500" /> selesai
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

// ── Segmen ────────────────────────────────────────────────────────────
export function SegmentsTab({ scope }: { scope: Scope }) {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.analytics.segments.queryOptions({ input: scopeInput(scope) }),
  });
  if (isLoading) return <SkeletonRows rows={4} />;
  if (!data) return null;

  const table = (
    title: string,
    rows: { key: string; sessions: number; users: number; completionRatePct: number; avgConfidence: number | null }[],
  ) => (
    <Card title={title} hint="sesi · pengguna · konversi · confidence">
      {rows.length === 0 ? (
        <p className="font-manrope text-gray-500 text-xs">Belum ada data.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-left">
            <tbody>
              {rows.slice(0, 12).map((r) => (
                <tr key={r.key} className="border-gray-50 border-t first:border-t-0">
                  <td className="px-3 py-2 font-manrope text-gray-700 text-xs">{r.key}</td>
                  <td className="px-3 py-2 text-right font-manrope text-gray-500 text-xs tabular-nums">{r.sessions}</td>
                  <td className="px-3 py-2 text-right font-manrope text-gray-500 text-xs tabular-nums">{r.users}</td>
                  <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">{r.completionRatePct}%</td>
                  <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">{nf(r.avgConfidence, "%")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {table("Sumber peserta", data.bySource)}
      {table("Jenjang sekolah", data.byLevel)}
      {table("Sekolah (top 12)", data.bySchool)}
      {table("Kota (top 12)", data.byCity)}
    </div>
  );
}

// ── Perlu perhatian ───────────────────────────────────────────────────
export function AttentionTab({ scope }: { scope: Scope }) {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.analytics.attention.queryOptions({ input: { ...scopeInput(scope), limit: 100 } }),
  });
  if (isLoading) return <SkeletonRows rows={4} />;
  const items = data?.items ?? [];

  return (
    <Card title="Peserta yang perlu ditindaklanjuti" hint={`${items.length} dari ${data?.checked ?? 0} sesi selesai`}>
      {items.length === 0 ? (
        <EmptyBlock
          icon={Users}
          title="Tidak ada yang perlu perhatian"
          description="Semua hasil punya keyakinan yang cukup."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 font-manrope text-[11px] text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Profil</th>
                <th className="px-3 py-2 text-right">Confidence</th>
                <th className="px-3 py-2">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.sessionId} className="border-gray-50 border-t">
                  <td className="px-3 py-2 font-manrope text-gray-800 text-xs">{i.name}</td>
                  <td className="px-3 py-2">
                    {i.profileCode ? (
                      <span className="flex gap-1">
                        {String(i.profileCode)
                          .split(/[-,]/)
                          .filter(Boolean)
                          .slice(0, 3)
                          .map((c) => (
                            <span
                              key={c}
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded border font-bold text-[10px]",
                                holland(c).soft,
                                holland(c).text,
                              )}
                            >
                              {c.trim()}
                            </span>
                          ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">{nf(i.confidence, "%")}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {i.reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-manrope text-[10px] text-amber-700"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Kohort (B2B): ringkasan kelas/sekolah ─────────────────────────────
export function CohortSummary({ scope, onPickBatch }: { scope: Scope; onPickBatch?: (batchId: string) => void }) {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.analytics.cohort.queryOptions({ input: scopeInput(scope) as any }),
  });
  if (isLoading) return <SkeletonRows rows={4} />;
  if (!data) return null;

  const c = data.counts;
  const _dist = new Map(data.holland.map((h) => [h.code, h]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total siswa" value={c.total} sub={`${c.invited} belum mulai`} />
        <StatCard
          icon={Gauge}
          label="Selesai"
          value={c.completed}
          sub={`${c.completionRatePct}% konversi`}
          tone="teal"
        />
        <StatCard
          icon={Clock}
          label="Rata-rata confidence"
          value={nf(data.confidenceAvg, "%")}
          sub={`${data.funnel.total} sesi tes tercatat`}
          tone="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="Perlu perhatian"
          value={data.attention.length}
          sub="keyakinan rendah / belum selesai"
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sebaran minat (kohort)" hint="kode utama">
          <div className="space-y-2">
            {data.holland.map((h) => {
              const meta = holland(h.code);
              const max = Math.max(1, ...data.holland.map((x) => x.count));
              return (
                <div key={h.code} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded border font-bold text-[10px]",
                      meta.soft,
                      meta.text,
                    )}
                  >
                    {h.code}
                  </span>
                  <span className="w-24 truncate font-manrope text-gray-600 text-xs">{meta.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className={cn("block h-full rounded-full", meta.bar)}
                      style={{ width: `${(h.count / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-16 text-right font-manrope text-[11px] text-gray-500 tabular-nums">
                    {h.count} · {h.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Kemampuan (rata-rata kohort)" hint="benar / total">
          {data.ability.length === 0 ? (
            <p className="font-manrope text-gray-500 text-xs">Belum ada data kemampuan (tes bakat belum dikerjakan).</p>
          ) : (
            <div className="space-y-2">
              {data.ability.map((a) => (
                <div key={a.key} className="flex items-center gap-3">
                  <span className="w-28 truncate font-manrope text-gray-600 text-xs capitalize">{a.key}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        a.pct >= 70 ? "bg-teal-500" : a.pct >= 40 ? "bg-amber-400" : "bg-rose-400",
                      )}
                      style={{ width: `${a.pct}%` }}
                    />
                  </span>
                  <span className="w-14 text-right font-manrope text-[11px] text-gray-500 tabular-nums">{a.pct}%</span>
                </div>
              ))}
              {data.strongest ? (
                <p className="pt-1 font-manrope text-[11px] text-gray-500">
                  Terkuat <b className="text-teal-700">{data.strongest.key}</b> · terlemah{" "}
                  <b className="text-rose-600">{data.weakest?.key ?? "—"}</b>
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      {!scope.batchId && data.batches.length > 0 ? (
        <Card title="Per batch / kelas" hint="klik untuk buka analitik kelas">
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left">
              <thead className="bg-gray-50 font-manrope text-[11px] text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Kelas</th>
                  <th className="px-3 py-2 text-right">Siswa</th>
                  <th className="px-3 py-2 text-right">Selesai</th>
                  <th className="px-3 py-2 text-right">Konversi</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((b) => (
                  <tr key={b.id} className="border-gray-50 border-t">
                    <td className="px-3 py-2 font-manrope font-semibold text-gray-800 text-xs">
                      {onPickBatch ? (
                        <button
                          type="button"
                          onClick={() => onPickBatch(b.id)}
                          className="text-brand-navy hover:underline"
                        >
                          {b.name}
                        </button>
                      ) : (
                        b.name
                      )}
                    </td>
                    <td className="px-3 py-2 font-manrope text-gray-500 text-xs">{b.className ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">{b.total}</td>
                    <td className="px-3 py-2 text-right font-manrope text-gray-600 text-xs tabular-nums">
                      {b.completed}
                    </td>
                    <td className="px-3 py-2 text-right font-manrope text-xs tabular-nums">{b.completionRatePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {data.topMajors.length > 0 ? (
        <Card title="Rekomendasi jurusan terpopuler" hint="peringkat 1–3">
          <div className="flex flex-wrap gap-2">
            {data.topMajors.map((m) => (
              <span key={m.name} className="rounded-full bg-brand-navy/5 px-3 py-1 font-manrope text-gray-700 text-xs">
                {m.name} <b className="text-brand-navy">{m.count}×</b>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {data.attention.length > 0 ? (
        <Card title="Perlu ditindaklanjuti" hint={`${data.attention.length} siswa`}>
          <div className="flex flex-wrap gap-2">
            {data.attention.slice(0, 12).map((a) => (
              <span
                key={a.studentId}
                className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 font-manrope text-[11px] text-amber-800"
              >
                {a.name} · {a.reasons.join(", ")}
              </span>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/** Tab bar analitik yang bisa dipakai di halaman B2C, sekolah, maupun kelas. */
export function AnalyticsTabs({ scope, withCohort = false }: { scope: Scope; withCohort?: boolean }) {
  const tabs = [...(withCohort ? (["kohort"] as const) : []), "butir", "funnel", "versi", "tren", "perhatian"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>(withCohort ? "kohort" : "butir");
  const LABEL: Record<string, string> = {
    kohort: "Ringkasan kohort",
    butir: "Butir Soal",
    funnel: "Funnel",
    versi: "Versi",
    tren: "Tren",
    perhatian: "Perlu Perhatian",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1" data-testid="cohort-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            data-testid={`cohort-tab-${t}`}
            className={cn(
              "rounded-lg px-3 py-1.5 font-manrope font-semibold text-xs transition-colors",
              tab === t ? "bg-white text-brand-navy shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}
          >
            {LABEL[t]}
          </button>
        ))}
      </div>
      {tab === "kohort" ? <CohortSummary scope={scope} /> : null}
      {tab === "butir" ? <ItemsTab scope={scope} /> : null}
      {tab === "funnel" ? <FunnelTab scope={scope} /> : null}
      {tab === "versi" ? <VersionsTab scope={scope} /> : null}
      {tab === "tren" ? <TrendTab scope={scope} /> : null}
      {tab === "perhatian" ? <AttentionTab scope={scope} /> : null}
    </div>
  );
}
