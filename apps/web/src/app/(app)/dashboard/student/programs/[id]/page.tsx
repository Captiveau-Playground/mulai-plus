"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  HelpCircle,
  MessageCircle,
  Star,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentProgramDetailPage() {
  const params = useParams();
  const programId = params.id as string;

  const {
    data: program,
    isLoading,
    error,
  } = useQuery(
    orpc.programs.student.get.queryOptions({
      input: { id: programId },
    }),
  );

  if (error?.message === "Program not found or you are not enrolled") {
    notFound();
  }

  const getSessionStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
      scheduled: { bg: "bg-blue-100", text: "text-blue-700", icon: Clock },
      completed: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
      missed: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
      cancelled: { bg: "bg-gray-100", text: "text-gray-700", icon: XCircle },
    };
    return config[status] || config.scheduled;
  };

  const _getSessionCardClassName = (status: string, sessionDate: Date) => {
    const isUpcoming = status === "scheduled" && !isPast(sessionDate);
    if (isUpcoming) return "border-l-4 border-l-brand-orange";
    return "";
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  const getStatusLabel = (status: string, sessionDate: Date) => {
    const now = new Date();
    const endTime = new Date(sessionDate.getTime() + 60 * 60000);
    const joinWindowStart = new Date(sessionDate.getTime() - 15 * 60 * 1000);
    const isInProgress = status === "scheduled" && now >= joinWindowStart && now < endTime;
    if (isInProgress) return "In Progress";
    return status;
  };

  const stats = {
    totalSessions: program?.sessions?.length || 0,
    completedSessions: program?.sessions?.filter((s) => s.status === "completed").length || 0,
    upcomingSessions:
      program?.sessions?.filter((s) => s.status === "scheduled" && !isPast(new Date(s.startsAt))).length || 0,
    missedSessions: program?.sessions?.filter((s) => s.status === "missed").length || 0,
  };

  return (
    <PageState isLoading={isLoading}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/student/programs" as={"/dashboard/student/programs" as Route}>
              <Button variant="ghost" size="sm" className="text-text-muted-custom">
                ← Back to Programs
              </Button>
            </Link>
          </div>
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">{program?.name}</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">{program?.description}</p>
        </div>

        {/* Program Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">{stats.totalSessions}</p>
                <p className="font-manrope text-sm text-text-muted-custom">Total Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">
                  {stats.completedSessions}
                </p>
                <p className="font-manrope text-sm text-text-muted-custom">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5">
              <div className="icon-box-orange">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">{stats.upcomingSessions}</p>
                <p className="font-manrope text-sm text-text-muted-custom">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">{stats.missedSessions}</p>
                <p className="font-manrope text-sm text-text-muted-custom">Missed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Info Card */}
        {program?.batch && (
          <Card className="student-card">
            <CardHeader className="bg-white">
              <div className="flex items-center gap-3">
                <div className="icon-box-navy">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="font-bricolage text-lg text-text-main">{program.batch.name}</CardTitle>
                  <CardDescription className="font-manrope text-sm text-text-muted-custom">
                    {program.batch.durationWeeks} weeks program
                  </CardDescription>
                </div>
                <Badge
                  className={cn(
                    "ml-auto rounded-full px-3 py-1 font-inter font-semibold text-xs",
                    program.batch.status === "running" && "bg-green-500 text-white",
                    program.batch.status === "completed" && "bg-brand-navy-light text-white",
                    program.batch.status === "upcoming" && "bg-brand-orange text-white",
                  )}
                >
                  {program.batch.status.charAt(0).toUpperCase() + program.batch.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="bg-white pt-0">
              <Separator className="mb-6" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-text-muted-custom" />
                  <span className="font-manrope text-sm text-text-muted-custom">Start:</span>
                  <span className="font-manrope font-medium text-sm text-text-main">
                    {program.batch.startDate ? format(new Date(program.batch.startDate), "MMM d, yyyy") : "TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-text-muted-custom" />
                  <span className="font-manrope text-sm text-text-muted-custom">End:</span>
                  <span className="font-manrope font-medium text-sm text-text-main">
                    {program.batch.endDate ? format(new Date(program.batch.endDate), "MMM d, yyyy") : "TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-text-muted-custom" />
                  <span className="font-manrope text-sm text-text-muted-custom">Quota:</span>
                  <span className="font-manrope font-medium text-sm text-text-main">{program.batch.quota} peserta</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-text-muted-custom" />
                  <span className="font-manrope text-sm text-text-muted-custom">Joined:</span>
                  <span className="font-manrope font-medium text-sm text-text-main">
                    {program.joinedAt ? format(new Date(program.joinedAt), "MMM d, yyyy") : "N/A"}
                  </span>
                </div>
              </div>
              {program.batch.communityLink && (
                <a
                  href={program.batch.communityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-manrope font-semibold text-white transition-all hover:bg-[#1ebe5d]"
                >
                  <MessageCircle className="h-5 w-5" />
                  Join WhatsApp Group
                </a>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Sessions */}
            <Card className="student-card">
              <CardHeader className="bg-white pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-bricolage text-lg text-text-main">Sessions</CardTitle>
                    <CardDescription className="font-manrope text-sm text-text-muted-custom">
                      Your mentoring schedule for this program
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="bg-white p-4 md:p-6">
                {program?.sessions && program.sessions.length > 0 ? (
                  <div className="space-y-4">
                    {program.sessions.map((session) => {
                      const now = new Date();
                      const sessionDate = new Date(session.startsAt);
                      const endTime = new Date(sessionDate.getTime() + (session.durationMinutes || 60) * 60000);
                      const { bg, text, icon: Icon } = getSessionStatusBadge(session.status);
                      const isUpcoming = session.status === "scheduled" && !isPast(sessionDate);
                      const joinWindowStart = new Date(sessionDate.getTime() - 15 * 60 * 1000);
                      const isInProgress = session.status === "scheduled" && now >= joinWindowStart && now < endTime;

                      return (
                        <Card
                          key={session.id}
                          className={cn(
                            "student-card-hover border-gray-200 border-l-4 bg-white",
                            isUpcoming && "border-l-brand-orange",
                          )}
                        >
                          <CardHeader className="bg-white pb-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-4">
                                {/* Date Badge */}
                                <div className="flex flex-col items-center justify-center rounded-xl bg-brand-navy px-4 py-3 text-white">
                                  <span className="font-manrope text-xs uppercase">{format(sessionDate, "MMM")}</span>
                                  <span className="font-bold font-bricolage text-2xl">{format(sessionDate, "d")}</span>
                                </div>

                                <div className="space-y-1">
                                  {/* Session Title */}
                                  <CardTitle className="font-bricolage text-lg text-text-main sm:text-xl">
                                    Week {session.week} -{" "}
                                    {session.type === "one_on_one" ? "1-on-1 Mentoring" : "Group Session"}
                                  </CardTitle>

                                  {/* Date & Time */}
                                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 font-manrope text-sm text-text-muted-custom">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {getDateLabel(sessionDate)} • {format(sessionDate, "h:mm a")} -{" "}
                                      {format(endTime, "h:mm a")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      {session.durationMinutes || 60} minutes
                                    </span>
                                  </CardDescription>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  className={cn(
                                    "flex items-center gap-1.5 border font-inter text-xs",
                                    isInProgress ? "border-brand-orange/20 bg-brand-orange/10 text-brand-orange" : bg,
                                    isInProgress ? "" : text,
                                  )}
                                >
                                  {isInProgress ? <Video className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                  {isInProgress ? "In Progress" : getStatusLabel(session.status, sessionDate)}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="border-gray-100 border-t bg-white pt-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              {/* Mentor Info */}
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 overflow-hidden rounded-full bg-brand-navy/10">
                                  {session.mentor?.image ? (
                                    <Image
                                      src={session.mentor.image}
                                      alt={session.mentor.name || ""}
                                      className="h-full w-full object-cover"
                                      width={40}
                                      height={40}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center font-semibold text-brand-navy text-sm">
                                      {session.mentor?.name?.charAt(0) || "M"}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-manrope font-medium text-sm text-text-main">
                                    with {session.mentor?.name || "Assigned Mentor"}
                                  </p>
                                  <p className="font-manrope text-text-muted-custom text-xs">
                                    {session.batch?.program?.name || "Mentoring Session"}
                                  </p>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                {session.notes && (
                                  <p className="mr-4 line-clamp-1 font-manrope text-sm text-text-muted-custom">
                                    {session.notes}
                                  </p>
                                )}
                                {(() => {
                                  const now = new Date();
                                  const endTime = new Date(
                                    sessionDate.getTime() + (session.durationMinutes || 60) * 60000,
                                  );
                                  const joinWindowStart = new Date(sessionDate.getTime() - 15 * 60 * 1000);
                                  const canJoin = session.meetingLink && now >= joinWindowStart && now < endTime;

                                  if (canJoin) {
                                    return (
                                      <a href={session.meetingLink!} target="_blank" rel="noopener noreferrer">
                                        <Button
                                          size="sm"
                                          className="btn-brand-red gap-2 rounded-full shadow-md hover:shadow-lg"
                                        >
                                          <Video className="h-4 w-4" />
                                          Join Meeting
                                        </Button>
                                      </a>
                                    );
                                  }
                                  if (session.status === "scheduled" && session.meetingLink && now < joinWindowStart) {
                                    return (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-2 rounded-full border-gray-200"
                                        disabled
                                      >
                                        <Clock className="h-4 w-4" />
                                        Join available{" "}
                                        {isToday(joinWindowStart)
                                          ? format(joinWindowStart, "'at' h:mm a")
                                          : format(joinWindowStart, "MMM d 'at' h:mm a")}
                                      </Button>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10">
                      <Calendar className="h-8 w-8 text-brand-navy" />
                    </div>
                    <p className="font-manrope text-text-muted-custom">No sessions scheduled yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Syllabus/Curriculum */}
            {program?.syllabus && program.syllabus.length > 0 && (
              <Card className="student-card">
                <CardHeader className="bg-white">
                  <CardTitle className="font-bricolage text-lg text-text-main">Curriculum</CardTitle>
                  <CardDescription className="font-manrope text-sm text-text-muted-custom">
                    What you will learn in this program
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-white pt-0">
                  <Separator className="mb-6" />
                  <div className="space-y-4">
                    {program.syllabus.map((item, index) => (
                      <div key={item.id || index} className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white">
                          <span className="font-bold font-bricolage">{item.week}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-inter font-semibold text-text-main">{item.title}</h4>
                          {item.outcome && (
                            <p className="mt-1 font-manrope text-sm text-text-muted-custom">{item.outcome}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mentors */}
            {program?.batch?.mentors && program.batch.mentors.length > 0 && (
              <Card className="student-card">
                <CardHeader className="bg-white">
                  <CardTitle className="font-bricolage text-lg text-text-main">Your Mentors</CardTitle>
                </CardHeader>
                <CardContent className="bg-white pt-0">
                  <Separator className="mb-6" />
                  <div className="space-y-4">
                    {program.batch.mentors.map((mentorRelation) => {
                      const mentor = mentorRelation.user;
                      return (
                        <div key={mentor.id} className="flex items-center gap-3">
                          {mentor.image ? (
                            <Image
                              src={mentor.image}
                              alt={mentor.name || ""}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-navy/20"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy ring-2 ring-brand-navy/20">
                              <span className="font-semibold text-white">{mentor.name?.charAt(0) || "M"}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-inter font-semibold text-text-main">{mentor.name}</p>
                            <p className="truncate font-manrope text-sm text-text-muted-custom">{mentor.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Info */}
            <Card className="student-card">
              <CardHeader className="bg-white">
                <CardTitle className="font-bricolage text-lg text-text-main">Program Info</CardTitle>
              </CardHeader>
              <CardContent className="bg-white pt-0">
                <Separator className="mb-6" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="icon-box-light">
                      <Calendar className="h-4 w-4 text-brand-navy" />
                    </div>
                    <div>
                      <p className="font-manrope text-text-muted-custom text-xs">Registration Period</p>
                      <p className="font-manrope font-medium text-sm text-text-main">
                        {program?.batch?.registrationStartDate
                          ? format(new Date(program.batch.registrationStartDate), "MMM d")
                          : "N/A"}{" "}
                        -{" "}
                        {program?.batch?.registrationEndDate
                          ? format(new Date(program.batch.registrationEndDate), "MMM d, yyyy")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="icon-box-light">
                      <HelpCircle className="h-4 w-4 text-brand-navy" />
                    </div>
                    <div>
                      <p className="font-manrope text-text-muted-custom text-xs">Announcement Date</p>
                      <p className="font-manrope font-medium text-sm text-text-main">
                        {program?.batch?.announcementDate
                          ? format(new Date(program.batch.announcementDate), "MMM d, yyyy")
                          : "TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="icon-box-light">
                      <Video className="h-4 w-4 text-brand-navy" />
                    </div>
                    <div>
                      <p className="font-manrope text-text-muted-custom text-xs">Onboarding Date</p>
                      <p className="font-manrope font-medium text-sm text-text-main">
                        {program?.batch?.onboardingDate
                          ? format(new Date(program.batch.onboardingDate), "MMM d, yyyy")
                          : "TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="icon-box-light">
                      <Star className="h-4 w-4 text-brand-navy" />
                    </div>
                    <div>
                      <p className="font-manrope text-text-muted-custom text-xs">Total Topics</p>
                      <p className="font-manrope font-medium text-sm text-text-main">
                        {program?.syllabus?.length || 0} weeks
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageState>
  );
}
