"use client";

import { Building2, GraduationCap, Mail, MapPin, Phone, School, Sparkles, Target, User, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ReflectiveAnswers {
  name: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  school: string;
  class: string;
  major: string;
  reason: string;
  reflectionIdealSelf: string;
  reflectionExpectation: string;
  reflectionFuture: string;
}

// Accept unknown from JSONB column, cast internally to known shape
interface ProgramApplicationAnswersProps {
  answers: unknown;
}

const classLabel: Record<string, string> = {
  "10": "Kelas 10",
  "11": "Kelas 11",
  "12": "Kelas 12",
};

const sectionHeaderClass = "flex items-center gap-2 font-bricolage font-semibold text-base lg:text-lg";

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50/80 p-3 transition-colors hover:bg-gray-100 md:p-3.5 lg:p-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm lg:h-9 lg:w-9">
        <Icon className="h-4 w-4 text-brand-navy lg:h-[18px] lg:w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-manrope font-medium text-text-muted-custom text-xs lg:text-sm">{label}</p>
        <p className="mt-0.5 break-words font-manrope font-medium text-sm text-text-main lg:text-base">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function ReflectionCard({ number, question, answer }: { number: number; question: string; answer: string }) {
  return (
    <div className="rounded-xl border border-brand-orange/15 bg-gradient-to-br from-brand-orange/[0.04] to-amber-50/60 p-4 transition-colors hover:from-brand-orange/[0.07] md:p-5 lg:p-6">
      <div className="mb-1 flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 font-bold text-brand-orange text-xs lg:h-7 lg:w-7 lg:text-sm">
          {number}
        </span>
        <p className="font-manrope font-medium text-sm text-text-main leading-snug lg:text-base">{question}</p>
      </div>
      <div className="mt-2.5 ml-8 lg:ml-9">
        <p className="whitespace-pre-wrap font-manrope text-sm text-text-main/85 leading-relaxed lg:text-base">
          {answer || <span className="text-text-muted-custom italic">Tidak diisi</span>}
        </p>
      </div>
    </div>
  );
}

export function ProgramApplicationAnswers({ answers }: ProgramApplicationAnswersProps) {
  if (!answers) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="mb-3 h-10 w-10 text-text-muted-custom/40" />
        <p className="font-manrope text-sm text-text-muted-custom">Tidak ada data jawaban.</p>
      </div>
    );
  }

  const a = answers as ReflectiveAnswers;

  return (
    <div className="space-y-5 md:space-y-6 lg:space-y-7">
      {/* Section 1: Data Diri */}
      <div>
        <div className="mb-3 flex items-center gap-2 lg:mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy/10 lg:h-8 lg:w-8">
            <User className="h-3.5 w-3.5 text-brand-navy lg:h-4 lg:w-4" />
          </div>
          <h3 className={sectionHeaderClass}>Data Diri</h3>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={User} label="Nama Lengkap" value={a.name} />
          <InfoRow icon={Mail} label="Email" value={a.email} />
          <InfoRow icon={Phone} label="No. WhatsApp" value={a.phone} />
          <InfoRow icon={MapPin} label="Provinsi" value={a.province} />
          <InfoRow icon={MapPin} label="Kota/Kabupaten" value={a.city} />
        </div>
      </div>

      <Separator className="bg-gray-200" />

      {/* Section 2: Informasi Sekolah */}
      <div>
        <div className="mb-3 flex items-center gap-2 lg:mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange/10 lg:h-8 lg:w-8">
            <School className="h-3.5 w-3.5 text-brand-orange lg:h-4 lg:w-4" />
          </div>
          <h3 className={sectionHeaderClass}>Informasi Sekolah</h3>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={Building2} label="Sekolah" value={a.school} />
          <InfoRow icon={GraduationCap} label="Kelas" value={classLabel[a.class] || a.class} />
          <InfoRow icon={Users} label="Jurusan" value={a.major} />
        </div>
      </div>

      <Separator className="bg-gray-200" />

      {/* Section 3: Motivasi */}
      <div>
        <div className="mb-3 flex items-center gap-2 lg:mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 lg:h-8 lg:w-8">
            <Target className="h-3.5 w-3.5 text-green-600 lg:h-4 lg:w-4" />
          </div>
          <h3 className={sectionHeaderClass}>Motivasi</h3>
        </div>
        <div className="rounded-xl border border-green-200/60 bg-green-50/50 p-4 md:p-5 lg:p-6">
          <p className="mb-2 font-manrope font-medium text-green-700 text-xs lg:text-sm">Alasan Mengikuti Program</p>
          <p className="whitespace-pre-wrap font-manrope text-sm text-text-main/85 leading-relaxed lg:text-base">
            {a.reason || <span className="text-text-muted-custom italic">Tidak diisi</span>}
          </p>
        </div>
      </div>

      <Separator className="bg-gray-200" />

      {/* Section 4: Refleksi & Komitmen */}
      <div>
        <div className="mb-3 flex items-center gap-2 lg:mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 lg:h-8 lg:w-8">
            <Sparkles className="h-3.5 w-3.5 text-purple-600 lg:h-4 lg:w-4" />
          </div>
          <h3 className={sectionHeaderClass}>Refleksi &amp; Komitmen</h3>
        </div>
        <div className="space-y-3 md:space-y-4 lg:space-y-5">
          <ReflectionCard
            number={1}
            question="Kalau dunia nggak nuntut apapun dari kamu, kamu pengen jadi orang yang kayak gimana?"
            answer={a.reflectionIdealSelf}
          />
          <ReflectionCard
            number={2}
            question="Apa yang kamu harapkan dari pendampingan seperti MULAI+?"
            answer={a.reflectionExpectation}
          />
          <ReflectionCard
            number={3}
            question="Sejauh apa/apa saja rencana masa depan yang sudah kamu obrolin bareng orang lain?"
            answer={a.reflectionFuture}
          />
        </div>
      </div>
    </div>
  );
}
