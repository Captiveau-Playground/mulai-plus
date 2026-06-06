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
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Separator } from "@/components/ui/separator";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function AdminBatchDetailPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isAuthLoading} isAuthorized={isAuthorized}>
      <BatchDetailContent />
    </PageState>
  );
}

export function BatchDetailContent() {
  const params = useParams();
  const programId = params.id as string;
  const batchId = params.batchId as string;

  const { data: batch, isLoading } = useQuery(orpc.programs.admin.batches.get.queryOptions({ input: { id: batchId } }));

  const { data: sessions } = useQuery({
    ...orpc.programActivities.session.list.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });

  const { data: attendanceData } = useQuery({
    ...orpc.programs.admin.batches.attendance.list.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });

  const { data: mentorsData } = useQuery({
    ...orpc.programs.admin.batches.getMentors.queryOptions({ input: { batchId } }),
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

  const baseUrl = `/admin/programs/${programId}/batches/${batchId}`;

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
  const _scheduledSessions = sessions?.filter((s: any) => s.status === "scheduled").length || 0;
  const completedSessions = sessions?.filter((s: any) => s.status === "completed").length || 0;
  const _sessionCompletionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const navCards = [
    { title: "Sessions", desc: "Schedule & manage mentoring sessions", icon: Calendar, href: `${baseUrl}/sessions` },
    { title: "Attendance", desc: "Track student weekly attendance", icon: CheckSquare, href: `${baseUrl}/attendance` },
    { title: "Mentors", desc: "Assign mentors to this batch", icon: Users, href: `${baseUrl}/mentors` },
    { title: "Mentees", desc: "Assign mentees to mentors", icon: UserCheck, href: `${baseUrl}/mentees` },
    { title: "Attachments", desc: "Manage resources & materials", icon: File, href: `${baseUrl}/attachments` },
    {
      title: "Report Template",
      desc: "Set assessment titles for reports",
      icon: FileText,
      href: `${baseUrl}/report-template`,
    },
    {
      title: "Summary Reports",
      desc: "Review & approve mentor reports",
      icon: MessageSquare,
      href: `${baseUrl}/summary-reports`,
    },
    { title: "Timeline", desc: "Key dates & batch timeline", icon: Clock, href: `${baseUrl}/timeline` },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/programs/${programId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0 text-gray-700")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="mentor-section-header">{batch.name}</h1>
            <Badge variant={batch.status === "open" ? "default" : "secondary"}>{batch.status}</Badge>
          </div>
          <p className="mentor-section-subheader mt-1">
            {batch.startDate && new Date(batch.startDate).toLocaleDateString()} —{" "}
            {batch.endDate && new Date(batch.endDate).toLocaleDateString()}
            <span className="mx-2">·</span>
            {batch.durationWeeks} weeks · Quota: {batch.quota}
          </p>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="mentor-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="icon-box-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope font-semibold text-[10px] text-text-muted-custom uppercase tracking-wider">
                Sessions
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold font-bricolage text-text-main text-xl">{totalSessions}</span>
                <span className="font-manrope text-[10px] text-text-muted-custom">{completedSessions} done</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="icon-box-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope font-semibold text-[10px] text-text-muted-custom uppercase tracking-wider">
                Attendance
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold font-bricolage text-text-main text-xl">{completionRate}%</span>
                <span className="font-manrope text-[10px] text-text-muted-custom">
                  {presentCount}p · {absentCount}a
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="icon-box-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope font-semibold text-[10px] text-text-muted-custom uppercase tracking-wider">
                Mentors
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold font-bricolage text-text-main text-xl">{totalMentors}</span>
                <span className="font-manrope text-[10px] text-text-muted-custom">assigned</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="icon-box-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope font-semibold text-[10px] text-text-muted-custom uppercase tracking-wider">
                Participants
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold font-bricolage text-text-main text-xl">
                  {totalParticipants}/{batch.quota}
                </span>
                <span className="font-manrope text-[10px] text-text-muted-custom">quota</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="icon-box-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope font-semibold text-[10px] text-text-muted-custom uppercase tracking-wider">
                Progress
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold font-bricolage text-text-main text-xl">
                  {weeksDone}/{batch.durationWeeks}
                </span>
                <span className="font-manrope text-[10px] text-text-muted-custom">weeks</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Quick Actions ─── */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="mentor-section-header text-xl">Quick Actions</h2>
        </div>
        <Separator className="mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {navCards.slice(0, 6).map((item) => (
            <NavCard key={item.title} {...item} />
          ))}
          <NavCard
            title={navCards[6].title}
            desc={navCards[6].desc}
            icon={navCards[6].icon}
            href={navCards[6].href}
            span="col-span-2"
          />
          <NavCard title={navCards[7].title} desc={navCards[7].desc} icon={navCards[7].icon} href={navCards[7].href} />
        </div>
      </div>
    </div>
  );
}

function NavCard({
  title,
  desc,
  icon: Icon,
  href,
  span,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  span?: string;
}) {
  return (
    <Link href={href as any} className={cn("group block", span)}>
      <Card className="mentor-card mentor-card-hover h-full cursor-pointer">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="icon-box-navy flex h-12 w-12 items-center justify-center rounded-2xl md:h-12 md:w-12">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold font-bricolage text-sm text-text-main transition-colors group-hover:text-mentor-teal">
              {title}
            </p>
            <p className="mt-0.5 line-clamp-1 font-manrope text-text-muted-custom text-xs">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
