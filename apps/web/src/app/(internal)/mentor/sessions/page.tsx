"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes, format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Link as LinkIcon,
  List,
  Loader2,
  Pencil,
  Plus,
  Trash,
  Trash2,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { BatchSessionsCalendar, type CalendarSession } from "@/components/admin/programs/batch-sessions-calendar";
import { SessionCreateDialog } from "@/components/mentor/sessions/session-create-dialog";
import { SessionUpdateDialog } from "@/components/mentor/sessions/session-update-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageState } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorSessionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MentorSessionsContent />
    </Suspense>
  );
}

function MentorSessionsContent() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId");
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useQuery({
    ...orpc.programActivities.session.mySessions.queryOptions({
      input: { batchId: batchId || undefined },
      enabled: !!isAuthorized,
    }),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
  const [editingSession, setEditingSession] = useState<any>(null);
  const [viewingSession, setViewingSession] = useState<CalendarSession | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // Filtering & Sorting State
  const [filterWeek, setFilterWeek] = useState<string | null>("all");
  const [filterType, setFilterType] = useState<string | null>("all");
  const [filterStatus, setFilterStatus] = useState<string | null>("all");
  const [sortBy, setSortBy] = useState<string | null>("date_asc");

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    let result = [...sessions];

    // Filter
    if (filterWeek !== "all") {
      result = result.filter((s) => s.week.toString() === filterWeek);
    }
    if (filterType !== "all") {
      result = result.filter((s) => s.type === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "date_asc") {
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      }
      if (sortBy === "date_desc") {
        return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      }
      if (sortBy === "week_asc") {
        return a.week - b.week;
      }
      if (sortBy === "week_desc") {
        return b.week - a.week;
      }
      return 0;
    });

    return result;
  }, [sessions, filterWeek, filterType, filterStatus, sortBy]);

  const clearFilters = () => {
    setFilterWeek("all");
    setFilterType("all");
    setFilterStatus("all");
    setSortBy("date_asc");
  };

  const deleteMutation = useMutation(
    orpc.programActivities.mentor.deleteOneOnOne.mutationOptions({
      onSuccess: () => {
        toast.success("Session deleted");
        setDeleteSessionId(null);
        setViewingSession(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.session.mySessions.key(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleCreate = (date?: Date) => {
    setCreateDate(date);
    setCreateDialogOpen(true);
  };

  const handleEdit = (session: any) => {
    setEditingSession(session);
    setViewingSession(null);
  };

  // Get unique weeks for filter
  const availableWeeks = useMemo(() => {
    if (!sessions) return [];
    const weeks = new Set(sessions.map((s) => s.week));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [sessions]);

  return (
    <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">My Sessions</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Schedule, manage, and track your mentoring sessions.
          </p>
        </div>

        <Tabs defaultValue="table" className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between">
            <TabsList className="rounded-xl bg-white p-1 shadow-sm">
              <TabsTrigger
                value="table"
                className="rounded-lg data-[state=active]:bg-brand-navy data-[state=active]:text-white"
              >
                <List className="mr-2 h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="rounded-lg data-[state=active]:bg-brand-navy data-[state=active]:text-white"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => handleCreate()} className="btn-mentor rounded-full shadow-md hover:shadow-lg">
              <Plus className="mr-2 h-4 w-4" /> Schedule Session
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                {availableWeeks.map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="one_on_one">1-on-1</SelectItem>
                <SelectItem value="group_mentoring">Group Mentoring</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                <SelectItem value="week_asc">Week (Ascending)</SelectItem>
                <SelectItem value="week_desc">Week (Descending)</SelectItem>
              </SelectContent>
            </Select>

            {(filterWeek !== "all" || filterType !== "all" || filterStatus !== "all" || sortBy !== "date_asc") && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10" title="Clear filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <TabsContent value="table" className="mt-0">
              {/* Mini Stats */}
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat value={sessions?.length || 0} label="Total Sessions" color="bg-brand-navy" />
                <MiniStat
                  value={filteredSessions.filter((s) => s.status === "scheduled").length}
                  label="Scheduled"
                  color="bg-mentor-teal"
                />
                <MiniStat
                  value={filteredSessions.filter((s) => s.status === "completed").length}
                  label="Completed"
                  color="bg-brand-orange"
                />
                <MiniStat
                  value={filteredSessions.filter((s) => s.status === "missed").length}
                  label="Missed"
                  color="bg-brand-red"
                />
              </div>
              {/* Table - desktop only */}
              <div className="hidden max-w-full overflow-x-scroll rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Program / Batch</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                              <CalendarIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="font-manrope font-medium text-sm text-text-muted-custom">No sessions found</p>
                            <p className="font-manrope text-text-muted-custom text-xs">
                              Try adjusting your filters or schedule a new session.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSessions.map((session) => (
                        <TableRow key={session.id} className="border-gray-100 transition-colors hover:bg-bg-light">
                          <TableCell>
                            <div className="font-manrope font-medium text-text-main">Week {session.week}</div>
                            <div className="font-manrope text-text-muted-custom text-xs capitalize">
                              {session.type.replace("_", " ")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-manrope font-medium text-text-main">
                              {session.batch?.program?.name}
                            </div>
                            <div className="font-manrope text-text-muted-custom text-xs">{session.batch?.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-3.5 w-3.5 text-text-muted-custom" />
                              <span className="font-manrope text-sm text-text-main">
                                {format(new Date(session.startsAt), "MMM d, yyyy")}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-text-muted-custom" />
                              <span className="font-manrope text-text-muted-custom text-xs">
                                {format(new Date(session.startsAt), "h:mm a")} ({session.durationMinutes} min)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.student ? (
                              <div className="flex items-center gap-2">
                                <span className="font-manrope text-sm text-text-main">{session.student.name}</span>
                              </div>
                            ) : (
                              <span className="font-manrope text-sm text-text-muted-custom">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <SessionStatusBadge status={session.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {session.meetingLink && (
                                <a
                                  href={session.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    buttonVariants({
                                      variant: "ghost",
                                      size: "icon",
                                    }),
                                    "text-mentor-teal hover:bg-mentor-teal/5 hover:text-mentor-teal-dark",
                                  )}
                                >
                                  <Video className="h-4 w-4" />
                                </a>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(session)}
                                className="rounded-lg border-gray-200 text-xs hover:border-mentor-teal/30 hover:bg-mentor-teal/5 hover:text-mentor-teal"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              {session.type === "one_on_one" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-400 hover:bg-red-50 hover:text-red-500"
                                  onClick={() => setDeleteSessionId(session.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Cards - mobile only */}
              <div className="block space-y-3 md:hidden">
                {filteredSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <CalendarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="font-manrope font-medium text-sm text-text-muted-custom">No sessions found</p>
                    <p className="font-manrope text-text-muted-custom text-xs">
                      Try adjusting your filters or schedule a new session.
                    </p>
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      {/* Header: Week + Status */}
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="font-manrope font-medium text-text-main">Week {session.week}</div>
                          <div className="font-manrope text-text-muted-custom text-xs capitalize">
                            {session.type.replace("_", " ")}
                          </div>
                        </div>
                        <SessionStatusBadge status={session.status} />
                      </div>

                      {/* Program / Batch */}
                      <div className="mb-2">
                        <div className="font-manrope font-medium text-sm text-text-main">
                          {session.batch?.program?.name}
                        </div>
                        <div className="font-manrope text-text-muted-custom text-xs">{session.batch?.name}</div>
                      </div>

                      {/* Schedule */}
                      <div className="mb-1 flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-text-muted-custom" />
                        <span className="font-manrope text-sm text-text-main">
                          {format(new Date(session.startsAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted-custom" />
                        <span className="font-manrope text-text-muted-custom text-xs">
                          {format(new Date(session.startsAt), "h:mm a")} ({session.durationMinutes} min)
                        </span>
                      </div>

                      {/* Student */}
                      {session.student && (
                        <div className="mb-1 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0 text-text-muted-custom" />
                          <span className="font-manrope text-sm text-text-main">{session.student.name}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 flex items-center justify-end gap-2 border-gray-100 border-t pt-3">
                        {session.meetingLink && (
                          <a
                            href={session.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                size: "icon",
                              }),
                              "text-mentor-teal hover:bg-mentor-teal/5 hover:text-mentor-teal-dark",
                            )}
                          >
                            <Video className="h-4 w-4" />
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(session)}
                          className="text-accent text-xs hover:border-mentor-teal/30 hover:bg-mentor-teal/5 hover:text-mentor-teal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {session.type === "one_on_one" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() => setDeleteSessionId(session.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="calendar" className="mt-0">
              <BatchSessionsCalendar
                sessions={filteredSessions as unknown as CalendarSession[]}
                onEditSession={setViewingSession}
                onDateClick={handleCreate}
              />
            </TabsContent>
          </div>
        </Tabs>

        {viewingSession && (
          <Dialog open={true} onOpenChange={(open) => !open && setViewingSession(null)}>
            <DialogContent className="mentor-section max-w-md">
              <DialogHeader>
                <DialogTitle className="font-bold font-bricolage text-brand-navy text-xl">Session Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="mb-1 block text-muted-foreground">Week</span>
                    <span className="font-medium">Week {viewingSession.week}</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">
                      {viewingSession.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">Type</span>
                    <div className="flex items-center">
                      {viewingSession.type === "one_on_one" ? (
                        <User className="mr-1 h-3 w-3 text-blue-500" />
                      ) : (
                        <Users className="mr-1 h-3 w-3 text-green-500" />
                      )}
                      <span className="capitalize">{viewingSession.type.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">Date</span>
                    <span className="font-medium">{format(new Date(viewingSession.startsAt), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {format(new Date(viewingSession.startsAt), "HH:mm")} -{" "}
                      {format(addMinutes(new Date(viewingSession.startsAt), viewingSession.durationMinutes), "HH:mm")}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">Duration</span>
                    <span className="font-medium">{viewingSession.durationMinutes} mins</span>
                  </div>
                  <div className="col-span-2">
                    <span className="mb-1 block text-muted-foreground">Mentor</span>
                    <span className="font-medium">{viewingSession.mentor?.name || "Me"}</span>
                  </div>
                  {viewingSession.type === "one_on_one" && (
                    <div className="col-span-2">
                      <span className="mb-1 block text-muted-foreground">Student</span>
                      <span className="font-medium">{viewingSession.student?.name || "-"}</span>
                    </div>
                  )}
                  {viewingSession.meetingLink && (
                    <div className="col-span-2">
                      <span className="mb-1 block text-muted-foreground">Meeting Link</span>
                      <a
                        href={viewingSession.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center text-mentor-teal hover:text-mentor-teal-dark hover:underline"
                      >
                        <LinkIcon className="mr-1 h-3 w-3" />
                        {viewingSession.meetingLink}
                      </a>
                    </div>
                  )}
                  {viewingSession.notes && (
                    <div className="col-span-2">
                      <span className="mb-1 block text-muted-foreground">Notes</span>
                      <p className="whitespace-pre-wrap text-sm">{viewingSession.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  {viewingSession.type === "one_on_one" && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this session?")) {
                          deleteMutation.mutate({ id: viewingSession.id });
                        }
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      handleEdit(viewingSession);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {createDialogOpen && (
          <SessionCreateDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            defaultBatchId={batchId || undefined}
            defaultDate={createDate}
          />
        )}

        {editingSession && (
          <SessionUpdateDialog
            session={editingSession}
            open={!!editingSession}
            onOpenChange={(open) => !open && setEditingSession(null)}
          />
        )}

        <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteSessionId) {
                    deleteMutation.mutate({ id: deleteSessionId });
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageState>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", color)}>
        <span className="font-bold font-bricolage text-sm text-white">{value}</span>
      </div>
      <div>
        <p className="font-manrope font-medium text-text-main text-xs">{value}</p>
        <p className="font-manrope text-text-muted-custom text-xs">{label}</p>
      </div>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    missed: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-lg border px-2.5 py-0.5 font-manrope font-medium text-xs capitalize",
        styles[status] || "border-gray-200 bg-gray-50 text-gray-700",
      )}
    >
      {status}
    </span>
  );
}
