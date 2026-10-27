"use client";

// Dashboard admin sekolah (B2B). Menampilkan status keanggotaan + ringkasan data
// sekolah: jumlah peserta, progres, dan sebaran minat (Holland) — READ-ONLY.
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, GraduationCap, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

const HOLLAND: { code: string; name: string; emoji: string }[] = [
  { code: "R", name: "Realistic", emoji: "🔧" },
  { code: "I", name: "Investigative", emoji: "🔬" },
  { code: "A", name: "Artistic", emoji: "🎨" },
  { code: "S", name: "Social", emoji: "🤝" },
  { code: "E", name: "Enterprising", emoji: "📈" },
  { code: "C", name: "Conventional", emoji: "🗂️" },
];

function Stat({ label, value, sub, testId }: { label: string; value: number | string; sub?: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="font-manrope font-semibold text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-bold font-bricolage text-3xl text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 font-manrope text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

export default function SchoolDashboardPage() {
  const me = useQuery(orpc.school.me.queryOptions());
  const aktif = me.data?.member?.status === "aktif" && me.data?.org?.status === "aktif";
  const overview = useQuery({ ...orpc.school.overview.queryOptions(), enabled: aktif });
  // (M4.3) kode rujukan sekolah (referral antar sekolah)
  const referral = useQuery({ ...orpc.school.referral.queryOptions({ input: {} }), enabled: aktif });

  if (me.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  const org = me.data?.org ?? null;
  const member = me.data?.member ?? null;

  // ── Belum mendaftar ───────────────────────────────────────────────────────
  if (!org || !member) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="school-not-registered">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy/5">
          <GraduationCap className="h-7 w-7 text-brand-navy" />
        </span>
        <h1 className="mt-4 font-bold font-bricolage text-2xl text-gray-900">Sekolahmu belum terdaftar</h1>
        <p className="mt-2 font-manrope text-gray-500 text-sm">
          Daftarkan sekolah untuk mendapatkan akses dashboard peserta, hasil tes, dan insight kelas.
        </p>
        <Link
          href={"/sekolah/daftar" as any}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 font-bold font-manrope text-sm text-white hover:brightness-110"
        >
          Daftarkan sekolah
        </Link>
      </div>
    );
  }

  // ── Menunggu persetujuan / ditolak ───────────────────────────────────────
  if (member.status !== "aktif" || org.status !== "aktif") {
    const ditolak = org.status === "ditolak" || member.status === "ditolak";
    return (
      <div className="mx-auto max-w-xl px-4 py-16" data-testid="school-status">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <CalendarClock className="h-7 w-7 text-amber-600" />
          </span>
          <h1 className="mt-4 font-bold font-bricolage text-gray-900 text-xl" data-testid="school-status-title">
            {ditolak ? "Pendaftaran belum disetujui" : "Menunggu persetujuan admin MULAI+"}
          </h1>
          <p className="mt-2 font-manrope text-gray-500 text-sm">
            {ditolak
              ? "Pendaftaran sekolah ini tidak disetujui. Hubungi tim MULAI+ untuk tindak lanjut."
              : "Pendaftaran sekolahmu sedang kami verifikasi (maksimal 1×24 jam kerja). Kami kabari lewat email/WhatsApp."}
          </p>
          <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-left">
            <p className="font-manrope font-semibold text-gray-700 text-xs">{org.name}</p>
            <p className="font-manrope text-gray-500 text-sm">{[org.city, org.type].filter(Boolean).join(" · ")}</p>
            {org.note && (
              <p className="mt-1 font-manrope text-[11px] text-amber-700" data-testid="school-note">
                Catatan: {org.note}
              </p>
            )}
          </div>
          <p className="mt-4 font-manrope text-[11px] text-gray-400">
            Butuh bantuan cepat? Balas email selamat datang dari tim MULAI+ atau hubungi PIC kami.
          </p>
        </div>
      </div>
    );
  }

  // ── Aktif ────────────────────────────────────────────────────────────────
  const t = overview.data?.totals;
  const batches = overview.data?.batches ?? [];
  const holland = overview.data?.hollandDistribution ?? {};
  const maxHolland = Math.max(1, ...HOLLAND.map((h) => Number(holland[h.code] ?? 0)));

  return (
    <div className="w-full px-4 py-6 sm:px-6" data-testid="school-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-manrope font-semibold text-[11px] text-teal-600 uppercase tracking-wide">
            Dashboard Sekolah
          </p>
          <h1 className="font-bold font-bricolage text-2xl text-gray-900">{org.name}</h1>
          <p className="font-manrope text-gray-500 text-xs">
            {[org.city, org.type].filter(Boolean).join(" · ")} ·{" "}
            {member.role === "school_viewer" ? "Guru BK" : "Admin Sekolah"}
          </p>
        </div>
        <Badge className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700">Aktif</Badge>
      </div>

      {overview.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total peserta" value={t?.peserta ?? 0} sub="di semua kelas" testId="stat-peserta" />
            <Stat label="Sudah selesai" value={t?.selesai ?? 0} sub="tes lengkap" testId="stat-selesai" />
            <Stat label="Sedang mengerjakan" value={t?.mulai ?? 0} sub="perlu ditunggu" testId="stat-mulai" />
            <Stat label="Belum mulai" value={t?.belum ?? 0} sub="belum buka tes" testId="stat-belum" />
          </div>

          {batches.length > 0 && (
            <div className="mt-5 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="font-bold font-bricolage text-gray-900 text-sm">Kelas</h2>
              <div className="mt-3 space-y-2">
                {batches.map((b: any) => {
                  const pct = b.total ? Math.round((b.selesai / b.total) * 100) : 0;
                  return (
                    <div
                      key={b.id}
                      data-testid="batch-row"
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-3 py-2.5"
                    >
                      <div className="min-w-[160px] flex-1">
                        <p className="font-manrope font-semibold text-gray-800 text-sm">{b.name}</p>
                        <p className="font-manrope text-gray-500 text-sm">
                          {[b.className, b.major].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="min-w-[120px] flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full rounded-full bg-mentor-teal" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 font-manrope text-[10px] text-gray-500">
                          {b.selesai}/{b.total} selesai ({pct}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(t?.selesai ?? 0) > 0 && (
            <div className="mt-5 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="font-bold font-bricolage text-gray-900 text-sm">Sebaran minat siswa</h2>
              <p className="mt-1 font-manrope text-gray-500 text-sm">
                Dari kode minat teratas setiap siswa yang sudah selesai — untuk perencanaan jurusan.
              </p>
              <div className="mt-3 space-y-2">
                {HOLLAND.map((h) => {
                  const val = Number(holland[h.code] ?? 0);
                  return (
                    <div key={h.code} className="flex items-center gap-3" data-testid={`holland-${h.code}`}>
                      <span className="w-[150px] shrink-0 font-manrope text-gray-800 text-sm">
                        {h.emoji} {h.code} · {h.name}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-brand-navy"
                          style={{ width: `${Math.round((val / maxHolland) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-manrope font-semibold text-gray-700 text-sm">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* (M4.3) Referral antar sekolah */}
          <div className="mt-5 rounded-3xl border border-teal-100 bg-teal-50/40 p-4" data-testid="referral-card">
            <h2 className="font-bold font-bricolage text-sm text-teal-900">Ajak sekolah lain</h2>
            <p className="mt-1 font-manrope text-[11px] text-teal-800">
              Bagikan kode rujukan ini — sekolah yang mendaftar lewat kode tersebut tercatat sebagai rujukan sekolah
              Anda.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code
                data-testid="referral-code"
                className="rounded-lg bg-white px-2 py-1 font-bold font-mono text-teal-800 text-xs shadow-sm"
              >
                {(referral.data as any)?.code ?? "…"}
              </code>
              <button
                type="button"
                data-testid="copy-referral"
                onClick={async () => {
                  const link = (referral.data as any)?.link;
                  if (!link) return;
                  await navigator.clipboard.writeText(link);
                  notify.success("Link rujukan tersalin");
                }}
                className="rounded-lg bg-teal-700 px-2 py-1 font-manrope font-semibold text-[10px] text-white hover:bg-teal-800"
              >
                Salin link rujukan
              </button>
              <span className="font-manrope text-[10px] text-teal-700" data-testid="referral-count">
                {(referral.data as any)?.total ?? 0} sekolah mendaftar lewat kode Anda
              </span>
            </div>
            {((referral.data as any)?.referred ?? []).length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {(referral.data as any).referred.slice(0, 6).map((r: any) => (
                  <li key={r.id} className="font-manrope text-[11px] text-teal-900">
                    • {r.name}
                    {r.city ? ` · ${r.city}` : ""} <span className="text-teal-600">({r.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(t?.peserta ?? 0) === 0 && (
            <div className="mt-5 rounded-3xl border border-gray-200 border-dashed bg-white p-6 text-center">
              <Users className="mx-auto h-6 w-6 text-gray-300" />
              <p className="mt-2 font-manrope font-semibold text-gray-700 text-sm">Belum ada peserta di sekolahmu</p>
              <p className="mt-1 font-manrope text-gray-500 text-xs">
                Tim MULAI+ akan menyiapkan kelas dan daftar peserta bersama PIC sekolah. Setelah peserta diundang,
                progresnya muncul di sini.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
