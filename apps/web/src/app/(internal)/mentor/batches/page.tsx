"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, FileText, GraduationCap, Trophy, Users, Video } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchesPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const { data: batches, isLoading } = useQuery({
    ...orpc.programs.myBatches.queryOptions({
      enabled: !!isAuthorized,
    }),
    staleTime: 1000 * 60 * 5,
  });

  const activeBatches = batches?.filter((b) => b.status === "open" || b.status === "running") || [];
  const completedBatches = batches?.filter((b) => b.status === "completed") || [];
  const upcomingBatches = batches?.filter((b) => b.status === "upcoming") || [];

  return (
    <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">My Batches</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Manage your assigned program batches and track student progress.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatMini icon={GraduationCap} label="Total Batches" value={batches?.length || 0} color="bg-brand-navy" />
          <StatMini icon={Users} label="Active" value={activeBatches.length} color="bg-mentor-teal" />
          <StatMini icon={Trophy} label="Completed" value={completedBatches.length} color="bg-brand-orange" />
          <StatMini icon={Calendar} label="Upcoming" value={upcomingBatches.length} color="bg-brand-navy-light" />
        </div>

        {/* Batch Cards Grid */}
        {!batches?.length ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <GraduationCap className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-bricolage font-semibold text-lg text-text-main">No Batches Assigned</h3>
            <p className="mt-1 font-manrope text-sm text-text-muted-custom">
              You haven&apos;t been assigned to any batches yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </div>
    </PageState>
  );
}

function StatMini({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card className="border-0 bg-white shadow-sm transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12", color)}>
          <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
        <div>
          <p className="font-inter font-medium text-text-muted-custom text-xs sm:text-sm">{label}</p>
          <p className="font-bold font-bricolage text-text-main text-xl sm:text-2xl">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BatchCard({ batch }: { batch: any }) {
  const isActive = batch.status === "open" || batch.status === "running";
  const now = new Date();
  const startDate = new Date(batch.startDate);
  const endDate = new Date(batch.endDate);
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  const elapsedDays = Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const progress = Math.min(Math.max(Math.round((elapsedDays / totalDays) * 100), 0), 100);

  const statusColors: Record<string, string> = {
    upcoming: "bg-gray-100 text-gray-600 border-gray-200",
    open: "bg-mentor-teal/10 text-mentor-teal border-mentor-teal/20",
    closed: "bg-orange-50 text-orange-600 border-orange-200",
    running: "bg-green-50 text-green-600 border-green-200",
    completed: "bg-blue-50 text-blue-600 border-blue-200",
  };

  return (
    <Card className="mentor-card mentor-card-hover flex flex-col overflow-hidden">
      {/* Gradient Header */}
      <div className="gradient-mentor relative px-5 py-4">
        <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-mentor-teal-light/10 blur-[40px]" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate font-manrope font-medium text-white/70 text-xs uppercase tracking-wider">
              {batch.program?.name || "Program"}
            </p>
            <h3 className="mt-1 truncate font-bold font-bricolage text-lg text-white">{batch.name}</h3>
          </div>
          <Badge
            className={cn(
              "ml-2 shrink-0 rounded-lg border px-2.5 py-0.5 font-manrope font-medium text-[11px] capitalize shadow-sm",
              statusColors[batch.status] || "bg-gray-100 text-gray-600",
            )}
          >
            {batch.status}
          </Badge>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        {/* Progress Bar */}
        {isActive && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-manrope font-medium text-text-muted-custom text-xs">Progress</span>
              <span className="font-manrope font-semibold text-mentor-teal text-xs">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-mentor-teal to-mentor-teal-light transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Info Rows */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/5">
              <Calendar className="h-4 w-4 text-brand-navy" />
            </div>
            <div>
              <p className="font-manrope font-medium text-sm text-text-main">Duration</p>
              <p className="font-manrope text-text-muted-custom text-xs">
                {format(startDate, "MMM d")} — {format(endDate, "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mentor-teal/5">
              <Clock className="h-4 w-4 text-mentor-teal" />
            </div>
            <div>
              <p className="font-manrope font-medium text-sm text-text-main">Details</p>
              <p className="font-manrope text-text-muted-custom text-xs">
                {batch.durationWeeks} weeks · {batch.quota} seats
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex flex-wrap gap-2 border-gray-100 border-t pt-4">
          <Link href={`/mentor/sessions?batchId=${batch.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-gray-200 bg-white font-manrope font-medium text-text-main text-xs shadow-sm hover:border-mentor-teal/30 hover:bg-mentor-teal/5 hover:text-mentor-teal"
            >
              <Video className="mr-1.5 h-3.5 w-3.5 text-mentor-teal" />
              Sessions
            </Button>
          </Link>
          <Link href={`/mentor/batches/${batch.id}/attendance`}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-gray-200 bg-white font-manrope font-medium text-text-main text-xs shadow-sm hover:border-mentor-teal/30 hover:bg-mentor-teal/5 hover:text-mentor-teal"
            >
              <Users className="mr-1.5 h-3.5 w-3.5 text-mentor-teal" />
              Attendance
            </Button>
          </Link>
          <Link href={`/mentor/batches/${batch.id}/attachments`}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-gray-200 bg-white font-manrope font-medium text-text-main text-xs shadow-sm hover:border-mentor-teal/30 hover:bg-mentor-teal/5 hover:text-mentor-teal"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5 text-mentor-teal" />
              Resources
            </Button>
          </Link>
          {batch.communityLink && (
            <a href={batch.communityLink} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-gray-200 bg-white font-manrope font-medium text-text-main text-xs shadow-sm"
              >
                💬 Community
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
