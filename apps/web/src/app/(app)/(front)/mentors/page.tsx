import type { Metadata } from "next";
import { AssessmentBreadcrumb } from "@/components/front/assessment-breadcrumb";
import { MentorsGrid } from "@/components/front/mentors-grid";

export const metadata: Metadata = {
  title: "Mentor MULAI+ — Kenalan dengan Pembimbingmu",
  description:
    "Semua mentor MULAI+: kampus, jurusan, bidang pekerjaan, pencapaian karier, dan pengalaman membimbing siswa menuju jurusan impian.",
  alternates: { canonical: "/mentors" },
};

export default function MentorsPage() {
  return (
    <div className="overflow-hidden bg-white">
      <AssessmentBreadcrumb trail={[]} current="Mentor" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-teal-500/[0.07]" />
          <div className="absolute bottom-[-30%] left-[-5%] h-80 w-80 rounded-full bg-brand-navy/[0.04]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 md:pt-16 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            <span className="font-manrope font-medium text-teal-700 text-xs">Tim Mentor MULAI+</span>
          </div>
          <h1 className="mt-5 max-w-3xl font-bold font-bricolage text-4xl text-brand-navy leading-[1.05] tracking-tight md:text-5xl">
            Belajar dari yang Sudah{" "}
            <span className="relative">
              <span className="relative z-10">Melewati Jalannya</span>
              <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-teal-500/20" aria-hidden />
            </span>
          </h1>
          <p className="mt-4 max-w-2xl font-manrope text-gray-500 leading-relaxed md:text-lg">
            Mahasiswa & alumni dari kampus negeri dan swasta terpilih. Lihat jurusan, pengalaman kerja, dan pencapaian
            mereka — lalu pilih program yang paling cocok denganmu.
          </p>
        </div>
      </section>

      <MentorsGrid />
    </div>
  );
}
