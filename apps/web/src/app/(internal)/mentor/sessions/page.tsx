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
  const { data: sessions, isLoading } = useQuery(
    orpc.programActivities.session.mySessions.queryOptions({
      input: { batchId: batchId || undefined },
      enabled: !!isAuthorized,
    }),
  );
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
      <div className="flex flex-1 flex-col gap-4">
        <Tabs defaultValue="table" className="flex flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="table">
                <List className="mr-2 h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => handleCreate()}>
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

          <div className="flex-1">
            <TabsContent value="table" className="mt-0">
              <div className="rounded-md border">
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
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No sessions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="font-medium">Week {session.week}</div>
                            <div className="text-muted-foreground text-xs capitalize">
                              {session.type.replace("_", " ")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{session.batch?.program?.name}</div>
                            <div className="text-muted-foreground text-xs">{session.batch?.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                              <span>{format(new Date(session.startsAt), "PPP")}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(new Date(session.startsAt), "p")} ({session.durationMinutes} min)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.student ? (
                              <div className="flex items-center gap-2">
                                <span>{session.student.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                session.status === "completed"
                                  ? "default"
                                  : session.status === "cancelled" || session.status === "missed"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="capitalize"
                            >
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
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
                                  )}
                                >
                                  <Video className="h-4 w-4" />
                                </a>
                              )}
                              <Button variant="outline" size="sm" onClick={() => handleEdit(session)}>
                                Edit
                              </Button>
                              {session.type === "one_on_one" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Session Details</DialogTitle>
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
                        className="flex items-center text-primary hover:underline"
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
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
