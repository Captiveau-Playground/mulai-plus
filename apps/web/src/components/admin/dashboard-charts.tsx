"use client";

import { Activity, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * Chart admin dashboard — di-dynamic-import (ssr: false) supaya recharts (~368KB)
 * tidak ikut jalur kritikal render awal halaman.
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
  const chartConfig = {
    users: { label: "Users", color: "hsl(var(--chart-1))" },
    role: { label: "Role", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const roleData = (stats?.usersByRole || []).map((item: any) => ({
    role: item.role,
    users: item.count,
    fill: "var(--color-users)",
  }));

  const activeData = [
    {
      browser: "active",
      visitors: (stats?.totalUsers || 0) - (stats?.bannedUsers || 0),
      fill: "var(--color-active)",
    },
    {
      browser: "banned",
      visitors: stats?.bannedUsers || 0,
      fill: "var(--color-banned)",
    },
  ];

  const activeConfig = {
    visitors: { label: "Users" },
    active: { label: "Active", color: "hsl(var(--chart-2))" },
    banned: { label: "Banned", color: "hsl(var(--destructive))" },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Users by Role */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs lg:col-span-3">
        <div className="border-gray-100 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="font-bold font-bricolage text-text-main text-xs">Users by Role</h3>
          </div>
        </div>
        <div className="p-4 pt-2">
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart accessibilityLayer data={roleData}>
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="role"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="users" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* User Status + Funnel */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4 lg:col-span-2">
        {/* User Status Pie */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="border-gray-100 border-b px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-50">
                <Activity className="h-3 w-3 text-green-600" />
              </div>
              <h3 className="font-bold font-bricolage text-[11px] text-text-main">User Status</h3>
            </div>
          </div>
          <div className="p-3">
            <ChartContainer config={activeConfig} className="mx-auto aspect-square max-h-[170px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={activeData} dataKey="visitors" nameKey="browser" innerRadius={50} strokeWidth={4}>
                  <Label
                    content={({ viewBox }: any) => {
                      if (viewBox && "cx" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold text-lg">
                              {stats?.totalUsers?.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 16}
                              className="fill-muted-foreground text-[9px]"
                            >
                              Users
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        </div>

        {/* Funnel compact */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="border-gray-100 border-b px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50">
                <TrendingUp className="h-3 w-3 text-amber-600" />
              </div>
              <h3 className="font-bold font-bricolage text-[11px] text-text-main">Funnel</h3>
            </div>
          </div>
          <div className="space-y-2.5 p-3.5">
            {[
              {
                label: "Applicants",
                value: analytics?.totalApplicants || 0,
                pct: 100,
                bar: "bg-amber-500",
              },
              {
                label: "Participants",
                value: analytics?.totalParticipants || 0,
                pct: analytics?.totalApplicants
                  ? Math.round((analytics.totalParticipants / analytics.totalApplicants) * 100)
                  : 0,
                bar: "bg-emerald-500",
              },
              {
                label: "Conversion",
                value: `${analytics?.totalApplicants ? ((analytics.totalParticipants / analytics.totalApplicants) * 100).toFixed(1) : 0}%`,
                pct: analytics?.totalApplicants
                  ? Math.round((analytics.totalParticipants / analytics.totalApplicants) * 100)
                  : 0,
                bar: "bg-mentor-teal",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-manrope font-medium text-[10px] text-text-main">{item.label}</span>
                  <span className="font-manrope text-[9px] text-text-muted-custom">{item.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn("h-full rounded-full transition-all", item.bar)}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
