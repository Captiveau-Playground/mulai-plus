import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { AiMockChat } from "@/components/front/ai-mock-chat";
import { MulAiCta } from "@/components/front/mulai-ai-cta";

const HOW = [
  {
    step: "01",
    title: "Lengkapi profil",
    desc: "Sekolah & jenjang (otomatis dari pilihan sekolah) + minimal satu sosmed — dipakai untuk personalisasi.",
  },
  {
    step: "02",
    title: "Pilih Skill",
    desc: "Universitas, Prodi & Jurusan, Passing Grade, atau Mentoring — AI fokus di kebutuhanmu.",
  },
  {
    step: "03",
    title: "Tanya & pantau",
    desc: "Lihat langkah tool saat AI mengecek data, pilih model Mulai Cerdas / Pintar / Bijak, kasih feedback 👍👎.",
  },
];

const FAQS = [
  {
    q: "Data apa yang dipakai Mul.ai?",
    a: "Profilmu (sekolah & jenjang), hasil Tes Minat & Bakat (RIASEC), dan riwayat chat — hanya untuk mempersonalisasi jawaban.",
  },
  {
    q: "Apakah kuota harian?",
    a: "40 pertanyaan/hari per akun, di-reset otomatis setiap 24 jam. Free untuk siswa terdaftar.",
  },
  { q: "Siapa yang bisa akses?", a: "Pelajar/siswa setelah melengkapi profil wajib (sekolah & jenjang)." },
  {
    q: "Apakah jawaban bisa dipercaya?",
    a: "Data universal/prodi/passing grade diambil dari database MULAI+ (SQL tools); jawaban ditandai informasional.",
  },
];

export const metadata = {
  title: "Mul.ai — Asisten AI Kuliah Indonesia | MULAI+",
  description:
    "Tanya jurusan, passing grade, universitas, atau beasiswa — jawaban dipersonalisasi dengan profil & hasil tesmu, lengkap dengan langkah data dan kuota harian transparan.",
};

export default function AiAssistantPage() {
  return (
    <main className="bg-white">
      {/* Hero (light — navbar tetap kontras) */}
      <section className="relative overflow-hidden bg-white py-16 lg:py-24">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-[350px] w-[350px] rounded-full opacity-[0.08]"
          style={{ background: "var(--brand-orange)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-28 h-[300px] w-[300px] rounded-full opacity-[0.05]"
          style={{ background: "var(--brand-navy)" }}
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/5 px-3.5 py-1.5 font-manrope font-medium text-[11px] text-brand-orange tracking-wide">
              <Sparkles className="size-3.5" /> Mul.ai — Asisten AI
            </span>
            <h1 className="mt-4 font-bold font-bricolage text-4xl text-brand-navy leading-tight sm:text-5xl">
              Jawaban kuliahmu, <span className="text-brand-orange">dari AI yang mengerti</span> kamu
            </h1>
            <p className="mt-4 max-w-xl font-manrope text-sm text-text-muted leading-relaxed sm:text-base">
              Mul.ai membantu calon mahasiswa Indonesia mencari universitas, membandingkan passing grade, dan memilih
              jurusan sesuai minat & hasil tes — dengan data 408+ PTN/PTS &amp; 18.881 prodi.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MulAiCta
                to="/dashboard/student/assistant"
                content="ai-page-hero-cta"
                placement="ai-page-hero"
                variant="primary"
              >
                <Sparkles className="size-4" /> Mulai Chat
              </MulAiCta>
              <MulAiCta to="/assessment" content="ai-page-hero-assessment" placement="ai-page-hero" variant="outline">
                Kenali Minatmu Dulu
              </MulAiCta>
            </div>
            <ul className="mt-6 space-y-1.5 font-manrope text-text-muted text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-brand-orange" /> Personalisasi dengan profil & tes minat bakat
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-brand-orange" /> Langkah tool transparan (universitas / prodi /
                passing grade)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-brand-orange" /> Kuota harian jelas · feedback 👍👎 tiap jawaban
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-center gap-2 border-gray-100 border-b pb-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-navy/10 font-manrope text-brand-navy text-xs">
                M
              </span>
              <span className="font-bold font-bricolage text-brand-navy text-sm">Mul.ai</span>
              <span className="ml-auto rounded-full bg-brand-orange/10 px-2 py-0.5 font-manrope text-[10px] text-brand-orange">
                Skill: Passing Grade
              </span>
            </div>
            <div className="min-h-[16rem] py-3">
              <AiMockChat />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-bold font-bricolage text-3xl text-brand-navy sm:text-4xl">Gimana cara kerjanya?</h2>
            <p className="mx-auto mt-3 max-w-xl font-manrope text-muted-foreground text-sm">
              Tiga langkah sederhana untuk jawaban yang dipersonalisasi.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {HOW.map((h) => (
              <div key={h.step} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="font-bold font-bricolage text-4xl text-brand-orange/20">{h.step}</span>
                <h3 className="mt-2 font-bold font-bricolage text-base text-brand-navy">{h.title}</h3>
                <p className="mt-1.5 font-manrope text-muted-foreground text-xs leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <MulAiCta
              to="/dashboard/student/assistant"
              content="ai-page-bottom-cta"
              placement="ai-page-bottom"
              variant="primary"
            >
              <Sparkles className="size-4" /> Mulai Chat — Gratis
            </MulAiCta>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-brand-navy/5 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <h2 className="text-center font-bold font-bricolage text-3xl text-brand-navy">Frequently Asked</h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-card px-5 py-4">
                <summary className="flex cursor-pointer items-center justify-between font-manrope font-semibold text-brand-navy text-sm">
                  {f.q}
                  <span className="text-brand-orange transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 font-manrope text-muted-foreground text-xs leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-brand-navy/10 bg-white px-6 py-4 font-manrope text-muted-foreground text-xs">
            <ShieldCheck className="size-4 text-emerald-600" /> Privasi kamu terjaga — lihat kebijakan lengkap di{" "}
            <Link href="/privacy#assessment" className="font-semibold text-brand-navy underline underline-offset-2">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
