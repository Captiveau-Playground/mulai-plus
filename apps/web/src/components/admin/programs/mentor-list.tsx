"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { Calendar, CheckCircle, Clock, GraduationCap, Loader2, User, Users, Video, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient, isAdmin } from "@/lib/auth-client";
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mentors = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Mentors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{data?.pagination.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{mentors.reduce((sum, m) => sum + m.totalSessions, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Assigned Batches</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{mentors.reduce((sum, m) => sum + m.assignedBatches, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mentor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Batches</TableHead>
              <TableHead>Total Sessions</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mentors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No mentors found.
                </TableCell>
              </TableRow>
            ) : (
              mentors.map((mentor) => (
                <TableRow key={mentor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {mentor.image ? (
                          <Image
                            src={mentor.image}
                            alt={mentor.name || ""}
                            className="h-10 w-10 rounded-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium">{mentor.name || "Unnamed"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mentor.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{mentor.assignedBatches}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{mentor.totalSessions}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={
                        isAdmin(session)
                          ? `/admin/programs/mentors/${mentor.id}`
                          : `/program-manager/programs/mentors/${mentor.id}`
                      }
                      className="text-primary hover:underline"
                    >
                      View Details
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mentor) {
    return <div className="text-center text-muted-foreground">Mentor not found.</div>;
  }

  const { stats } = mentor;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {mentor.image ? (
            <Image
              src={mentor.image}
              alt={mentor.name || ""}
              className="h-16 w-16 rounded-full object-cover"
              width={64}
              height={64}
            />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h2 className="font-bold text-2xl">{mentor.name}</h2>
          <p className="text-muted-foreground">{mentor.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-blue-600">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Missed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">{stats.missed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-gray-500">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assigned Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{mentor.assignedBatches.length}</div>
            <p className="text-muted-foreground text-xs">batches assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{mentor.students.length}</div>
            <p className="text-muted-foreground text-xs">students mentored</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{mentor.recentSessions.length}</div>
            <p className="text-muted-foreground text-xs">last 10 sessions</p>
          </CardContent>
        </Card>
      </div>

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

        <TabsContent value="students" className="space-y-4">
          {mentor.students.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No students with sessions yet.
              </CardContent>
            </Card>
          ) : (
            mentor.students.map((student) => (
              <Card key={student.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {student.image ? (
                          <Image
                            src={student.image}
                            alt={student.name || ""}
                            className="h-10 w-10 rounded-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{student.name || "Unnamed"}</CardTitle>
                        <CardDescription>{student.email}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="px-3 py-1 text-lg">
                      {student.sessionCount} sessions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {student.sessions.map((session) => {
                      const sessionDate = new Date(session.startsAt);
                      const isSessionPast = isPast(sessionDate);
                      const statusColor =
                        session.status === "completed"
                          ? "bg-green-500"
                          : session.status === "scheduled"
                            ? isSessionPast
                              ? "bg-orange-500"
                              : "bg-blue-500"
                            : session.status === "missed"
                              ? "bg-red-500"
                              : "bg-gray-400";
                      const statusIcon =
                        session.status === "completed" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : session.status === "scheduled" ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : session.status === "missed" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        );

                      return (
                        <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                            {statusIcon}
                            <div>
                              <p className="font-medium">
                                Week {session.week} - {session.type === "one_on_one" ? "1-on-1" : "Group"}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {format(sessionDate, "MMM d, yyyy • HH:mm")} ({session.durationMinutes}m)
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {session.programName} • {session.batchName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.meetingLink && (
                              <a href={session.meetingLink} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline">
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

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions Timeline</CardTitle>
              <CardDescription>Last 10 sessions by this mentor</CardDescription>
            </CardHeader>
            <CardContent>
              {mentor.recentSessions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No sessions yet.</p>
              ) : (
                <div className="relative space-y-4 border-muted border-l-2 pl-6">
                  {mentor.recentSessions.map((session) => {
                    const sessionDate = new Date(session.startsAt);
                    const isSessionPast = isPast(sessionDate);

                    return (
                      <div key={session.id} className="relative">
                        <div
                          className={`absolute -left-[31px] h-4 w-4 rounded-full border-2 ${
                            session.status === "completed"
                              ? "border-green-500 bg-green-500"
                              : session.status === "scheduled" && isSessionPast
                                ? "border-orange-500 bg-orange-500"
                                : session.status === "scheduled"
                                  ? "border-blue-500 bg-blue-500"
                                  : session.status === "missed"
                                    ? "border-red-500 bg-red-500"
                                    : "border-gray-400 bg-gray-400"
                          }`}
                        />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {session.studentName || "Group Session"} (
                              {session.type === "one_on_one" ? "1-on-1" : "Group"})
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Week {session.week} • {format(sessionDate, "MMM d, yyyy • HH:mm")}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {session.programName} • {session.batchName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.meetingLink && (
                              <a href={session.meetingLink} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline">
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

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Batches</CardTitle>
              <CardDescription>Batches this mentor is assigned to</CardDescription>
            </CardHeader>
            <CardContent>
              {mentor.assignedBatches.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No batches assigned.</p>
              ) : (
                <div className="space-y-3">
                  {mentor.assignedBatches.map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{batch.name}</p>
                        <p className="text-muted-foreground text-sm">{batch.programName}</p>
                        <p className="text-muted-foreground text-xs">
                          Assigned on {format(new Date(batch.assignedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="secondary">
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
