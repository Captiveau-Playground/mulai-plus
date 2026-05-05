"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { AlertCircle, Calendar, CheckCircle2, Clock, Video, XCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentSchedulePage() {
  const { data: sessions, isLoading } = useQuery(orpc.programActivities.student.mySessions.queryOptions());

  const now = new Date();
  const upcomingSessions = sessions?.filter((s) => new Date(s.startsAt) > now) || [];
  const pastSessions = sessions?.filter((s) => new Date(s.startsAt) <= now) || [];

  return (
    <PageState isLoading={isLoading}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">Schedule</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Manage and view all your learning sessions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main">{sessions?.length || 0}</p>
                <p className="font-manrope text-sm text-text-muted-custom">Total Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main">
                  {sessions?.filter((s) => s.status === "completed").length || 0}
                </p>
                <p className="font-manrope text-sm text-text-muted-custom">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4">
              <div className="icon-box-orange">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main">{upcomingSessions.length}</p>
                <p className="font-manrope text-sm text-text-muted-custom">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main">
                  {sessions?.filter((s) => s.status === "missed").length || 0}
                </p>
                <p className="font-manrope text-sm text-text-muted-custom">Missed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Tabs — single Tabs component wrapping both trigger + content */}
        <Card className="student-card">
          <Tabs defaultValue="upcoming" className="w-full">
            <CardHeader className="border-gray-100 border-b bg-white pb-4">
              <TabsList className="flex h-auto gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="upcoming"
                  className="rounded-full px-5 py-2 font-inter text-sm transition-all data-[state=active]:bg-brand-navy data-[state=active]:text-white data-[state=inactive]:text-text-muted-custom data-[state=inactive]:hover:bg-gray-100 data-[state=inactive]:hover:text-text-main"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Upcoming ({upcomingSessions.length})
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="rounded-full px-5 py-2 font-inter text-sm transition-all data-[state=active]:bg-brand-navy data-[state=active]:text-white data-[state=inactive]:text-text-muted-custom data-[state=inactive]:hover:bg-gray-100 data-[state=inactive]:hover:text-text-main"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Past ({pastSessions.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="bg-white p-4 md:p-6">
              <TabsContent value="upcoming" className="mt-0 space-y-4">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => <SessionCard key={session.id} session={session} isUpcoming />)
                ) : (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-gray-200 border-dashed bg-white py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10">
                      <Calendar className="h-8 w-8 text-brand-navy" />
                    </div>
                    <h3 className="font-bold font-bricolage text-lg text-text-main">No upcoming sessions</h3>
                    <p className="mt-1 font-manrope text-text-muted-custom">You're all caught up! Check back later.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0 space-y-4">
                {pastSessions.length > 0 ? (
                  pastSessions.map((session) => <SessionCard key={session.id} session={session} />)
                ) : (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-gray-200 border-dashed bg-white py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10">
                      <Clock className="h-8 w-8 text-brand-navy" />
                    </div>
                    <h3 className="font-bold font-bricolage text-lg text-text-main">No past sessions</h3>
                    <p className="mt-1 font-manrope text-text-muted-custom">You haven't attended any sessions yet.</p>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </PageState>
  );
}

function SessionCard({ session, isUpcoming }: { session: any; isUpcoming?: boolean }) {
  const now = new Date();
  const sessionDate = new Date(session.startsAt);
  const endTime = new Date(sessionDate.getTime() + (session.durationMinutes || 60) * 60000);
  const joinWindowStart = new Date(sessionDate.getTime() - 15 * 60 * 1000); // H-15

  const canJoin = session.meetingLink && now >= joinWindowStart && now < endTime;
  const isInProgress = now >= joinWindowStart && now < endTime;
  const displayStatus = session.status === "scheduled" && isInProgress ? "In Progress" : session.status;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "scheduled":
        if (isInProgress) return "bg-brand-orange/10 text-brand-orange border-brand-orange/20";
        if (isPast(sessionDate)) return "bg-brand-orange/10 text-brand-orange border-brand-orange/20";
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "missed":
        return "bg-red-100 text-red-700 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "scheduled":
        if (isInProgress) return <Video className="h-4 w-4" />;
        return <Clock className="h-4 w-4" />;
      case "missed":
        return <XCircle className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  return (
    <Card
      className={cn(
        "student-card-hover border-gray-200 border-l-4 bg-white",
        isInProgress ? "border-l-brand-orange" : isUpcoming && "border-l-brand-orange",
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
              {/* Program Badge */}
              <Badge variant="outline" className="border-gray-200 font-inter text-text-muted-custom text-xs">
                {session.batch?.program?.name || "Program Session"}
              </Badge>

              {/* Session Title */}
              <CardTitle className="font-bricolage text-lg text-text-main sm:text-xl">
                Week {session.week} - {session.type === "one_on_one" ? "1-on-1 Mentoring" : "Group Session"}
              </CardTitle>

              {/* Date & Time */}
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 font-manrope text-sm text-text-muted-custom">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {getDateLabel(sessionDate)} • {format(sessionDate, "h:mm a")} - {format(endTime, "h:mm a")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {session.durationMinutes || 60} minutes
                </span>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={cn("flex items-center gap-1.5 border font-inter text-xs", getStatusColor(displayStatus))}>
              {getStatusIcon(displayStatus)}
              {displayStatus}
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
              <p className="mr-4 line-clamp-1 font-manrope text-sm text-text-muted-custom">{session.notes}</p>
            )}
            {canJoin ? (
              <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="btn-brand-red gap-2 rounded-full shadow-md hover:shadow-lg">
                  <Video className="h-4 w-4" />
                  Join Meeting
                </Button>
              </a>
            ) : session.status === "scheduled" && session.meetingLink && now < joinWindowStart ? (
              <Button size="sm" variant="outline" className="gap-2 rounded-full border-gray-200" disabled>
                <Clock className="h-4 w-4" />
                Join available{" "}
                {isToday(joinWindowStart)
                  ? format(joinWindowStart, "'at' h:mm a")
                  : format(joinWindowStart, "MMM d 'at' h:mm a")}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
