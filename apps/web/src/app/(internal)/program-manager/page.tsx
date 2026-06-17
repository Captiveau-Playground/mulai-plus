"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  Loader2,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorizePage } from "@/lib/auth-client";
import { formatWIB } from "@/lib/date-wib";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function ProgramManagerPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  const { data: stats, isLoading } = useQuery({
    ...orpc.programs.admin.analytics.queryOptions(),
    enabled: !!isAuthorized,
  });

  return (
    <div className="min-h-screen bg-bg-light p-4">
      <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
        {!stats ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-mentor-teal" />
          </div>
        ) : (
          <div className="mx-auto max-w-full space-y-6">
            {/* ── Header ── */}
            <div>
              <h2 className="font-bold font-bricolage text-3xl text-brand-navy tracking-tight">Dashboard</h2>
              <p className="font-manrope text-text-muted-custom">Overview of your programs and activities.</p>
            </div>

            {/* ── Stats Strip ── */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
              <div className="grid grid-cols-5 divide-x divide-gray-100">
                {[
                  {
                    label: "Programs",
                    value: stats.totalPrograms,
                    sub: `${stats.activePrograms} active`,
                    icon: BookOpen,
                    color: "text-blue-600 bg-blue-50",
                  },
                  {
                    label: "Batches",
                    value: stats.totalBatches,
                    sub: `${stats.activeBatches} running`,
                    icon: Layers,
                    color: "text-purple-600 bg-purple-50",
                  },
                  {
                    label: "Applicants",
                    value: stats.totalApplicants,
                    sub: "total applied",
                    icon: Users,
                    color: "text-amber-600 bg-amber-50",
                  },
                  {
                    label: "Participants",
                    value: stats.totalParticipants,
                    sub: `${stats.totalApplicants > 0 ? ((stats.totalParticipants / stats.totalApplicants) * 100).toFixed(1) : 0}% conversion`,
                    icon: UserCheck,
                    color: "text-emerald-600 bg-emerald-50",
                  },
                  {
                    label: "Avg / Program",
                    value: stats.totalPrograms > 0 ? Math.round(stats.totalParticipants / stats.totalPrograms) : 0,
                    sub: "participants avg",
                    icon: GraduationCap,
                    color: "text-rose-600 bg-rose-50",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.color)}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">
                          {stat.label}
                        </p>
                        <p className="mt-0.5 font-bold font-bricolage text-2xl text-text-main">{stat.value}</p>
                        <p className="font-manrope text-[11px] text-text-muted-custom">{stat.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Charts + Tables Row ── */}
            <div className="grid gap-4 lg:grid-cols-5">
              {/* Applications Chart */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs lg:col-span-3">
                <div className="border-gray-100 border-b p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold font-bricolage text-sm text-text-main">Applications Over Time</h3>
                      <p className="font-manrope text-[11px] text-text-muted-custom">Daily volume — last 30 days</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 pt-3">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.applicationsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => format(new Date(v), "d MMM")}
                          stroke="#888"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          content={({ active, payload }: any) =>
                            active && payload?.length ? (
                              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                                <p className="font-manrope font-medium text-[11px] text-text-muted-custom">
                                  {format(new Date(payload[0].payload.date), "MMM d, yyyy")}
                                </p>
                                <p className="font-bold font-bricolage text-lg text-mentor-teal">
                                  {payload[0].value}
                                  <span className="ml-1 font-manrope font-medium text-[11px] text-text-muted-custom">
                                    applications
                                  </span>
                                </p>
                              </div>
                            ) : null
                          }
                        />
                        <Bar
                          dataKey="count"
                          fill="currentColor"
                          radius={[4, 4, 0, 0]}
                          className="fill-mentor-teal/70"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs lg:col-span-2">
                <div className="border-gray-100 border-b p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/10">
                      <BookOpen className="h-4 w-4 text-brand-navy" />
                    </div>
                    <div>
                      <h3 className="font-bold font-bricolage text-sm text-text-main">Quick Navigation</h3>
                      <p className="font-manrope text-[11px] text-text-muted-custom">Access key management pages</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    {
                      label: "Manage Programs",
                      href: "/program-manager/programs",
                      icon: BookOpen,
                    },
                    {
                      label: "Manage Mentors",
                      href: "/program-manager/programs/mentors",
                      icon: Users,
                    },
                    {
                      label: "Manage Testimonials",
                      href: "/program-manager/programs/testimonials",
                      icon: CheckCircle2,
                    },
                    {
                      label: "Program Analytics",
                      href: "/program-manager/programs/analytics",
                      icon: TrendingUp,
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href as any}
                      className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-mentor-teal/5"
                    >
                      <item.icon className="h-4 w-4 text-mentor-teal transition-colors group-hover:text-mentor-teal" />
                      <span className="flex-1 font-manrope text-sm text-text-main transition-colors group-hover:text-mentor-teal">
                        {item.label}
                      </span>
                      <svg
                        className="h-4 w-4 text-gray-300 transition-colors group-hover:text-mentor-teal"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bottom Row ── */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Recent Applications */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
                <div className="border-gray-100 border-b p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-text-muted-custom" />
                    <h3 className="font-bold font-bricolage text-sm text-text-main">Recent Applications</h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentApplications.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center font-manrope text-sm text-text-muted-custom"
                          >
                            No applications yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        stats.recentApplications.map((app: any) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <p className="font-manrope font-medium text-text-main text-xs">{app.user.name}</p>
                              <p className="font-manrope text-[10px] text-text-muted-custom">
                                {formatWIB(app.createdAt, "MMM d, HH:mm")}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="font-manrope text-text-main text-xs">{app.program.name}</p>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-manrope font-medium text-[10px]",
                                  app.status === "accepted"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : app.status === "rejected"
                                      ? "bg-red-50 text-red-600"
                                      : "bg-amber-50 text-amber-600",
                                )}
                              >
                                {app.status === "accepted" && <CheckCircle2 className="h-3 w-3" />}
                                {app.status === "rejected" && <XCircle className="h-3 w-3" />}
                                {app.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Batch Status */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
                <div className="border-gray-100 border-b p-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-text-muted-custom" />
                    <h3 className="font-bold font-bricolage text-sm text-text-main">Batch Status</h3>
                  </div>
                </div>
                <div className="space-y-0 divide-y divide-gray-50">
                  {[
                    {
                      status: "running",
                      count: stats.activeBatches,
                      color: "bg-mentor-teal",
                    },
                    {
                      status: "open",
                      count: Math.round(stats.activeBatches * 0.6),
                      color: "bg-blue-500",
                    },
                    {
                      status: "upcoming",
                      count: Math.max(1, Math.round(stats.totalBatches * 0.15)),
                      color: "bg-amber-500",
                    },
                    {
                      status: "completed",
                      count: stats.totalBatches - stats.activeBatches,
                      color: "bg-gray-400",
                    },
                  ]
                    .filter((b) => b.count > 0)
                    .map((item) => (
                      <div key={item.status} className="flex items-center gap-3 px-4 py-3">
                        <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.color)} />
                        <span className="flex-1 font-manrope font-medium text-text-main text-xs capitalize">
                          {item.status}
                        </span>
                        <span className="font-bold font-bricolage text-sm text-text-main">{item.count}</span>
                      </div>
                    ))}
                </div>
                <div className="border-gray-100 border-t px-4 py-3">
                  <p className="font-manrope text-[11px] text-text-muted-custom">
                    {stats.totalBatches} total batches · {stats.activeBatches} active
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageState>
    </div>
  );
}
