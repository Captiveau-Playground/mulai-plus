"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, CheckCircle, Clock, GraduationCap, Users, Video } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorDashboardPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery({
    ...orpc.programActivities.mentor.getStats.queryOptions({
      enabled: !!isAuthorized,
    }),
    staleTime: 1000 * 60 * 1,
  });

  const { data: batches, isLoading: isBatchesLoading } = useQuery({
    ...orpc.programs.myBatches.queryOptions({
      enabled: !!isAuthorized,
    }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    ...orpc.programActivities.session.mySessions.queryOptions({
      input: {},
      enabled: !!isAuthorized,
    }),
    staleTime: 1000 * 60 * 1,
  });

  const isLoading = isAuthLoading || isStatsLoading || isBatchesLoading || isSessionsLoading;

  const now = new Date();
  const upcomingSessions = sessions?.filter((s) => new Date(s.startsAt) > now) || [];
  const pastSessions = sessions?.filter((s) => new Date(s.startsAt) <= now) || [];
  const nextSession = upcomingSessions[0];

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">
            Welcome back, Mentor!
          </h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Manage your sessions, track student progress, and stay connected.
          </p>
        </div>

        {/* Stats Cards - Brand Styled */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Calendar}
            label="Total Sessions"
            value={isStatsError ? "—" : (stats?.totalSessions ?? 0)}
            sublabel="All assigned sessions"
            href="/mentor/sessions"
            color="bg-brand-navy"
          />
          <StatCard
            icon={Clock}
            label="Upcoming"
            value={isStatsError ? "—" : (stats?.upcomingSessions ?? 0)}
            sublabel="Scheduled sessions"
            href="/mentor/sessions"
            color="bg-mentor-teal"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={isStatsError ? "—" : (stats?.completedSessions ?? 0)}
            sublabel="Successfully finished"
            href="/mentor/sessions"
            color="bg-brand-orange"
          />
          <StatCard
            icon={Users}
            label="Batches"
            value={isStatsError ? "—" : (stats?.assignedBatches ?? 0)}
            sublabel="Active batches"
            href="/mentor/batches"
            color="bg-brand-navy-light"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Next Session Card - Featured */}
          <div className="lg:col-span-2">
            <Card className="mentor-card overflow-hidden">
              <div className="gradient-mentor relative p-6 text-white sm:p-8">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-mentor-teal-light/20 blur-[60px]" />
                <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-brand-orange/20 blur-[40px]" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-inter font-semibold text-white/80 text-xs uppercase tracking-wider sm:text-sm">
                      Next Session
                    </span>
                  </div>
                  {nextSession ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold font-bricolage text-white text-xl sm:text-2xl lg:text-3xl">
                          Week {nextSession.week} —{" "}
                          {nextSession.type === "one_on_one" ? "1-on-1 Mentoring" : "Group Mentoring"}
                        </h3>
                        <p className="mt-1 font-manrope text-sm text-white/80 sm:text-base">
                          {nextSession.batch?.program?.name || "Your Program"} — {nextSession.batch?.name}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-white/70" />
                          <span className="font-manrope text-white/90 text-xs sm:text-sm">
                            {format(new Date(nextSession.startsAt), "EEE, MMM d • h:mm a")}
                          </span>
                        </div>
                        {nextSession.student && (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 overflow-hidden rounded-full bg-white/20">
                              {nextSession.student.image ? (
                                <Image
                                  src={nextSession.student.image}
                                  alt={nextSession.student.name || ""}
                                  className="h-full w-full object-cover"
                                  width={24}
                                  height={24}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-white text-xs">
                                  {nextSession.student.name?.charAt(0) || "S"}
                                </div>
                              )}
                            </div>
                            <span className="font-manrope text-white/90 text-xs sm:text-sm">
                              with {nextSession.student.name || "Student"}
                            </span>
                          </div>
                        )}
                      </div>
                      {nextSession.meetingLink && (
                        <a
                          href={nextSession.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button
                            size="lg"
                            className="mt-2 gap-2 rounded-full bg-white font-semibold text-brand-navy hover:bg-white/90"
                          >
                            <Video className="h-4 w-4" />
                            Join Meeting
                          </Button>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                        <Calendar className="h-8 w-8 text-white/50" />
                      </div>
                      <p className="font-manrope text-white/70">No upcoming sessions</p>
                      <Link href="/mentor/sessions" className="mt-3">
                        <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10">
                          View All Sessions
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions / Recent Sessions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="mentor-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-bricolage text-lg text-text-main">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/mentor/sessions" className="block">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-mentor-teal hover:bg-mentor-teal/5">
                    <div className="flex items-center gap-3">
                      <div className="icon-box-mentor">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-manrope font-medium text-sm text-text-main">My Sessions</span>
                    </div>
                  </div>
                </Link>
                <Link href="/mentor/batches" className="block">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-navy hover:bg-brand-navy/5">
                    <div className="flex items-center gap-3">
                      <div className="icon-box-navy">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-manrope font-medium text-sm text-text-main">My Batches</span>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Active Batches */}
            <Card className="mentor-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="font-bricolage text-lg text-text-main">Active Batches</CardTitle>
                <Link
                  href="/mentor/batches"
                  className="font-medium text-mentor-teal text-xs hover:underline sm:text-sm"
                >
                  See All
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {batches?.slice(0, 3).map((batch) => (
                    <Link key={batch.id} href={`/mentor/batches/${batch.id}/attendance` as Route}>
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-mentor-teal/40 hover:bg-mentor-teal/5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mentor-teal/10">
                            <GraduationCap className="h-5 w-5 text-mentor-teal" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-manrope font-medium text-sm text-text-main">
                              {batch.program?.name || "Program"}
                            </p>
                            <p className="font-manrope text-text-muted-custom text-xs">{batch.name}</p>
                          </div>
                        </div>
                        <Badge
                          variant={batch.status === "open" || batch.status === "running" ? "default" : "secondary"}
                          className={cn(
                            "text-xs capitalize",
                            (batch.status === "open" || batch.status === "running") && "bg-mentor-teal text-white",
                          )}
                        >
                          {batch.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {!batches?.length && (
                    <div className="py-6 text-center font-manrope text-sm text-text-muted-custom">
                      No batches assigned yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Sessions Summary */}
        {pastSessions.length > 0 && (
          <Card className="mentor-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-bricolage text-lg text-text-main">Recent Sessions</CardTitle>
                <CardDescription className="font-manrope text-sm text-text-muted-custom">
                  Your last {Math.min(pastSessions.length, 5)} completed sessions
                </CardDescription>
              </div>
              <Link href="/mentor/sessions">
                <Button variant="outline" size="sm" className="rounded-full">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {pastSessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-manrope font-medium text-sm text-text-main">
                        Week {session.week} — {session.type === "one_on_one" ? "1-on-1" : "Group"}
                      </p>
                      <p className="font-manrope text-text-muted-custom text-xs">
                        {format(new Date(session.startsAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageState>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sublabel: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href as Route}>
      <Card className="group cursor-pointer overflow-hidden border-0 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5 md:p-6">
          <div>
            <p className="font-inter font-medium text-text-muted-custom text-xs sm:text-sm">{label}</p>
            <p className="mt-1 font-bold font-bricolage text-2xl text-text-main sm:text-3xl md:text-4xl">{value}</p>
            <p className="mt-1 font-manrope text-text-muted-custom text-xs sm:text-sm">{sublabel}</p>
          </div>
          <div
            className={cn(
              "ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 md:h-14 md:w-14",
              color,
            )}
          >
            <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6 md:h-7 md:w-7" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
