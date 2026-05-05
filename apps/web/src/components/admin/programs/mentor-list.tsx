"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  GraduationCap,
  Loader2,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient, isAdmin } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export function MentorList() {
  const { data: session } = authClient.useSession();
  const { data, isLoading } = useQuery({
    ...orpc.programs.admin.mentors.list.queryOptions(),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mentor-teal" />
      </div>
    );
  }

  const mentors = data?.data || [];
  const totalSessions = mentors.reduce((sum, m) => sum + m.totalSessions, 0);
  const totalBatches = mentors.reduce((sum, m) => sum + m.assignedBatches, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="mentor-card">
          <CardContent className="flex items-center gap-4 bg-white p-5">
            <div className="icon-box-mentor shrink-0">
              <User className="h-5 w-5 text-white md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Total Mentors</p>
              <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">
                {data?.pagination.total ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardContent className="flex items-center gap-4 bg-white p-5">
            <div className="icon-box-light shrink-0">
              <CalendarDays className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Total Sessions</p>
              <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">{totalSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardContent className="flex items-center gap-4 bg-white p-5">
            <div className="icon-box-light shrink-0">
              <GraduationCap className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Assigned Batches</p>
              <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">{totalBatches}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentors Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mentor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Batches</TableHead>
              <TableHead>Total Sessions</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mentors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <User className="h-8 w-8 text-text-muted-custom/50" />
                    <p className="font-manrope text-text-muted-custom">No mentors found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              mentors.map((mentor) => (
                <TableRow key={mentor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mentor-teal/10">
                        {mentor.image ? (
                          <Image
                            src={mentor.image}
                            alt={mentor.name || ""}
                            className="h-10 w-10 rounded-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <User className="h-5 w-5 text-mentor-teal" />
                        )}
                      </div>
                      <span className="font-manrope font-semibold text-text-main">{mentor.name || "Unnamed"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-manrope text-text-muted-custom">{mentor.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-manrope">
                      {mentor.assignedBatches}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-manrope">
                      {mentor.totalSessions}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={
                        isAdmin(session)
                          ? `/admin/programs/mentors/${mentor.id}`
                          : `/program-manager/programs/mentors/${mentor.id}`
                      }
                    >
                      <Button size="sm" variant="outline" className="rounded-full font-manrope text-xs">
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function MentorDetail({ mentorId }: { mentorId: string }) {
  const { data: mentor, isLoading } = useQuery({
    ...orpc.programs.admin.mentors.get.queryOptions({ input: { mentorId } }),
    staleTime: 1000 * 60 * 1,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mentor-teal" />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <User className="h-12 w-12 text-text-muted-custom/50" />
        <p className="font-manrope text-text-muted-custom">Mentor not found.</p>
      </div>
    );
  }

  const { stats } = mentor;

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mentor-teal/10 ring-4 ring-mentor-teal/20 md:h-24 md:w-24">
          {mentor.image ? (
            <Image
              src={mentor.image}
              alt={mentor.name || ""}
              className="h-full w-full rounded-full object-cover"
              width={96}
              height={96}
            />
          ) : (
            <User className="h-10 w-10 text-mentor-teal md:h-12 md:w-12" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy md:text-3xl">{mentor.name}</h2>
          <p className="font-manrope text-text-muted-custom">{mentor.email}</p>
        </div>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="mentor-card">
          <CardContent className="flex flex-col items-center bg-white p-4 text-center md:p-5">
            <div className="icon-box-mentor mb-3 h-10 w-10 md:h-12 md:w-12">
              <CalendarDays className="h-5 w-5 text-white md:h-6 md:w-6" />
            </div>
            <p className="font-bold font-bricolage text-2xl text-text-main md:text-3xl">{stats.total}</p>
            <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Total</p>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardContent className="flex flex-col items-center bg-white p-4 text-center md:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 md:h-12 md:w-12">
              <Clock className="h-5 w-5 text-blue-600 md:h-6 md:w-6" />
            </div>
            <p className="font-bold font-bricolage text-2xl text-blue-600 md:text-3xl">{stats.upcoming}</p>
            <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardContent className="flex flex-col items-center bg-white p-4 text-center md:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-green-100 md:h-12 md:w-12">
              <CheckCircle className="h-5 w-5 text-green-600 md:h-6 md:w-6" />
            </div>
            <p className="font-bold font-bricolage text-2xl text-green-600 md:text-3xl">{stats.completed}</p>
            <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Completed</p>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardContent className="flex flex-col items-center bg-white p-4 text-center md:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 md:h-12 md:w-12">
              <XCircle className="h-5 w-5 text-red-600 md:h-6 md:w-6" />
            </div>
            <p className="font-bold font-bricolage text-2xl text-red-600 md:text-3xl">{stats.missed}</p>
            <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Missed</p>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardContent className="flex flex-col items-center bg-white p-4 text-center md:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 md:h-12 md:w-12">
              <XCircle className="h-5 w-5 text-gray-400 md:h-6 md:w-6" />
            </div>
            <p className="font-bold font-bricolage text-2xl text-gray-500 md:text-3xl">{stats.cancelled}</p>
            <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="mentor-card">
          <CardHeader className="bg-white pb-2">
            <CardTitle className="font-bricolage text-base text-text-main">Assigned Batches</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="font-bold font-bricolage text-3xl text-mentor-teal">{mentor.assignedBatches.length}</div>
            <p className="font-manrope text-text-muted-custom text-xs">batches assigned</p>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardHeader className="bg-white pb-2">
            <CardTitle className="font-bricolage text-base text-text-main">Total Students</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="font-bold font-bricolage text-3xl text-brand-navy">{mentor.students.length}</div>
            <p className="font-manrope text-text-muted-custom text-xs">students mentored</p>
          </CardContent>
        </Card>
        <Card className="mentor-card">
          <CardHeader className="bg-white pb-2">
            <CardTitle className="font-bricolage text-base text-text-main">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="font-bold font-bricolage text-3xl text-brand-orange">{mentor.recentSessions.length}</div>
            <p className="font-manrope text-text-muted-custom text-xs">last 10 sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Students / Sessions / Batches */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">
            <Users className="mr-2 h-4 w-4" />
            Students ({mentor.students.length})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Calendar className="mr-2 h-4 w-4" />
            All Sessions
          </TabsTrigger>
          <TabsTrigger value="batches">
            <GraduationCap className="mr-2 h-4 w-4" />
            Batches
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          {mentor.students.length === 0 ? (
            <Card className="mentor-card">
              <CardContent className="flex flex-col items-center justify-center bg-white py-12 text-center">
                <Users className="mb-3 h-10 w-10 text-text-muted-custom/50" />
                <p className="font-manrope text-text-muted-custom">No students with sessions yet.</p>
              </CardContent>
            </Card>
          ) : (
            mentor.students.map((student) => (
              <Card key={student.id} className="mentor-card mentor-card-hover overflow-hidden">
                <CardHeader className="border-gray-100 border-b bg-white pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-navy/10">
                        {student.image ? (
                          <Image
                            src={student.image}
                            alt={student.name || ""}
                            className="h-12 w-12 rounded-full object-cover"
                            width={48}
                            height={48}
                          />
                        ) : (
                          <User className="h-6 w-6 text-brand-navy" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="font-bricolage text-base text-text-main">
                          {student.name || "Unnamed"}
                        </CardTitle>
                        <CardDescription className="font-manrope text-text-muted-custom">
                          {student.email}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="badge-mentor shrink-0 self-start">
                      {student.sessionCount} session{student.sessionCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="bg-white p-4 md:p-5">
                  <div className="space-y-2">
                    {student.sessions.map((session) => {
                      const sessionDate = new Date(session.startsAt);
                      const isSessionPast = isPast(sessionDate);

                      const statusStyle =
                        session.status === "completed"
                          ? { dot: "bg-green-500", icon: CheckCircle, iconColor: "text-green-600" }
                          : session.status === "scheduled" && !isSessionPast
                            ? { dot: "bg-blue-500", icon: Clock, iconColor: "text-blue-600" }
                            : session.status === "scheduled" && isSessionPast
                              ? { dot: "bg-orange-500", icon: Clock, iconColor: "text-orange-600" }
                              : session.status === "missed"
                                ? { dot: "bg-red-500", icon: XCircle, iconColor: "text-red-600" }
                                : { dot: "bg-gray-400", icon: XCircle, iconColor: "text-gray-400" };

                      const StatusIcon = statusStyle.icon;

                      return (
                        <div
                          key={session.id}
                          className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:bg-gray-100/50 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", statusStyle.dot)} />
                            <StatusIcon className={cn("mt-1 h-4 w-4 shrink-0", statusStyle.iconColor)} />
                            <div className="min-w-0">
                              <p className="font-manrope font-medium text-sm text-text-main">
                                Week {session.week} - {session.type === "one_on_one" ? "1-on-1" : "Group"}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-manrope text-text-muted-custom text-xs">
                                <span>{format(sessionDate, "MMM d, yyyy • HH:mm")}</span>
                                <span>({session.durationMinutes}m)</span>
                              </div>
                              <p className="font-manrope text-text-muted-custom text-xs">
                                {session.programName} • {session.batchName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-8 sm:pl-0">
                            {session.meetingLink && (
                              <a href={session.meetingLink} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline" className="rounded-full">
                                  <Video className="mr-1 h-3 w-3" />
                                  Join
                                </Button>
                              </a>
                            )}
                            <Badge
                              variant={
                                session.status === "completed"
                                  ? "default"
                                  : session.status === "scheduled"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="font-manrope text-xs capitalize"
                            >
                              {session.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card className="mentor-card">
            <CardHeader className="bg-white">
              <CardTitle className="font-bricolage text-lg text-text-main">Recent Sessions Timeline</CardTitle>
              <CardDescription className="font-manrope text-text-muted-custom">
                Last 10 sessions by this mentor
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-white">
              {mentor.recentSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="mb-3 h-10 w-10 text-text-muted-custom/50" />
                  <p className="font-manrope text-text-muted-custom">No sessions yet.</p>
                </div>
              ) : (
                <div className="relative space-y-6 border-gray-200 border-l-2 pl-8">
                  {mentor.recentSessions.map((session) => {
                    const sessionDate = new Date(session.startsAt);
                    const isSessionPast = isPast(sessionDate);

                    const dotColor =
                      session.status === "completed"
                        ? "border-green-500 bg-green-500"
                        : session.status === "scheduled" && isSessionPast
                          ? "border-orange-500 bg-orange-500"
                          : session.status === "scheduled"
                            ? "border-blue-500 bg-blue-500"
                            : session.status === "missed"
                              ? "border-red-500 bg-red-500"
                              : "border-gray-400 bg-gray-400";

                    return (
                      <div key={session.id} className="relative">
                        <div className={cn("absolute -left-[33px] h-4 w-4 rounded-full border-2", dotColor)} />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-manrope font-semibold text-text-main">
                              {session.studentName || "Group Session"} (
                              {session.type === "one_on_one" ? "1-on-1" : "Group"})
                            </p>
                            <div className="flex flex-wrap gap-x-3 font-manrope text-sm text-text-muted-custom">
                              <span>
                                Week {session.week} • {format(sessionDate, "MMM d, yyyy • HH:mm")}
                              </span>
                            </div>
                            <p className="font-manrope text-text-muted-custom text-xs">
                              {session.programName} • {session.batchName}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {session.meetingLink && (
                              <a href={session.meetingLink} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline" className="rounded-full">
                                  <Video className="h-3 w-3" />
                                </Button>
                              </a>
                            )}
                            <Badge
                              variant={
                                session.status === "completed"
                                  ? "default"
                                  : session.status === "scheduled"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="font-manrope text-xs capitalize"
                            >
                              {session.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches">
          <Card className="mentor-card">
            <CardHeader className="bg-white">
              <CardTitle className="font-bricolage text-lg text-text-main">Assigned Batches</CardTitle>
              <CardDescription className="font-manrope text-text-muted-custom">
                Batches this mentor is assigned to
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-white">
              {mentor.assignedBatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GraduationCap className="mb-3 h-10 w-10 text-text-muted-custom/50" />
                  <p className="font-manrope text-text-muted-custom">No batches assigned.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mentor.assignedBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:bg-gray-100/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-manrope font-semibold text-text-main">{batch.name}</p>
                        <p className="font-manrope text-sm text-text-muted-custom">{batch.programName}</p>
                        <p className="font-manrope text-text-muted-custom text-xs">
                          Assigned on {format(new Date(batch.assignedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="badge-mentor shrink-0 self-start font-manrope">
                        <GraduationCap className="mr-1 h-3 w-3" />
                        Batch
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
