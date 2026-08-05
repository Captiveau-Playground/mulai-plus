import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

const RIASEC = [
  { code: "R", emoji: "🔧", cls: "from-blue-500 to-blue-600" },
  { code: "I", emoji: "🔬", cls: "from-violet-500 to-purple-600" },
  { code: "A", emoji: "🎨", cls: "from-pink-500 to-rose-600" },
  { code: "S", emoji: "🤝", cls: "from-teal-500 to-emerald-600" },
  { code: "E", emoji: "🚀", cls: "from-amber-500 to-orange-600" },
  { code: "C", emoji: "📋", cls: "from-indigo-500 to-blue-700" },
];

export function AssessmentSection() {
  return (
    <section aria-label="Test Minat Bakat" className="relative w-full overflow-hidden bg-violet-50 py-14 lg:py-28">
      <div
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-teal-500/5 blur-3xl"
        aria-hidden
      />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
              <span className="font-manrope font-semibold text-brand-orange text-xs">Fitur Baru · Gratis</span>
            </div>

            <h2 className="mt-4 font-bold font-bricolage text-3xl text-brand-navy leading-tight md:text-4xl lg:text-5xl">
              Tidak Yakin Mau Kuliah Apa?
              <span className="mt-2 block bg-gradient-to-r from-mentor-teal to-teal-500 bg-clip-text text-transparent">
                Kenali Minat &amp; Bakatmu
              </span>
            </h2>

            <p className="mt-4 max-w-lg font-manrope text-base text-gray-500 leading-relaxed lg:text-lg">
              Ikuti <b className="text-gray-700">Tes Minat (Holland RIASEC)</b> +{" "}
              <b className="text-gray-700">Tes Bakat</b> — 20 soal, ±10 menit. Hasilnya rekomendasi jurusan & karier
              yang dicocokkan dengan 18.000+ program studi di Indonesia.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-7 py-4 font-bold font-bricolage text-base text-white shadow-brand-orange/25 shadow-lg transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.98]"
              >
                Mulai Gratis Sekarang
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/assessment"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-navy/15 bg-white px-7 py-4 font-bold font-bricolage text-base text-brand-navy transition-all hover:border-mentor-teal/40 hover:bg-mentor-teal/5 active:scale-[0.98]"
              >
                Pelajari Lebih Lanjut
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {["Tanpa biaya", "Hasil instan + AI summary", "Laporan PDF"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-manrope font-medium text-gray-500 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-mentor-teal" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Visual — kartu test + hasil */}
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl">
              {/* dua test */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/assessment/minat"
                  className="group rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white transition-transform hover:-translate-y-0.5"
                >
                  <span className="text-2xl">🧠</span>
                  <p className="mt-2 font-bold font-bricolage text-sm">Tes Minat</p>
                  <p className="font-manrope text-[10px] text-white/70">Holland RIASEC · 10 soal</p>
                </Link>
                <Link
                  href="/assessment/bakat"
                  className="group rounded-2xl bg-gradient-to-br from-mentor-teal to-teal-700 p-4 text-white transition-transform hover:-translate-y-0.5"
                >
                  <span className="text-2xl">💡</span>
                  <p className="mt-2 font-bold font-bricolage text-sm">Tes Bakat</p>
                  <p className="font-manrope text-[10px] text-white/70">5 kemampuan · 10 soal</p>
                </Link>
              </div>

              {/* hasil mini */}
              <div className="mt-4 rounded-2xl bg-brand-navy p-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="font-manrope text-[10px] text-white/60 uppercase tracking-wide">Hasil</span>
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 font-bold font-manrope text-[10px] text-amber-300">
                    Kode: IAC
                  </span>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {RIASEC.map((r) => (
                    <div
                      key={r.code}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${r.cls}`}
                      title={r.code}
                    >
                      {r.emoji}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { label: "Kedokteran", pct: 92 },
                    { label: "Teknik Informatika", pct: 85 },
                    { label: "Psikologi", pct: 78 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between font-manrope text-[11px]">
                        <span className="font-semibold">{m.label}</span>
                        <span className="font-bold text-amber-300">{m.pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-orange to-amber-400"
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* sekolah */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏫</span>
                  <div>
                    <p className="font-bold font-manrope text-gray-800 text-xs">Untuk Sekolah?</p>
                    <p className="font-manrope text-[10px] text-gray-400">Batch test & rekap siswa</p>
                  </div>
                </div>
                <Link
                  href="/assessment#untuk-sekolah"
                  className="flex items-center gap-1 font-bold font-manrope text-mentor-teal text-xs hover:underline"
                >
                  Cari tahu <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
