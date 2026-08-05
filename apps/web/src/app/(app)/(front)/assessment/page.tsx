import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  { emoji: "🧠", title: "Tes Minat", desc: "Model Holland RIASEC — 10 soal cepat, kenali tipe minatmu" },
  { emoji: "💡", title: "Tes Bakat", desc: "5 kemampuan dasar: numerik, verbal, logika, spasial, ketelitian" },
  { emoji: "🎯", title: "Rekomendasi", desc: "Jurusan & karier cocok, diambil dari 18.000+ prodi di Indonesia" },
  { emoji: "✨", title: "AI Summary", desc: "Ringkasan personal untuk membantumu mengambil keputusan" },
];

export default function TestMinatBakatLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef2ff] via-white to-white">
      {/* Hero */}
      <section className="mx-auto flex max-w-md flex-col items-center px-5 pt-12 pb-8 text-center md:max-w-2xl">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-4xl shadow-xl">
          🧭
        </span>
        <p className="mt-4 rounded-full bg-mentor-teal/10 px-3 py-1 font-bold font-manrope text-mentor-teal text-xs">
          Gratis · 20 Soal · ±10 Menit
        </p>
        <h1 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy leading-tight sm:text-4xl">
          Temukan Jurusan & Karier yang Cocok untukmu
        </h1>
        <p className="mt-3 font-manrope text-gray-500 text-sm leading-relaxed sm:text-base">
          Test Minat Bakat by MULAI+ — kombinasi tes minat (Holland) dan tes kemampuan yang dirancang untuk pelajar
          Indonesia.
        </p>
        <Link
          href="/login"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Mulai Gratis <ArrowRight className="h-5 w-5" />
        </Link>
        <Link href="/login" className="mt-3 font-manrope font-semibold text-gray-400 text-sm hover:text-gray-600">
          Sudah punya akun? Masuk
        </Link>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-md px-5 py-6 md:max-w-2xl">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="text-3xl">{f.emoji}</span>
              <h3 className="mt-2 font-bold font-bricolage text-gray-900">{f.title}</h3>
              <p className="mt-1 font-manrope text-gray-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-md px-5 py-6 md:max-w-2xl">
        <h2 className="font-bold font-bricolage text-gray-900 text-lg">Cara Kerjanya</h2>
        <div className="mt-3 space-y-2.5">
          {[
            "Isi profil singkat",
            "Ikuti Tes Minat (10 soal)",
            "Ikuti Tes Bakat (10 soal)",
            "Dapat rekomendasi + ringkasan AI",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold font-bricolage text-white text-xs">
                {i + 1}
              </span>
              <span className="font-manrope font-medium text-gray-700 text-sm">{step}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-md px-5 py-8 pb-14 text-center">
        <div className="rounded-3xl border-2 border-mentor-teal/20 bg-mentor-teal/5 p-5">
          <h3 className="font-bold font-bricolage text-gray-900">Kenapa Test by MULAI+?</h3>
          <div className="mt-3 space-y-2 text-left">
            {[
              "Berbasis data 18.000+ prodi & 408 universitas",
              "Rekomendasi langsung terhubung ke halaman explore",
              "Bahasa Indonesia, ramah pelajar, tanpa tekanan waktu",
            ].map((b, i) => (
              <p key={i} className="flex items-start gap-2 font-manrope text-gray-600 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mentor-teal" /> {b}
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
