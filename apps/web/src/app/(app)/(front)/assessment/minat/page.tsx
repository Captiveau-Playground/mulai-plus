import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const RIASEC = [
  {
    code: "R",
    name: "Realistic",
    emoji: "🔧",
    desc: "Suka bekerja praktis dengan mesin, alat, atau di lapangan.",
    careers: "Teknik Mesin, Pertanian, Arsitektur",
    cls: "from-blue-500 to-blue-600",
  },
  {
    code: "I",
    name: "Investigative",
    emoji: "🔬",
    desc: "Analitis, suka riset, dan memecahkan masalah.",
    careers: "Kedokteran, Matematika, Farmasi",
    cls: "from-violet-500 to-purple-600",
  },
  {
    code: "A",
    name: "Artistic",
    emoji: "🎨",
    desc: "Kreatif, ekspresif, dan bebas berimajinasi.",
    careers: "DKV, Sastra, Arsitektur",
    cls: "from-pink-500 to-rose-600",
  },
  {
    code: "S",
    name: "Social",
    emoji: "🤝",
    desc: "Senang membantu, mengajar, dan berinteraksi.",
    careers: "Psikologi, Keperawatan, Keguruan",
    cls: "from-teal-500 to-emerald-600",
  },
  {
    code: "E",
    name: "Enterprising",
    emoji: "🚀",
    desc: "Pemimpin, persuasif, dan berjiwa bisnis.",
    careers: "Manajemen, Marketing, Hukum",
    cls: "from-amber-500 to-orange-600",
  },
  {
    code: "C",
    name: "Conventional",
    emoji: "📋",
    desc: "Teratur, teliti, dan nyaman dengan data.",
    careers: "Akuntansi, Statistik, Administrasi",
    cls: "from-indigo-500 to-blue-700",
  },
];

export default function AssessmentMinatPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-violet-50 via-white to-white">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-5 pt-14 pb-10 md:pt-20">
          <Link
            href="/assessment"
            className="inline-flex items-center gap-1 font-manrope font-semibold text-gray-400 text-sm hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" /> Test Minat Bakat
          </Link>

          <div className="mt-5 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-3xl shadow-xl">
              🧠
            </div>
            <p className="mt-4 rounded-full bg-violet-100 px-3 py-1 font-bold font-manrope text-violet-700 text-xs">
              10 Soal · ±7 Menit
            </p>
            <h1 className="mt-3 font-bold font-bricolage text-4xl text-brand-navy md:text-5xl">
              Tes Minat — Model Holland RIASEC
            </h1>
            <p className="mt-3 max-w-xl font-manrope text-gray-500">
              Di mana kamu paling nyaman bekerja? Tes minat memetakan kecenderunganmu ke 6 tipe kepribadian karier (John
              Holland) — dari situ kami temukan jurusan yang paling selaras denganmu.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-navy px-8 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98]"
            >
              Mulai Tes Minat <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6 dimensi */}
      <section className="mx-auto max-w-7xl bg-white px-5 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">6 Tipe Minat</h2>
          <p className="mt-3 font-manrope text-gray-500">
            Setiap orang punya kombinasi unik — hasilnya berupa <b>kode 3 huruf</b> (misal IAC) yang merepresentasikan
            dominasi minatmu.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RIASEC.map((r, _i) => (
            <div
              key={r.code}
              className="group rounded-[1.5rem] border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow-md ${r.cls}`}
                >
                  {r.emoji}
                </div>
                <span className="font-bold font-bricolage text-3xl text-gray-100">{r.code}</span>
              </div>
              <h3 className="mt-3 font-bold font-bricolage text-gray-900 text-lg">{r.name}</h3>
              <p className="mt-1 font-manrope text-gray-500 text-sm">{r.desc}</p>
              <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 font-manrope text-gray-600 text-xs">
                <span className="font-semibold text-gray-700">Contoh jurusan:</span> {r.careers}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cara kerja / contoh soal */}
      <section className="bg-gradient-to-b from-white to-[#f7f8fb] py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-2">
          <div>
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy md:text-3xl">Seperti Apa Soalnya?</h2>
            <p className="mt-3 font-manrope text-gray-500">
              Kamu memilih satu dari dua aktivitas yang lebih kamu sukai — cepat, intuitif, tanpa jawaban benar atau
              salah.
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Pilih aktivitas yang paling menarik bagimu",
                "Tidak ada jawaban benar/salah — jawab sesuai dirimu",
                "Tanpa timer, bisa diubah sebelum lanjut",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2.5 rounded-2xl bg-white p-4 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                  <span className="font-manrope text-gray-600 text-sm">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-gray-100 bg-white p-6 shadow-sm">
            <p className="font-manrope font-semibold text-violet-500 text-xs uppercase tracking-wide">Contoh Soal</p>
            <p className="mt-2 font-bold font-bricolage text-gray-900 text-lg">Kamu lebih suka…</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 transition-colors hover:border-violet-400">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl">🔬</span>
                <span className="font-manrope font-medium text-gray-700 text-sm">
                  Meneliti dan menganalisis data eksperimen
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 transition-colors hover:border-violet-400">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl">🎨</span>
                <span className="font-manrope font-medium text-gray-700 text-sm">
                  Membuat karya seni, desain, atau tulisan kreatif
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-violet-50 p-4">
              <p className="font-manrope text-violet-700 text-xs">
                <b>Dipilih A (Investigative)</b> → skor I naik. Setelah 10 soal, tiga skor tertinggi membentuk kode
                minatmu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl bg-white px-5 py-14 text-center">
        <h2 className="font-bold font-bricolage text-2xl text-brand-navy md:text-3xl">Siap Menemukan Tipe Minatmu?</h2>
        <p className="mt-2 font-manrope text-gray-500">Gratis, ±7 menit, hasil langsung.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-orange px-8 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Mulai Tes Minat <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}
