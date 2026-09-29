"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  File,
  FileText,
  GraduationCap,
  MessageSquare,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageState } from "@/components/ui/page-state";
import { authClient, useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function AdminBatchDetailPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isAuthLoading} isAuthorized={isAuthorized}>
      <div className="flex-1">
        <BatchDetailContent />
      </div>
    </PageState>
  );
}

export function BatchDetailContent() {
  const params = useParams();
  const programId = params.id as string;
  const batchId = params.batchId as string;
  const { data: session } = authClient.useSession();
  const isUserAdmin = session?.user?.role === "admin";
  const prefix = isUserAdmin ? "/admin" : "/program-manager";

  const { data: batch, isLoading } = useQuery(orpc.programs.admin.batches.get.queryOptions({ input: { id: batchId } }));

  const { data: program } = useQuery({
    ...orpc.programs.admin.get.queryOptions({ input: { id: programId } }),
    enabled: !!programId,
  });

  const { data: sessions } = useQuery({
    ...orpc.programActivities.session.list.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });

  const { data: attendanceData } = useQuery({
    ...orpc.programs.admin.batches.attendance.list.queryOptions({
      input: { batchId },
    }),
    enabled: !!batchId,
  });

  const { data: mentorsData } = useQuery({
    ...orpc.programs.admin.batches.getMentors.queryOptions({
      input: { batchId },
    }),
    enabled: !!batchId,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-mentor-teal border-t-transparent" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-manrope text-text-muted-custom">Batch not found</p>
      </div>
    );
  }

  const baseUrl = `${prefix}/programs/${programId}/batches/${batchId}`;
  const totalSessions = sessions?.length || 0;
  const totalParticipants = attendanceData?.participants?.length || 0;
  const totalMentors = mentorsData?.length || 0;
  const allAttendance = attendanceData?.attendance || [];
  const presentCount = allAttendance.filter((a: any) => a.status === "present").length;
  const absentCount = allAttendance.filter((a: any) => a.status === "absent").length;
  const _excusedCount = allAttendance.filter((a: any) => a.status === "excused").length;
  const totalAttendanceRecords = allAttendance.length;
  const completionRate = totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0;
  const weeksDone = new Set(allAttendance.map((a: any) => a.week)).size;
  const completedSessions = sessions?.filter((s: any) => s.status === "completed").length || 0;

  const stats = [
    {
      label: "Sessions",
      value: totalSessions,
      sub: `${completedSessions} completed`,
      icon: BookOpen,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Attendance",
      value: `${completionRate}%`,
      sub: `${presentCount} present · ${absentCount} absent`,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Mentors",
      value: totalMentors,
      sub: "assigned",
      icon: Users,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Participants",
      value: `${totalParticipants}/${batch.quota}`,
      sub: "quota filled",
      icon: GraduationCap,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Progress",
      value: `${weeksDone}/${batch.durationWeeks}`,
      sub: "weeks done",
      icon: Target,
      color: "text-rose-600 bg-rose-50",
    },
  ];

  const navItems = [
    {
      title: "Sessions",
      desc: "Schedule & manage mentoring sessions",
      icon: Calendar,
      href: `${baseUrl}/sessions`,
      stat: `${totalSessions} total`,
    },
    {
      title: "Attendance",
      desc: "Track student weekly attendance",
      icon: CheckSquare,
      href: `${baseUrl}/attendance`,
      stat: `${completionRate}% rate`,
    },
    {
      title: "Mentors",
      desc: "Assign mentors to this batch",
      icon: Users,
      href: `${baseUrl}/mentors`,
      stat: `${totalMentors} assigned`,
    },
    {
      title: "Mentees",
      desc: "Assign mentees to mentors",
      icon: UserCheck,
      href: `${baseUrl}/mentees`,
      stat: `${totalParticipants} total`,
    },
    {
      title: "Attachments",
      desc: "Manage resources & materials",
      icon: File,
      href: `${baseUrl}/attachments`,
      stat: "Resources",
    },
    {
      title: "Report Template",
      desc: "Set assessment titles",
      icon: FileText,
      href: `${baseUrl}/report-template`,
      stat: "Configure",
    },
    {
      title: "Summary Reports",
      desc: "Review & approve mentor reports",
      icon: MessageSquare,
      href: `${baseUrl}/summary-reports`,
      stat: "Review",
    },
    {
      title: "Timeline",
      desc: "Key dates & batch timeline",
      icon: Clock,
      href: `${baseUrl}/timeline`,
      stat: "View",
    },
  ];

  return (
    <div className="max-w-full space-y-8 p-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <Link
          href={`${prefix}/programs/${programId}`}
          className="mt-1 inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-text-muted-custom shadow-xs transition-all hover:border-mentor-teal/30 hover:text-mentor-teal hover:shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate font-bold font-bricolage text-3xl text-brand-navy tracking-tight">{batch.name}</h1>
            {program && (
              <span className="hidden items-center gap-1.5 rounded-full bg-brand-navy/5 px-3 py-1 font-manrope font-medium text-[13px] text-brand-navy sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-navy/30" />
                {program.name}
              </span>
            )}
            <Badge
              className={cn(
                "shrink-0 rounded-md px-2.5 py-0.5 font-manrope font-semibold text-[11px] uppercase tracking-wider",
                batch.status === "open"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : batch.status === "running"
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : batch.status === "completed"
                      ? "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                      : batch.status === "upcoming"
                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        : "bg-red-50 text-red-700 ring-1 ring-red-200",
              )}
            >
              {batch.status}
            </Badge>
          </div>
          <p className="mt-1 font-manrope text-text-muted-custom">
            {batch.startDate &&
              new Date(batch.startDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
            —{" "}
            {batch.endDate &&
              new Date(batch.endDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            <span className="mx-2 inline-block h-1 w-1 rounded-full bg-gray-300 align-middle" />
            {batch.durationWeeks} weeks
            <span className="mx-2 inline-block h-1 w-1 rounded-full bg-gray-300 align-middle" />
            Quota: {batch.quota}
          </p>
        </div>
      </div>

      {/* ── Stats Strip (modern, no cards) ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
        <div className="grid grid-cols-5 divide-x divide-gray-100">
          {stats.map((stat) => (
            <div key={stat.label} className="relative p-5">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-bold font-bricolage text-2xl text-text-main">{stat.value}</span>
                    <span className="font-manrope text-[11px] text-text-muted-custom">{stat.sub}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigation Grid (modern, sleek) ── */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-mentor-teal" />
          <h2 className="font-bold font-bricolage text-brand-navy text-xl tracking-tight">Management</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {navItems.map((item) => (
            <Link
              key={item.title}
              href={item.href as any}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-mentor-teal/20 hover:shadow-md"
            >
              {/* Hover accent bar */}
              <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-mentor-teal transition-transform group-hover:scale-x-100" />

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white transition-all group-hover:bg-mentor-teal">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold font-bricolage text-sm text-text-main transition-colors group-hover:text-mentor-teal">
                    {item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 font-manrope text-text-muted-custom text-xs">{item.desc}</p>
                  <p className="mt-1.5 font-manrope font-medium text-[11px] text-mentor-teal opacity-0 transition-opacity group-hover:opacity-100">
                    {item.stat} →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
