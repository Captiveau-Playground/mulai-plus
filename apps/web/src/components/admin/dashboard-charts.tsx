"use client";

import { Activity, Brain, MessageSquare, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * Chart admin dashboard — dynamic-import (ssr:false) biar recharts tidak masuk critical path.
 * Susunan (bertambah informatif):
 *   A. Area: User Registered 30 hari (lebar) + donut Users by Role
 *   B. Insight cards: AI Assistant · Assessment · Program funnel
 *   C. children (Audit trail mini + Recent signups)
 */
export function AdminDashboardCharts({
  stats,
  analytics,
  children,
}: {
  stats: any;
  analytics: any;
  children?: React.ReactNode;
}) {
  const ROLE_COLORS = ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#0ea5e9", "#94a3b8"];
  const roleData = (stats?.usersByRole || []).map((item: any, i: number) => ({
    role: item.role,
    users: item.count,
    fill: ROLE_COLORS[i % ROLE_COLORS.length],
  }));
  const roleConfig = {
    users: { label: "Users" },
  } satisfies ChartConfig;
  const totalRoleUsers = roleData.reduce((a: number, r: any) => a + r.users, 0);

  // User registrations — deret 30 hari penuh (nol sudah diisi di API)
  const regData = (stats?.userRegistrations || []).map((r: any) => ({ d: r.d, n: Number(r.n ?? 0) }));
  const regTotal = regData.reduce((a: number, r: any) => a + r.n, 0);
  const regToday = regData.length ? Number(regData[regData.length - 1]?.n ?? 0) : 0;
  const regLast7 = regData.slice(-7).reduce((a: number, r: any) => a + r.n, 0);
  const regConfig = {
    n: { label: "Registered", color: "#6366f1" },
  } satisfies ChartConfig;
  const REG_STROKE = "#6366f1"; // indigo vivid

  // AI daily + feedback
  const aiDaily = (stats?.ai?.daily || []).map((r: any) => ({ d: r.d, n: Number(r.n ?? 0) }));
  const aiConfig = {
    n: { label: "Pesan", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  // Assessment daily
  const assessDaily = (stats?.assessment?.daily || []).map((r: any) => ({ d: r.d, n: Number(r.n ?? 0) }));
  const assessConfig = {
    n: { label: "Test selesai", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const funnel = [
    {
      label: "Applicants",
      value: analytics?.totalApplicants || 0,
      pct: 100,
      bar: "bg-amber-500",
    },
    {
      label: "Participants",
      value: analytics?.totalParticipants || 0,
      pct: analytics?.totalApplicants ? Math.round((analytics.totalParticipants / analytics.totalApplicants) * 100) : 0,
      bar: "bg-emerald-500",
    },
    {
      label: "Conversion",
      value: `${analytics?.totalApplicants ? ((analytics.totalParticipants / analytics.totalApplicants) * 100).toFixed(1) : 0}%`,
      pct: analytics?.totalApplicants ? Math.round((analytics.totalParticipants / analytics.totalApplicants) * 100) : 0,
      bar: "bg-mentor-teal",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ══ A. Area (User Registered) + donut (Users by Role) ══ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Area besar */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs lg:col-span-3">
          <div className="flex items-center justify-between border-gray-100 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
              </span>
              <h3 className="font-bold font-bricolage text-brand-navy text-xs">User Registered</h3>
            </div>
            <div className="flex items-center gap-3 font-manrope text-[10px] text-muted-foreground">
              <span>
                <b className="font-bricolage text-brand-navy text-sm">{regTotal.toLocaleString()}</b> · 30 hari
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">
                hari ini {regToday}
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600">
                7 hari {regLast7}
              </span>
            </div>
          </div>
          <div className="p-4">
            <ChartContainer config={regConfig} className="h-[240px] w-full">
              <AreaChart data={regData} margin={{ left: -18 }}>
                <defs>
                  <linearGradient id="fillReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef0f6" />
                <XAxis
                  dataKey="d"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => `${v.slice(8)}/${v.slice(5, 7)}`}
                  minTickGap={24}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="n"
                  type="monotone"
                  stroke={REG_STROKE}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: REG_STROKE, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  fill="url(#fillReg)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* Donut Users by Role */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs lg:col-span-2">
          <div className="flex items-center gap-2 border-gray-100 border-b px-3.5 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50">
              <UsersIcon />
            </span>
            <h3 className="font-bold font-bricolage text-brand-navy text-xs">Users by Role</h3>
          </div>
          <div className="p-4">
            <ChartContainer config={roleConfig} className="mx-auto aspect-square h-[230px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={roleData} dataKey="users" nameKey="role" innerRadius={60} strokeWidth={4}>
                  <Label
                    content={({ viewBox }: any) =>
                      viewBox && "cx" in viewBox ? (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold text-lg">
                            {totalRoleUsers.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 16} className="fill-muted-foreground text-[9px]">
                            Users
                          </tspan>
                        </text>
                      ) : null
                    }
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* ══ B. Insight cards: AI · Assessment · Funnel ══ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* AI Assistant */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="flex items-center gap-2 border-gray-100 border-b px-3.5 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50">
              <MessageSquare className="h-3 w-3 text-purple-600" />
            </span>
            <h3 className="font-bold font-bricolage text-[11px] text-text-main">AI Assistant</h3>
            <span className="ml-auto rounded-full bg-purple-50 px-2 py-0.5 font-manrope font-semibold text-[9px] text-purple-700">
              {stats?.ai?.sessions ?? 0} sessions
            </span>
          </div>
          <div className="space-y-3 p-3.5">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50/60 py-2">
                <p className="font-bold font-bricolage text-emerald-600 text-xl">{stats?.ai?.up ?? 0}</p>
                <p className="font-manrope text-[9px] text-emerald-700">👍 puas</p>
              </div>
              <div className="rounded-xl bg-red-50/60 py-2">
                <p className="font-bold font-bricolage text-red-500 text-xl">{stats?.ai?.down ?? 0}</p>
                <p className="font-manrope text-[9px] text-red-600">👎 kurang</p>
              </div>
            </div>
            <ChartContainer config={aiConfig} className="h-[84px] w-full">
              <AreaChart data={aiDaily} margin={{ left: -30 }}>
                <defs>
                  <linearGradient id="fillAi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-n)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-n)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area dataKey="n" type="monotone" stroke="var(--color-n)" strokeWidth={1.5} fill="url(#fillAi)" />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* Assessment */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="flex items-center gap-2 border-gray-100 border-b px-3.5 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
              <Brain className="h-3 w-3 text-sky-600" />
            </span>
            <h3 className="font-bold font-bricolage text-[11px] text-text-main">Assessment (30 hari)</h3>
          </div>
          <div className="space-y-3 p-3.5">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-brand-navy/5 py-2">
                <p className="font-bold font-bricolage text-brand-navy text-xl">
                  {stats?.assessment?.attempts30d ?? 0}
                </p>
                <p className="font-manrope text-[9px] text-muted-foreground">test selesai</p>
              </div>
              <div className="rounded-xl bg-brand-orange/10 py-2">
                <p className="font-bold font-bricolage text-brand-orange text-xl">
                  {stats?.assessment?.results30d ?? 0}
                </p>
                <p className="font-manrope text-[9px] text-brand-orange/80">hasil lengkap</p>
              </div>
            </div>
            <ChartContainer config={assessConfig} className="h-[84px] w-full">
              <AreaChart data={assessDaily} margin={{ left: -30 }}>
                <defs>
                  <linearGradient id="fillAssess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-n)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-n)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area dataKey="n" type="monotone" stroke="var(--color-n)" strokeWidth={1.5} fill="url(#fillAssess)" />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* Funnel program */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="flex items-center gap-2 border-gray-100 border-b px-3.5 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50">
              <Activity className="h-3 w-3 text-amber-600" />
            </span>
            <h3 className="font-bold font-bricolage text-[11px] text-text-main">Program Funnel</h3>
          </div>
          <div className="space-y-3.5 p-4">
            {funnel.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-manrope font-medium text-[10px] text-text-main">{item.label}</span>
                  <span className="font-manrope text-[9px] text-muted-foreground">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn("h-full rounded-full transition-all", item.bar)}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ C. children: audit mini + recent signups ══ */}
      {children && <div className="grid gap-4 lg:grid-cols-2">{children}</div>}
    </div>
  );
}

function UsersIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="text-violet-600"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
