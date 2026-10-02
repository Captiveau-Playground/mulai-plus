"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Brain, CheckCircle2, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";
import { orpc } from "@/utils/orpc";

/** Report gabungan TALENT + DISCOVER dari hasil engine (assessment_results). */
export default function EngineReportPage() {
  const { data: authSession } = authClient.useSession();
  const sid = authSession?.user?.id ?? "";
  const raw = client as any;

  const qM = useQuery({
    queryKey: ["engine-report", "DISCOVER", sid],
    enabled: !!sid,
    queryFn: () => raw.discover.resultsFor({ code: "DISCOVER", studentId: sid }),
  });
  const qT = useQuery({
    queryKey: ["engine-report", "TALENT", sid],
    enabled: !!sid,
    queryFn: () => raw.discover.resultsFor({ code: "TALENT", studentId: sid }),
  });

  const minat = qM.data as any;
  const bakat = qT.data as any;
  const ready = !!minat && minat.present && !!bakat && bakat.present;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-brand-navy" />
        <h1 className="font-bold font-bricolage text-xl text-foreground">Laporan Minat & Bakat (Engine)</h1>
      </div>

      {!sid && <p className="font-manrope text-sm text-muted-foreground">Memuat profil…</p>}

      {sid && (
        <div className="grid gap-4 md:grid-cols-2">
          <ResultCard
            title="Tes Minat (DISCOVER)"
            data={minat}
            href="/dashboard/student/assessment/take/DISCOVER"
            accent="from-violet-500 to-purple-600"
          />
          <ResultCard
            title="Tes Bakat (TALENT)"
            data={bakat}
            href="/dashboard/student/assessment/take/TALENT"
            accent="from-mentor-teal to-teal-700"
          />
        </div>
      )}

      {ready && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-center text-white">
          <CheckCircle2 className="mx-auto h-9 w-9 text-teal-300" />
          <h2 className="mt-2 font-bold font-bricolage text-xl">Kedua tes selesai!</h2>
          <p className="mt-1 font-manrope text-sm text-white/75">Total XP {((minat?.xpEarned ?? 0) + (bakat?.xpEarned ?? 0))} · streak 📢</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-orange px-6 py-3 font-bold font-manrope text-sm text-white hover:brightness-105">
            Lihat versi lengkap <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}

function ResultCard({ title, data, href, accent }: { title: string; data: any; href: string; accent: string }) {
  const present = data?.present === true;
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${accent}`}>{title.includes("Minat") ? "🧠" : "💡"}</div>
        {present ? <span className="rounded-full bg-green-50 px-2 py-0.5 font-manrope text-[10px] font-semibold text-green-700">Selesai</span> : <span className="rounded-full bg-amber-50 px-2 py-0.5 font-manrope text-[10px] font-semibold text-amber-700">Belum</span>}
      </div>
      <h3 className="mt-3 font-bold font-bricolage text-gray-900">{title}</h3>
      {present ? (
        <>
          <p className="mt-2 font-manrope text-[11px] text-gray-400">Profil</p>
          <p className="text-2xl font-bold font-bricolage text-brand-navy">{data.profileCode}</p>
          <p className="mt-1 font-manrope text-xs text-gray-500">+{data.xpEarned ?? 0} XP · streak 🔥 {data.streak ?? 0}</p>
          {(data.recommendations ?? []).slice(0, 3).map((r: any, i: number) => (
            <p key={i} className="mt-1 flex items-center justify-between font-manrope text-xs text-gray-600">
              <span>{r.categoryName}</span>
              <span className="text-teal-700">{r.confidence}%</span>
            </p>
          ))}
        </>
      ) : (
        <Link href={href as any} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-brand-navy px-4 py-2.5 font-manrope text-xs font-semibold text-white hover:brightness-110">
          <Sparkles className="h-3.5 w-3.5" /> Kerjakan dulu <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}