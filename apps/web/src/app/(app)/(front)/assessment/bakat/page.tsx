import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AssessmentBreadcrumb } from "@/components/front/assessment-breadcrumb";
import { AssessmentFaq, AssessmentPricingSection } from "@/components/front/assessment-shared";

const ABILITIES = [
  {
    icon: "🔢",
    name: "Numerik",
    desc: "Kemampuan mengolah angka, pola, dan hitungan.",
    sample: "Lanjutkan deret: 2, 4, 8, 16, …",
  },
  {
    icon: "💬",
    name: "Verbal",
    desc: "Kekuatan kosakata, sinonim, dan pemahaman bahasa.",
    sample: "Sinonim kata “cermat” adalah…",
  },
  {
    icon: "🧩",
    name: "Logika",
    desc: "Penalaran deduktif dan kemampuan menarik kesimpulan.",
    sample: "Semua mahasiswa rajin. Budi mahasiswa, maka…",
  },
  {
    icon: "🧊",
    name: "Spasial",
    desc: "Visualisasi bentuk, rotasi, dan ruang.",
    sample: "Huruf “b” dicerminkan menjadi…",
  },
  {
    icon: "🔍",
    name: "Ketelitian",
    desc: "Kecepatan dan akurasi mengenali detail.",
    sample: "Manakah yang tidak identik dengan AB12CD?",
  },
];

export default function AssessmentBakatPage() {
  return (
    <div className="overflow-hidden">
      <AssessmentBreadcrumb trail={[{ label: "Test Minat Bakat", href: "/assessment" }]} current="Tes Bakat" />
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-teal-50 via-white to-white">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-5 pt-8 pb-10 md:pt-10">
          <div className="mt-5 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-mentor-teal to-teal-700 text-3xl shadow-xl">
              💡
            </div>
            <p className="mt-4 rounded-full bg-teal-100 px-3 py-1 font-bold font-manrope text-teal-700 text-xs">
              10 Soal · ±5 Menit
            </p>
            <h1 className="mt-3 font-bold font-bricolage text-4xl text-brand-navy md:text-5xl">
              Tes Bakat — 5 Kemampuan Dasar
            </h1>
            <p className="mt-3 max-w-xl font-manrope text-gray-500">
              Minat itu arah, bakat itu kekuatan. Tes Bakat mengukur kemampuan dasar yang menentukan seberapa nyaman
              kamu menyerap materi tertentu — bahan penting untuk memilih jurusan.
            </p>
            <Link
              href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-navy px-8 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98]"
            >
              Mulai Tes Bakat <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5 kemampuan */}
      <section className="mx-auto max-w-7xl bg-white px-5 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">5 Kemampuan yang Diukur</h2>
          <p className="mt-3 font-manrope text-gray-500">
            Setiap dimensi dinilai menjadi level: <b>Tinggi</b>, <b>Sedang</b>, atau <b>Perlu Pengembangan</b> — lalu
            digabung dengan profil minatmu untuk rekomendasi yang akurat.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {ABILITIES.map((a, i) => (
            <div
              key={a.name}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-teal-300/50 hover:shadow-md md:flex-row md:items-center"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-xl">
                {a.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold font-bricolage text-gray-900 text-lg">
                  <span className="mr-2 font-bold font-manrope text-sm text-teal-500">0{i + 1}</span>
                  {a.name}
                </h3>
                <p className="mt-0.5 font-manrope text-gray-500 text-sm">{a.desc}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-2.5 md:max-w-xs">
                <p className="font-bold font-manrope text-[10px] text-gray-400 uppercase tracking-wide">Contoh soal</p>
                <p className="mt-0.5 font-manrope text-gray-600 text-sm">{a.sample}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skoring */}
      <section className="bg-gradient-to-b from-white to-[#f7f8fb] py-12">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="text-center font-bold font-bricolage text-2xl text-brand-navy md:text-3xl">
            Bagaimana Hasilnya Dibaca?
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { icon: "📊", t: "Profil Kemampuan", d: "Skor per dimensi divisualisasikan, dikategorikan ke 3 level." },
              { icon: "💪", t: "Kekuatan", d: "2 dimensi tertinggi jadi kekuatan utama rekomendasi jurusan." },
              { icon: "📈", t: "Area Pengembangan", d: "Dimensi terendah ditandai sebagai area yang bisa diasah." },
            ].map((s) => (
              <div key={s.t} className="rounded-[1.5rem] border border-gray-100 bg-white p-6 text-center shadow-sm">
                <span className="text-3xl">{s.icon}</span>
                <h3 className="mt-3 font-bold font-bricolage text-gray-900 text-lg">{s.t}</h3>
                <p className="mt-1 font-manrope text-gray-500 text-sm">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <p className="font-manrope text-sm text-teal-900 leading-relaxed">
              <b>Kombinasi minat + bakat:</b> jurusan direkomendasikan berdasarkan kecocokan minat (Holland) <i>dan</i>{" "}
              kemampuan yang dibutuhkannya — jadi rekomendasi bukan cuma “kamu suka”, tapi juga “kamu bisa”.
            </p>
          </div>
        </div>
      </section>

      {/* Registrasi */}
      <AssessmentPricingSection />

      {/* FAQ */}
      <AssessmentFaq
        items={[
          {
            q: "Apa yang diukur Tes Bakat?",
            a: "Lima kemampuan dasar: numerik (angka & pola), verbal (kosakata & bahasa), logika (penalaran), spasial (visualisasi ruang), dan ketelitian (kecepatan & akurasi detail).",
          },
          {
            q: "Berapa lama tesnya?",
            a: "Sekitar 5 menit untuk 10 soal pilihan ganda. Ada jawaban benar, tapi tidak ada timer yang menekan.",
          },
          {
            q: "Apa bedanya dengan Tes Minat?",
            a: "Minat = apa yang kamu suka (arah). Bakat = seberapa kuat kemampuan dasarmu. Keduanya digabung agar rekomendasi jurusan tidak hanya 'kamu suka', tapi juga 'kamu bisa'.",
          },
          {
            q: "Bagaimana hasilnya dibaca?",
            a: "Setiap dimensi dinilai menjadi Tinggi, Sedang, atau Perlu Pengembangan. Dua tertinggi jadi kekuatan utamamu, terendah jadi area yang bisa diasah.",
          },
          { q: "Apakah tesnya gratis?", a: "Ya, sepenuhnya gratis untuk individu setelah login." },
        ]}
      />

      {/* CTA */}
      <section className="mx-auto max-w-7xl bg-white px-5 py-14 text-center">
        <h2 className="font-bold font-bricolage text-2xl text-brand-navy md:text-3xl">Ukur Kekuatanmu Sekarang</h2>
        <p className="mt-2 font-manrope text-gray-500">Gratis, ±5 menit, hasil langsung.</p>
        <Link
          href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-orange px-8 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Mulai Tes Bakat <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}
