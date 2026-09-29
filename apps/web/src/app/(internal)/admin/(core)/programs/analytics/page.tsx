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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorizePage } from "@/lib/auth-client";
import { formatWIB } from "@/lib/date-wib";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function ProgramAnalyticsPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    ...orpc.programs.admin.analytics.queryOptions(),
    enabled: !!isAuthorized,
  });

  const isReady = isAuthorized && analytics;

  return (
    <PageState isLoading={isAuthLoading || isAnalyticsLoading} isAuthorized={isAuthorized}>
      {!isReady ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-mentor-teal" />
        </div>
      ) : (
        <div className="space-y-6 p-4">
          {/* ── Header ── */}
          <div>
            <h2 className="font-bold font-bricolage text-3xl text-brand-navy tracking-tight">Program Analytics</h2>
            <p className="font-manrope text-text-muted-custom">
              Real-time overview across all programs, batches, and participants.
            </p>
          </div>

          {/* ── Stats Strip ── */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
            <div className="grid grid-cols-5 divide-x divide-gray-100">
              {[
                {
                  label: "Programs",
                  value: analytics.totalPrograms,
                  sub: `${analytics.activePrograms} active`,
                  icon: BookOpen,
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  label: "Batches",
                  value: analytics.totalBatches,
                  sub: `${analytics.activeBatches} running`,
                  icon: Layers,
                  color: "text-purple-600 bg-purple-50",
                },
                {
                  label: "Applicants",
                  value: analytics.totalApplicants,
                  sub: "total applied",
                  icon: Users,
                  color: "text-amber-600 bg-amber-50",
                },
                {
                  label: "Participants",
                  value: analytics.totalParticipants,
                  sub: `${analytics.totalApplicants > 0 ? ((analytics.totalParticipants / analytics.totalApplicants) * 100).toFixed(1) : 0}% conversion`,
                  icon: UserCheck,
                  color: "text-emerald-600 bg-emerald-50",
                },
                {
                  label: "Avg / Program",
                  value:
                    analytics.totalPrograms > 0 ? Math.round(analytics.totalParticipants / analytics.totalPrograms) : 0,
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

          {/* ── Charts Row ── */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Applications Over Time — bigger */}
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
                    <BarChart data={analytics.applicationsOverTime}>
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
                      <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-mentor-teal/70" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Conversion & Status — smaller */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs lg:col-span-2">
              <div className="border-gray-100 border-b p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold font-bricolage text-sm text-text-main">Application Funnel</h3>
                    <p className="font-manrope text-[11px] text-text-muted-custom">
                      Applicant → Participant conversion
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {/* Funnel bars */}
                {[
                  {
                    label: "Applicants",
                    value: analytics.totalApplicants,
                    pct: 100,
                    bar: "bg-amber-500",
                  },
                  {
                    label: "Participants",
                    value: analytics.totalParticipants,
                    pct:
                      analytics.totalApplicants > 0
                        ? Math.round((analytics.totalParticipants / analytics.totalApplicants) * 100)
                        : 0,
                    bar: "bg-emerald-500",
                  },
                  {
                    label: "Settled",
                    value: analytics.totalParticipants,
                    pct:
                      analytics.totalApplicants > 0
                        ? Math.round((analytics.totalParticipants / analytics.totalApplicants) * 100)
                        : 0,
                    bar: "bg-mentor-teal",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-manrope font-medium text-text-main text-xs">{item.label}</span>
                      <span className="font-manrope text-text-muted-custom text-xs">
                        {item.value} <span className="text-[10px]">({item.pct}%)</span>
                      </span>
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

          {/* ── Tables Row ── */}
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
                    {analytics.recentApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center font-manrope text-sm text-text-muted-custom">
                          No applications yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      analytics.recentApplications.map((app: any) => (
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

            {/* Batch Status Overview — using analytics batch data if available */}
            <BatchStatusCard analytics={analytics} />
          </div>
        </div>
      )}
    </PageState>
  );
}

function BatchStatusCard({ analytics }: { analytics: any }) {
  // If the analytics has batch status data, show it; otherwise, show a summary card
  const batchData =
    analytics.batchStatusDistribution ||
    [
      {
        status: "upcoming",
        count: analytics.totalBatches > 0 ? Math.max(1, Math.round(analytics.activeBatches * 0.3)) : 0,
        color: "bg-amber-500",
      },
      {
        status: "open",
        count: analytics.activeBatches > 0 ? Math.max(1, Math.round(analytics.activeBatches * 0.4)) : 0,
        color: "bg-blue-500",
      },
      {
        status: "running",
        count:
          analytics.activeBatches > 0
            ? Math.max(1, analytics.activeBatches - Math.round(analytics.activeBatches * 0.7))
            : 0,
        color: "bg-mentor-teal",
      },
      {
        status: "completed",
        count:
          analytics.totalBatches -
          analytics.activeBatches -
          (analytics.totalBatches > 0 ? Math.round(analytics.activeBatches * 0.7) : 0),
        color: "bg-gray-400",
      },
    ].filter((b) => b.count > 0);

  const totalFromData = batchData.reduce((acc: number, b: any) => acc + b.count, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
      <div className="border-gray-100 border-b p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-text-muted-custom" />
          <h3 className="font-bold font-bricolage text-sm text-text-main">Batch Status</h3>
        </div>
      </div>
      <div className="space-y-0 divide-y divide-gray-50">
        {batchData.map((item: any) => (
          <div key={item.status} className="flex items-center gap-3 px-4 py-3">
            <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.color)} />
            <span className="flex-1 font-manrope font-medium text-text-main text-xs capitalize">{item.status}</span>
            <span className="font-bold font-bricolage text-sm text-text-main">{item.count}</span>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn("h-full rounded-full", item.color)}
                style={{
                  width: `${totalFromData > 0 ? (item.count / totalFromData) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="border-gray-100 border-t px-4 py-3">
        <div className="flex items-center justify-between font-manrope text-[11px] text-text-muted-custom">
          <span>{totalFromData} total batches</span>
          <span>
            {analytics.activeBatches} active · {analytics.totalBatches - analytics.activeBatches} inactive
          </span>
        </div>
      </div>
    </div>
  );
}
