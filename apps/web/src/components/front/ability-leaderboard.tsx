"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Play, Timer, Trophy } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { buildUtmUrl } from "@/lib/utm";
import { orpc } from "@/utils/orpc";

type Entry = {
  rank: number;
  masked: string;
  score: number;
  total: number;
  durationSec: number;
  isSelf: boolean;
};

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const RANK_STYLE: Record<number, string> = {
  1: "bg-amber-400 text-white",
  2: "bg-slate-300 text-white",
  3: "bg-orange-400 text-white",
};

export function AbilityLeaderboard() {
  const { data, isLoading, isError } = useQuery(orpc.tmb.leaderboard.ability.queryOptions());
  const entries: Entry[] = (data?.entries ?? []).slice(0, 20);
  const ctaHref =
    buildUtmUrl("/login", {
      source: "mulaiplus_web",
      medium: "front",
      campaign: "assessment",
      content: "leaderboard-cta",
    }) +
    "&callbackUrl=" +
    encodeURIComponent("/dashboard/student/assessment");

  return (
    <section className="bg-brand-navy/5 py-14 lg:py-20" id="leaderboard">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/5 px-3.5 py-1.5 font-manrope font-medium text-[11px] text-brand-orange tracking-wide">
            <Trophy className="size-3.5" /> Papan Peringkat
          </span>
          <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy sm:text-4xl">
            Tercepat &amp; Terbaik <span className="text-brand-orange">Test Bakat</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl font-manrope text-muted-foreground text-sm">
            Skor = jumlah jawaban benar; urutan kedua = waktu tercepat. Nama disensor — privasi tetap terjaga.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {isLoading ? (
            <div className="space-y-2.5 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : isError || entries.length === 0 ? (
            <div className="p-10 text-center font-manrope text-muted-foreground text-sm">
              Belum ada peserta — jadilah yang pertama! 🚀
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-gray-100 border-b font-manrope text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Peserta</th>
                  <th className="px-4 py-3 text-center">Skor</th>
                  <th className="px-4 py-3 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr
                    key={e.rank}
                    className={e.isSelf ? "bg-brand-orange/5 font-semibold" : "transition-colors hover:bg-gray-50/60"}
                  >
                    <td className="px-4 py-2.5">
                      {e.rank <= 3 ? (
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${RANK_STYLE[e.rank]}`}>
                          {e.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : <Medal className="h-3.5 w-3.5" />}
                        </span>
                      ) : (
                        <span className="ml-1 font-manrope text-muted-foreground text-xs">{e.rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-manrope text-brand-navy text-xs">
                      {e.masked}
                      {e.isSelf && (
                        <span className="ml-1.5 rounded-full bg-brand-orange/15 px-2 py-0.5 font-bold text-[9px] text-brand-orange">
                          Kamu
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center font-manrope font-semibold text-brand-navy text-xs">
                      {e.score}
                      <span className="text-muted-foreground/60">/{e.total}</span>
                    </td>
                    <td className="flex items-center justify-end gap-1 px-4 py-2.5 font-manrope text-muted-foreground text-xs">
                      <Timer className="h-3 w-3" /> {fmtTime(e.durationSec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href={ctaHref as any}
            data-tracked="1"
            onClick={() =>
              trackEvent("assessment_cta_click", { type: "bakat", placement: "leaderboard", campaign: "assessment" })
            }
            className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-7 py-3.5 font-bold font-bricolage text-sm text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-brand-navy-light active:scale-[0.98]"
          >
            <Play className="h-4 w-4" /> Coba Tes Bakat &amp; Masuk Ranking!
          </Link>
        </div>
        <p className="mt-3 text-center font-manrope text-[10px] text-muted-foreground">
          * Peringkat diperbarui berkala dari attempt resmi (ability). Skor & waktu palsu/demo tidak masuk.
        </p>
      </div>
    </section>
  );
}
