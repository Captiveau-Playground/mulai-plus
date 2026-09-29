"use client";

import { Brain, Compass, LineChart as LineChartIcon, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export interface ProgressPoint {
  createdAt: string | Date;
  confidenceScore: number;
  hollandCode: string | null;
  hollandScores: Record<string, number>;
  abilityPct: Record<string, number>;
}

const ABILITY_META: Record<string, { label: string; color: string }> = {
  numerical: { label: "Numerik", color: "#1a1f6d" },
  verbal: { label: "Verbal", color: "#0d9488" },
  logical: { label: "Logika", color: "#fe9114" },
  spatial: { label: "Spasial", color: "#7c3aed" },
  clerical: { label: "Ketelitian", color: "#db2777" },
};

function fmtDate(iso: string | Date) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

function ChartCard({
  icon,
  title,
  subtitle,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent)}>{icon}</div>
        <div className="min-w-0">
          <h3 className="font-bold font-bricolage text-base text-gray-900">{title}</h3>
          <p className="truncate font-manrope text-gray-400 text-xs">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 h-52">{children}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">{icon}</div>
      <p className="max-w-[220px] font-manrope text-gray-400 text-xs">{text}</p>
    </div>
  );
}

export function ProgressCharts({ progress }: { progress: ProgressPoint[] }) {
  const interestData = useMemo(
    () =>
      progress.map((p, i) => ({
        name: fmtDate(p.createdAt),
        tgl: fmtDate(p.createdAt),
        n: i + 1,
        Kecocokan: Math.round(p.confidenceScore),
        kode: p.hollandCode ?? "—",
      })),
    [progress],
  );

  const abilityData = useMemo(
    () =>
      progress.map((p) => ({
        name: fmtDate(p.createdAt),
        tgl: fmtDate(p.createdAt),
        ...Object.fromEntries(Object.entries(ABILITY_META).map(([k, m]) => [m.label, p.abilityPct[k] ?? 0])),
      })),
    [progress],
  );

  // tren: naik / turun / datar
  const trend =
    interestData.length >= 2 ? interestData[interestData.length - 1].Kecocokan - interestData[0].Kecocokan : 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : LineChartIcon;
  const trendColor = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-gray-400";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* TES MINAT */}
      <ChartCard
        icon={<Compass className="h-4 w-4 text-white" />}
        title="Progres Tes Minat"
        subtitle={progress.length > 1 ? "Kecocokan jurusan teratas tiap percobaan" : "Kecocokan jurusan teratas"}
        accent="bg-brand-navy"
      >
        {progress.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-5 w-5" />}
            text="Selesaikan kedua test untuk mulai melihat progresmu."
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={interestData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, "Kecocokan"]}
                  labelFormatter={(l: any, payload: any) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${p.tgl} · kode ${p.kode}` : l;
                  }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="Kecocokan"
                  stroke="#1a1f6d"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#1a1f6d", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {progress.length > 1 && (
              <p className={cn("mt-1 flex items-center gap-1 font-manrope text-xs", trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                {trend > 0
                  ? `Naik ${trend} poin sejak percobaan pertama`
                  : trend < 0
                    ? `Turun ${Math.abs(trend)} poin sejak percobaan pertama`
                    : "Stabil sejak percobaan pertama"}
              </p>
            )}
            {progress.length === 1 && (
              <p className="mt-1 font-manrope text-gray-400 text-xs">
                Ikuti test lagi untuk melihat tren naik/turunmu.
              </p>
            )}
          </>
        )}
      </ChartCard>

      {/* TES BAKAT */}
      <ChartCard
        icon={<Brain className="h-4 w-4 text-white" />}
        title="Progres Tes Bakat"
        subtitle="Skor tiap kemampuan per percobaan"
        accent="bg-mentor-teal"
      >
        {progress.length === 0 ? (
          <EmptyState
            icon={<Brain className="h-5 w-5" />}
            text="Selesaikan kedua test untuk mulai melihat progresmu."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={abilityData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {Object.entries(ABILITY_META).map(([k, m]) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
