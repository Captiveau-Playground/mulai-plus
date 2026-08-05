import { ArrowRight, Building2, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";

const WA_LINK =
  "https://wa.me/6285730367310?text=Halo%20MULAI%2B%2C%20saya%20ingin%20jadwalkan%20demo%20Test%20Minat%20Bakat%20untuk%20sekolah%20kami";

const RIASEC = [
  {
    code: "R",
    name: "Realistic",
    emoji: "🔧",
    desc: "Suka kerja praktis, mesin, dan outdoor",
    cls: "from-blue-500 to-blue-600",
  },
  {
    code: "I",
    name: "Investigative",
    emoji: "🔬",
    desc: "Analitis, riset, dan memecahkan masalah",
    cls: "from-violet-500 to-purple-600",
  },
  {
    code: "A",
    name: "Artistic",
    emoji: "🎨",
    desc: "Kreatif, desain, dan ekspresi bebas",
    cls: "from-pink-500 to-rose-600",
  },
  {
    code: "S",
    name: "Social",
    emoji: "🤝",
    desc: "Membantu, mengajar, dan berinteraksi",
    cls: "from-teal-500 to-emerald-600",
  },
  {
    code: "E",
    name: "Enterprising",
    emoji: "🚀",
    desc: "Memimpin, bisnis, dan persuasi",
    cls: "from-amber-500 to-orange-600",
  },
  {
    code: "C",
    name: "Conventional",
    emoji: "📋",
    desc: "Rapi, data, dan administrasi",
    cls: "from-indigo-500 to-blue-700",
  },
];

const ABILITIES = [
  { icon: "🔢", name: "Numerik", desc: "Kemampuan operasi angka & pola" },
  { icon: "💬", name: "Verbal", desc: "Kosakata, sinonim, pemahaman bahasa" },
  { icon: "🧩", name: "Logika", desc: "Penalaran & urutan logis" },
  { icon: "🧊", name: "Spasial", desc: "Visualisasi bentuk & ruang" },
  { icon: "🔍", name: "Ketelitian", desc: "Kecepatan & akurasi detail" },
];

export default function AssessmentLandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-b from-[#eef2ff] via-white to-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-mentor-teal/10 blur-3xl" />
          <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-brand-orange/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-5 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            {/* Copy */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-mentor-teal/20 bg-mentor-teal/5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-mentor-teal" />
                <span className="font-manrope font-semibold text-teal-700 text-xs">Gratis · 20 Soal · ±10 Menit</span>
              </div>

              <h1 className="mt-4 font-bold font-bricolage text-4xl text-brand-navy leading-[1.1] md:text-5xl lg:text-6xl">
                Kenali Diri,{" "}
                <span className="bg-gradient-to-r from-mentor-teal to-teal-500 bg-clip-text text-transparent">
                  Temukan Jurusan
                </span>{" "}
                &amp; Kariermu
              </h1>
              <p className="mt-4 font-manrope text-base text-gray-500 leading-relaxed md:text-lg">
                Test Minat Bakat by MULAI+ menggabungkan <b className="text-gray-700">Tes Minat (Holland RIASEC)</b> dan{" "}
                <b className="text-gray-700">Tes Bakat</b> — lalu mencocokkannya dengan 18.000+ program studi di
                Indonesia.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-7 py-4 font-bold font-bricolage text-base text-white shadow-brand-orange/25 shadow-lg transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.98]"
                >
                  Mulai Gratis
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#untuk-sekolah"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-navy/15 bg-white px-7 py-4 font-bold font-bricolage text-base text-brand-navy transition-all hover:border-mentor-teal/40 hover:bg-mentor-teal/5 active:scale-[0.98]"
                >
                  <Building2 className="h-5 w-5" /> Untuk Sekolah
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start">
                {["Tanpa biaya", "Hasil instan", "Rekomendasi data 18k+ prodi"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 font-manrope font-medium text-gray-500 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-mentor-teal" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="relative mx-auto w-full max-w-md md:max-w-none">
              <div className="rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light p-1 shadow-2xl">
                <div className="rounded-[1.8rem] bg-white/95 p-6">
                  {/* RIASEC hexagon-ish grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {RIASEC.map((r) => (
                      <div
                        key={r.code}
                        className="flex flex-col items-center rounded-2xl bg-gray-50 p-4 text-center transition-transform hover:-translate-y-0.5"
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow-md ${r.cls}`}
                        >
                          {r.emoji}
                        </div>
                        <p className="mt-2 font-bold font-bricolage text-brand-navy text-lg">{r.code}</p>
                        <p className="font-manrope text-[10px] text-gray-500">{r.name}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-mentor-teal/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-manrope font-semibold text-gray-600 text-xs">Hasil contoh</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold font-manrope text-[10px] text-amber-700">
                        Kode: IAC
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        { label: "Kedokteran", pct: 92 },
                        { label: "Teknik Informatika", pct: 85 },
                        { label: "Psikologi", pct: 78 },
                      ].map((m) => (
                        <div key={m.label}>
                          <div className="flex justify-between font-manrope text-[11px]">
                            <span className="font-semibold text-gray-700">{m.label}</span>
                            <span className="font-bold text-mentor-teal">{m.pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-mentor-teal to-teal-400"
                              style={{ width: `${m.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DUA TEST ── */}
      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-bold font-manrope text-mentor-teal text-xs uppercase tracking-widest">
            Dua Assessment, Satu Arah
          </p>
          <h2 className="mt-2 font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
            Minat + Bakat = Rekomendasi yang Akurat
          </h2>
          <p className="mt-3 font-manrope text-gray-500">
            Ikuti keduanya berurutan — rekomendasi hanya muncul setelah keduanya selesai.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* Tes Minat */}
          <Link
            href="/assessment/minat"
            className="group relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-2xl shadow-lg">
                🧠
              </div>
              <h3 className="mt-4 font-bold font-bricolage text-2xl text-gray-900">Tes Minat — Holland RIASEC</h3>
              <p className="mt-2 font-manrope text-gray-500 text-sm leading-relaxed">
                10 soal pilihan aktivitas untuk menemukan tipe minatmu di antara 6 dimensi kepribadian karier.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["R", "I", "A", "S", "E", "C"].map((c) => (
                  <span
                    key={c}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 font-bold font-bricolage text-sm text-violet-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 font-bold font-bricolage text-mentor-teal text-sm">
                Pelajari Tes Minat <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          {/* Tes Bakat */}
          <Link
            href="/assessment/bakat"
            className="group relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mentor-teal to-teal-700 text-2xl shadow-lg">
                💡
              </div>
              <h3 className="mt-4 font-bold font-bricolage text-2xl text-gray-900">Tes Bakat — 5 Kemampuan Dasar</h3>
              <p className="mt-2 font-manrope text-gray-500 text-sm leading-relaxed">
                10 soal kemampuan untuk mengukur kekuatanmu: numerik, verbal, logika, spasial, dan ketelitian.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {ABILITIES.map((a) => (
                  <span
                    key={a.name}
                    className="flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 font-manrope font-semibold text-[11px] text-teal-700"
                  >
                    {a.icon} {a.name}
                  </span>
                ))}
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 font-bold font-bricolage text-mentor-teal text-sm">
                Pelajari Tes Bakat <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── CARA KERJA ── */}
      <section className="bg-gradient-to-b from-white to-[#f7f8fb] py-14">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">Cara Kerjanya</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", icon: "👤", t: "Buat akun gratis", d: "Login atau daftar sekali — langsung bisa mulai." },
              {
                n: "02",
                icon: "🧠",
                t: "Ikuti 2 test",
                d: "Tes Minat (10 soal) + Tes Bakat (10 soal), tanpa tekanan waktu.",
              },
              {
                n: "03",
                icon: "🎯",
                t: "Dapat rekomendasi",
                d: "Top 5 jurusan + karier, diambil dari 18.000+ prodi Indonesia.",
              },
            ].map((s, _i) => (
              <div key={s.n} className="relative rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                <span className="font-bold font-bricolage text-4xl text-gray-100">{s.n}</span>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-navy/5 text-xl">
                    {s.icon}
                  </span>
                  <h3 className="font-bold font-bricolage text-gray-900 text-lg">{s.t}</h3>
                </div>
                <p className="mt-2 font-manrope text-gray-500 text-sm">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REKOMENDASI ── */}
      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid items-center gap-10 rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 text-white md:grid-cols-2 md:p-12">
          <div>
            <p className="font-bold font-manrope text-amber-300 text-xs uppercase tracking-widest">
              Rekomendasi Berbasis Data
            </p>
            <h2 className="mt-2 font-bold font-bricolage text-2xl md:text-3xl">
              Bukan Tebakan — Dicocokkan dengan 18.000+ Program Studi
            </h2>
            <p className="mt-3 font-manrope text-sm text-white/70 leading-relaxed">
              Setiap rekomendasi jurusan terhubung langsung ke data prodi & universitas MULAI+, lengkap dengan link
              untuk menelusuri lebih lanjut.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-bold font-bricolage text-brand-navy text-sm shadow-lg transition-all hover:bg-amber-50 active:scale-[0.98]"
            >
              Coba Sekarang <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { icon: "🎯", t: "Top 5 Jurusan", d: "dengan persentase kecocokan" },
              { icon: "💼", t: "Top 5 Karier", d: "sesuai profil minat-bakat" },
              { icon: "✨", t: "AI Summary", d: "ringkasan personal berbahasa Indonesia" },
              { icon: "📄", t: "Laporan PDF", d: "siap diunduh & dibagikan" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-bold font-bricolage">{f.t}</p>
                  <p className="font-manrope text-white/60 text-xs">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTRASI ── */}
      <section id="untuk-sekolah" className="bg-gradient-to-b from-white to-[#f7f8fb] py-14">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-bold font-manrope text-mentor-teal text-xs uppercase tracking-widest">Registrasi</p>
            <h2 className="mt-2 font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
              Gratis untuk Kamu, Demo untuk Sekolah
            </h2>
            <p className="mt-3 font-manrope text-gray-500">Dua jalur, satu tujuan: siswa yang lebih paham arahnya.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {/* B2C */}
            <div className="flex flex-col rounded-[2rem] border-2 border-mentor-teal/30 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-mentor-teal/10 px-3 py-1 font-bold font-manrope text-[11px] text-teal-700">
                  UNTUK DIRI SENDIRI
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 font-bold font-manrope text-[11px] text-green-700">
                  GRATIS
                </span>
              </div>
              <h3 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">Siswa & Umum</h3>
              <p className="mt-2 font-manrope text-gray-500 text-sm">Ikuti test mandiri, dapat rekomendasi langsung.</p>
              <ul className="mt-4 space-y-2">
                {[
                  "Tanpa biaya, tanpa kartu",
                  "Hasil instan + AI summary",
                  "Laporan PDF",
                  "Bisa diulang kapan saja",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 font-manrope text-gray-600 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-mentor-teal" /> {t}
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <Link
                href="/login"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-md transition-all hover:bg-brand-navy-light active:scale-[0.98]"
              >
                Daftar & Mulai Gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* B2B */}
            <div className="relative flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light p-7 text-white shadow-xl">
              <div
                className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand-orange/20 blur-3xl"
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 font-bold font-manrope text-[11px] text-amber-300">
                    UNTUK SEKOLAH / INSTITUSI
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-bold font-manrope text-[11px] text-white/80">
                    DEMO DULU
                  </span>
                </div>
                <h3 className="mt-4 font-bold font-bricolage text-xl">Sekolah & Lembaga</h3>
                <p className="mt-2 font-manrope text-sm text-white/70">
                  Kelola batch test khusus sekolahmu, pantau hasil seluruh siswa, dan dapatkan rekap analitik.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "Batch test per kelas/jurusan",
                    "Undangan via link, QR, atau email",
                    "Dashboard progres siswa",
                    "Rekap & analitik distribusi minat",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2 font-manrope text-sm text-white/80">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-300" /> {t}
                    </li>
                  ))}
                </ul>
                <div className="flex-1" />
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <MessageCircle className="h-5 w-5" /> Jadwalkan Demo via WhatsApp
                </a>
                <p className="mt-3 text-center font-manrope text-[11px] text-white/50">
                  Tim kami akan menghubungimu untuk penjadwalan demo & kerjasama.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-orange to-amber-500 p-8 text-center shadow-xl md:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
            <div className="absolute -top-10 left-1/4 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
          </div>
          <div className="relative">
            <span className="text-4xl">🧭</span>
            <h2 className="mt-3 font-bold font-bricolage text-2xl text-white md:text-3xl">
              Jangan Tunda Kenali Arahmu
            </h2>
            <p className="mx-auto mt-2 max-w-md font-manrope text-sm text-white/80">
              20 soal · ±10 menit · gratis. Hasil yang bisa mengubah keputusan kuliahmu.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-navy px-8 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98]"
            >
              Mulai Test Sekarang <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
