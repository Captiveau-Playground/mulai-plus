import type { Metadata } from "next";
import { MentorsGrid } from "@/components/front/mentors-grid";

export const metadata: Metadata = {
  title: "Mentor MULAI+ — Kenalan dengan Pembimbingmu",
  description:
    "Semua mentor MULAI+: kampus, jurusan, bidang pekerjaan, pencapaian karier, dan pengalaman membimbing siswa menuju jurusan impian.",
  alternates: { canonical: "/mentors" },
};

export default function MentorsPage() {
  return (
    <div className="bg-white">
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-6 sm:px-6 md:pt-16 lg:px-8">
        <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">Tim Mentor</p>
        <h1 className="mt-2 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
          Belajar dari yang Sudah Melewati Jalannya
        </h1>
        <p className="mt-3 max-w-2xl font-manrope text-gray-500">
          Mentor MULAI+ adalah mahasiswa & alumni dari kampus negeri dan swasta terpilih. Lihat jurusan, pengalaman
          kerja, dan pencapaian mereka sebelum kamu memilih program.
        </p>
      </section>
      <MentorsGrid />
    </div>
  );
}
