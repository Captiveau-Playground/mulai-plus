"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Link as LinkIcon,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";
import { BatchSessionsCalendar, type CalendarSession } from "./batch-sessions-calendar";

const sessionSchema = z.object({
  week: z.coerce.number().min(1, "Week is required"),
  type: z.enum(["one_on_one", "group_mentoring"]),
  status: z.enum(["scheduled", "completed", "cancelled", "missed"]),
  startsAt: z.string().min(1, "Start time is required"),
  durationMinutes: z.coerce.number().min(15).default(60),
  mentorId: z.string().min(1, "Mentor is required"),
  studentId: z.string().optional(),
  meetingLink: z
    .string()
    .url("Must be a valid URL")
    .refine((val) => !val || val.startsWith("https://"), "Meeting link must use HTTPS")
    .optional()
    .or(z.literal("")),
  recordingLink: z
    .string()
    .url("Must be a valid URL")
    .refine((val) => !val || val.startsWith("https://"), "Recording link must use HTTPS")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

export function BatchSessionsDialog({
  batch,
  open,
  onOpenChange,
  embedded,
}: {
  batch: { id: string; name: string; durationWeeks: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}) {
  const [editingSession, setEditingSession] = useState<({ id: string } & SessionFormValues) | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    ...orpc.programActivities.session.list.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 5,
  });

  const [activeTab, setActiveTab] = useState("table");
  const [viewingSession, setViewingSession] = useState<CalendarSession | null>(null);

  const { data: mentors } = useQuery({
    ...orpc.programs.admin.batches.getMentors.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: attendanceData } = useQuery({
    ...orpc.programs.admin.batches.attendance.list.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 1,
  });
  const participants = attendanceData?.participants || [];

  const [filterWeek, setFilterWeek] = useState<string | null>("all");
  const [filterType, setFilterType] = useState<string | null>("all");
  const [filterStatus, setFilterStatus] = useState<string | null>("all");
  const [filterMentorId, setFilterMentorId] = useState<string | null>("all");
  const [sortBy, setSortBy] = useState<string | null>("date_asc");

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    let result = [...sessions];
    if (filterWeek !== "all") result = result.filter((s) => s.week.toString() === filterWeek);
    if (filterType !== "all") result = result.filter((s) => s.type === filterType);
    if (filterStatus !== "all") result = result.filter((s) => s.status === filterStatus);
    if (filterMentorId !== "all") result = result.filter((s) => s.mentorId === filterMentorId);
    result.sort((a, b) => {
      if (sortBy === "date_asc") return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      if (sortBy === "date_desc") return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      if (sortBy === "week_asc") return a.week - b.week;
      if (sortBy === "week_desc") return b.week - a.week;
      return 0;
    });
    return result;
  }, [sessions, filterWeek, filterType, filterStatus, filterMentorId, sortBy]);

  const clearFilters = () => {
    setFilterWeek("all");
    setFilterType("all");
    setFilterStatus("all");
    setFilterMentorId("all");
    setSortBy("date_asc");
  };

  const upsertMutation = useMutation(
    orpc.programActivities.session.upsert.mutationOptions({
      onSuccess: () => {
        toast.success(editingSession ? "Session updated" : "Session created");
        setIsFormOpen(false);
        setEditingSession(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.session.list.key({ input: { batchId: batch.id } }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    orpc.programActivities.session.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Session deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.session.list.key({ input: { batchId: batch.id } }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const form = useForm<SessionFormValues>({
    resolver: standardSchemaResolver(sessionSchema) as any,
    defaultValues: {
      week: 1,
      type: "group_mentoring",
      status: "scheduled",
      startsAt: "",
      durationMinutes: 60,
      mentorId: "",
      meetingLink: "",
      notes: "",
    },
  });

  const onSubmit = (values: SessionFormValues) => {
    const startsAtWIB = values.startsAt ? `${values.startsAt}:00+07:00` : values.startsAt;
    upsertMutation.mutate({
      id: editingSession?.id,
      batchId: batch.id,
      ...values,
      startsAt: startsAtWIB,
      studentId: values.type === "one_on_one" ? values.studentId : undefined,
    });
  };

  const handleEdit = (session: CalendarSession) => {
    setEditingSession({
      ...session,
      startsAt: new Date(session.startsAt).toISOString().slice(0, 16),
      studentId: session.studentId || undefined,
      meetingLink: session.meetingLink || "",
      recordingLink: session.recordingLink || "",
      notes: session.notes || "",
    });
    form.reset({
      ...session,
      startsAt: new Date(session.startsAt).toISOString().slice(0, 16),
      studentId: session.studentId || undefined,
      meetingLink: session.meetingLink || "",
      recordingLink: session.recordingLink || "",
      notes: session.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleCreate = (date?: Date) => {
    setEditingSession(null);
    form.reset({
      week: 1,
      type: "group_mentoring",
      status: "scheduled",
      startsAt: date ? format(date, "yyyy-MM-dd'T'HH:mm") : "",
      durationMinutes: 60,
      mentorId: "",
      meetingLink: "",
      notes: "",
    });
    setIsFormOpen(true);
  };

  // Viewing session dialog
  if (viewingSession) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && setViewingSession(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p>
              Week {viewingSession.week} - {viewingSession.type.replace("_", " ")}
            </p>
            <p>{format(new Date(viewingSession.startsAt), "MMM d, yyyy • h:mm a")}</p>
            <Badge>{viewingSession.status}</Badge>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingSession(null)} className="rounded-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Create/Edit form dialog
  if (isFormOpen) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "Create Session"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Update session details." : "Schedule a new session."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={batch.durationWeeks} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_on_one">1-on-1</SelectItem>
                          <SelectItem value="group_mentoring">Group Mentoring</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time (WIB)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min={15} step={15} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mentorId"
                  render={({ field }) => {
                    const mentorName = (mentors || []).find((m: any) => m.id === field.value)?.name || field.value;
                    return (
                      <FormItem>
                        <FormLabel>Mentor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <span className="truncate">{field.value ? mentorName : "Select mentor"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {(mentors || []).map((m: any) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name || m.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                {form.watch("type") === "one_on_one" && (
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => {
                      const studentName =
                        (participants || []).find((p: any) => p.id === field.value)?.name || field.value;
                      return (
                        <FormItem>
                          <FormLabel>Student</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <SelectTrigger>
                              <span className="truncate">{field.value ? studentName : "Select student"}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {(participants || []).map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}
                <FormField
                  control={form.control}
                  name="meetingLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://meet.google.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)} className="rounded-full">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="!rounded-full !bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !border-0"
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSession ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Main content — shared for both embedded and dialog mode
  const mainContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <Button
          onClick={() => handleCreate()}
          className="!rounded-full !bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !border-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Session
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">Week</p>
          <Select value={filterWeek} onValueChange={setFilterWeek}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {Array.from({ length: batch.durationWeeks }, (_, i) => i + 1).map((w) => (
                <SelectItem key={w} value={w.toString()}>
                  Week {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">Type</p>
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
        </div>
        <div className="space-y-1">
          <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">
            Status
          </p>
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
        </div>
        <div className="space-y-1">
          <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">
            Mentor
          </p>
          <Select value={filterMentorId} onValueChange={setFilterMentorId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mentors</SelectItem>
              {(mentors || []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">Sort</p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_asc">Date (Oldest)</SelectItem>
              <SelectItem value="date_desc">Date (Newest)</SelectItem>
              <SelectItem value="week_asc">Week (Asc)</SelectItem>
              <SelectItem value="week_desc">Week (Desc)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filterWeek !== "all" ||
          filterType !== "all" ||
          filterStatus !== "all" ||
          filterMentorId !== "all" ||
          sortBy !== "date_asc") && (
          <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <TabsContent value="table" className="mt-0 flex-1">
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSessions ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-mentor-teal" />
                  </TableCell>
                </TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No sessions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>Week {session.week}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{format(new Date(session.startsAt), "MMM d, h:mm a")} WIB</span>
                        <span className="text-muted-foreground text-xs">{session.durationMinutes} min</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {session.type === "one_on_one" ? (
                          <User className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Users className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-xs capitalize">{session.type.replace(/_/g, " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{session.mentor.name}</TableCell>
                    <TableCell className="text-sm">{session.student?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(session)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {session.meetingLink && (
                            <DropdownMenuItem>
                              <a href={session.meetingLink} target="_blank" rel="noreferrer">
                                <LinkIcon className="mr-2 h-4 w-4" /> Join
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirmId(session.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="calendar" className="mt-0 flex-1">
        <BatchSessionsCalendar
          sessions={filteredSessions}
          onEditSession={setViewingSession}
          onDateClick={handleCreate}
        />
      </TabsContent>
    </Tabs>
  );

  const deleteAlert = (
    <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-red-100">
            <TriangleAlert className="h-5 w-5 text-red-600" />
          </div>
          <AlertDialogTitle>Delete Session</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this session? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteConfirmId) deleteMutation.mutate({ id: deleteConfirmId });
              setDeleteConfirmId(null);
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (embedded) {
    return (
      <>
        {mainContent}
        {deleteAlert}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-7xl flex-col sm:h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sessions: {batch.name}</DialogTitle>
          <DialogDescription>Manage schedule for 1-on-1s and group mentoring.</DialogDescription>
        </DialogHeader>
        {mainContent}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      {deleteAlert}
    </Dialog>
  );
}
