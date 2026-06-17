"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Clock,
  GraduationCap,
  Layers,
  Loader2,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function AdminPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const { data: stats, isLoading, isError } = useQuery(orpc.getAdminStats.queryOptions());
  const { data: analytics } = useQuery({
    ...orpc.programs.admin.analytics.queryOptions(),
    enabled: !!isAuthorized,
  });

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
    <PageState isLoading={isAuthLoading} isAuthorized={isAuthorized}>
      <div className="space-y-5 p-4">
        {/* ── Header ── */}
        <div>
          <h2 className="font-bold font-bricolage text-3xl text-brand-navy tracking-tight">Admin Dashboard</h2>
          <p className="font-manrope text-text-muted-custom">System-wide overview at a glance.</p>
        </div>

        {/* ── Stats Strip ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="grid grid-cols-6 divide-x divide-gray-100">
            {[
              {
                label: "Users",
                value: stats?.totalUsers,
                sub: `${(stats?.totalUsers || 0) - (stats?.bannedUsers || 0)} active`,
                icon: Users,
                color: "text-blue-600 bg-blue-50",
                loading: isLoading,
                error: isError,
              },
              {
                label: "Programs",
                value: analytics?.totalPrograms,
                sub: `${analytics?.activePrograms || 0} active`,
                icon: BookOpen,
                color: "text-purple-600 bg-purple-50",
                loading: isLoading,
                error: isError,
              },
              {
                label: "Batches",
                value: analytics?.totalBatches,
                sub: `${analytics?.activeBatches || 0} running`,
                icon: Layers,
                color: "text-amber-600 bg-amber-50",
                loading: isLoading,
                error: isError,
              },
              {
                label: "Applicants",
                value: analytics?.totalApplicants,
                sub: "total applied",
                icon: UserCheck,
                color: "text-emerald-600 bg-emerald-50",
                loading: isLoading,
                error: isError,
              },
              {
                label: "Participants",
                value: analytics?.totalParticipants,
                sub: `${analytics?.totalApplicants ? ((analytics.totalParticipants / analytics.totalApplicants) * 100).toFixed(1) : 0}% conv`,
                icon: GraduationCap,
                color: "text-rose-600 bg-rose-50",
                loading: isLoading,
                error: isError,
              },
              {
                label: "Roles",
                value: stats?.totalRoles,
                sub: `${stats?.totalPermissions || 0} permissions`,
                icon: Shield,
                color: "text-indigo-600 bg-indigo-50",
                loading: isLoading,
                error: isError,
              },
            ].map((stat) => (
              <div key={stat.label} className="p-4">
                {stat.loading ? (
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                ) : stat.error ? (
                  <div className="flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="h-4 w-4" /> Error
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.color)}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 font-bold font-bricolage text-2xl text-text-main">{stat.value ?? "-"}</p>
                      <p className="font-manrope text-[11px] text-text-muted-custom">{stat.sub}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Charts Row ── */}
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

            <AuditTrailMini />
            <RecentSignupsMini users={stats?.recentUsers} />
          </div>
        </div>

        {/* ── Recent Activity Row (compact 3-col) ── */}
        <div className="grid gap-3 lg:grid-cols-2">
          {/* ── Quick Navigation ── */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
            <div className="border-gray-100 border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-navy/10">
                  <Activity className="h-3 w-3 text-brand-navy" />
                </div>
                <h3 className="font-bold font-bricolage text-text-main text-xs">Quick Navigation</h3>
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-gray-50 text-xs">
              {[
                [
                  {
                    label: "Programs",
                    href: "/admin/programs",
                    desc: "Manage programs",
                  },
                  {
                    label: "LMS Courses",
                    href: "/admin/lms/courses",
                    desc: "Course catalog",
                  },
                  {
                    label: "Users",
                    href: "/admin/users",
                    desc: `${stats?.totalUsers || 0} registered`,
                  },
                  {
                    label: "Roles",
                    href: "/admin/roles",
                    desc: "Access control",
                  },
                ],
                [
                  {
                    label: "Email",
                    href: "/admin/email",
                    desc: "Templates & campaigns",
                  },
                  {
                    label: "CMS",
                    href: "/admin/cms/articles",
                    desc: "Articles & media",
                  },
                  {
                    label: "Settings",
                    href: "/admin/settings",
                    desc: "System config",
                  },
                  {
                    label: "Audit Log",
                    href: "/admin/audit",
                    desc: "Activity trail",
                  },
                ],
              ].map((col, ci) => (
                <div key={ci} className="divide-y divide-gray-50">
                  {col.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href as any}
                      className="group flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-mentor-teal/5"
                    >
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="font-manrope font-medium text-text-main text-xs transition-colors group-hover:text-mentor-teal">
                          {item.label}
                        </p>
                        <p className="font-manrope text-[10px] text-text-muted-custom">{item.desc}</p>
                      </div>
                      <svg
                        className="h-3 w-3 shrink-0 text-gray-300 transition-colors group-hover:text-mentor-teal"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <RecentApplicationsMini />
        </div>
      </div>
    </PageState>
  );
}

function AuditTrailMini() {
  const { data, isLoading } = useQuery({
    ...orpc.audit.list.queryOptions({
      input: { limit: 5, sortBy: "createdAt", sortOrder: "desc" },
    }),
    staleTime: 1000 * 60 * 1,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
      <div className="flex items-center gap-2 border-gray-100 border-b px-3 py-2">
        <Activity className="h-3.5 w-3.5 text-text-muted-custom" />
        <h3 className="font-bold font-bricolage text-text-main text-xs">Audit Trail</h3>
        <span className="ml-auto font-manrope text-[10px] text-text-muted-custom">Latest</span>
      </div>
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-mentor-teal" />
          </div>
        ) : data?.items.length === 0 ? (
          <div className="py-6 text-center font-manrope text-text-muted-custom text-xs">No activity</div>
        ) : (
          data?.items.map((log: any) => (
            <div key={log.id} className="flex items-center gap-2.5 px-3 py-2">
              <div
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  log.action?.includes("create")
                    ? "bg-emerald-500"
                    : log.action?.includes("delete")
                      ? "bg-red-500"
                      : log.action?.includes("update")
                        ? "bg-amber-500"
                        : "bg-blue-500",
                )}
              />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-manrope font-medium text-text-main text-xs">
                  {log.user?.name || "System"} <span className="font-normal text-text-muted-custom">{log.action}</span>
                </p>
                <p className="truncate font-manrope text-[10px] text-text-muted-custom">{log.resource}</p>
              </div>
              <span className="shrink-0 font-manrope text-[9px] text-text-muted-custom">
                {formatDistanceToNow(new Date(log.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecentSignupsMini({ users }: { users?: any[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
      <div className="flex items-center gap-2 border-gray-100 border-b px-3 py-2">
        <Clock className="h-3.5 w-3.5 text-text-muted-custom" />
        <h3 className="font-bold font-bricolage text-text-main text-xs">New Users</h3>
        <span className="ml-auto font-manrope text-[10px] text-text-muted-custom">Signups</span>
      </div>
      <div className="divide-y divide-gray-50">
        {!users || users.length === 0 ? (
          <div className="py-6 text-center font-manrope text-text-muted-custom text-xs">No recent signups</div>
        ) : (
          users.slice(0, 5).map((user: any) => (
            <div key={user.id} className="flex items-center gap-2.5 px-3 py-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-brand-navy/10 font-bold text-[10px] text-brand-navy">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-manrope font-medium text-text-main text-xs">{user.name}</p>
                <p className="truncate font-manrope text-[10px] text-text-muted-custom">{user.email}</p>
              </div>
              <span className="shrink-0 rounded-full border px-1.5 py-0.5 font-manrope text-[8px] text-text-muted-custom capitalize">
                {user.role}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecentApplicationsMini() {
  const { data: applications, isLoading } = useQuery({
    ...orpc.programs.admin.applications.recent.queryOptions({
      input: { limit: 5 },
    }),
    staleTime: 1000 * 60 * 1,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
      <div className="flex items-center gap-2 border-gray-100 border-b px-3 py-2">
        <UserCheck className="h-3.5 w-3.5 text-text-muted-custom" />
        <h3 className="font-bold font-bricolage text-text-main text-xs">Applications</h3>
        <span className="ml-auto font-manrope text-[10px] text-text-muted-custom">Latest</span>
      </div>
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-mentor-teal" />
          </div>
        ) : applications?.length === 0 ? (
          <div className="py-6 text-center font-manrope text-text-muted-custom text-xs">No applications yet</div>
        ) : (
          applications?.map((app: any) => (
            <div key={app.id} className="flex items-center gap-2.5 px-3 py-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={app.user?.image || undefined} />
                <AvatarFallback className="bg-amber-50 font-bold text-[10px] text-amber-600">
                  {app.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-manrope font-medium text-text-main text-xs">{app.user?.name}</p>
                <p className="truncate font-manrope text-[10px] text-text-muted-custom">{app.program?.name}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 font-manrope font-medium text-[9px]",
                  app.status === "accepted"
                    ? "bg-emerald-50 text-emerald-700"
                    : app.status === "rejected"
                      ? "bg-red-50 text-red-600"
                      : "bg-amber-50 text-amber-600",
                )}
              >
                {app.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
