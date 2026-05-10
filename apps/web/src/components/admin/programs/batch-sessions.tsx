"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes, format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Link as LinkIcon,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash,
  User,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
  DropdownMenuGroup,
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
}: {
  batch: { id: string; name: string; durationWeeks: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [editingSession, setEditingSession] = useState<({ id: string } & SessionFormValues) | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const queryClient = useQueryClient();

  // Queries
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    ...orpc.programActivities.session.list.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const [activeTab, setActiveTab] = useState("table");
  const [viewingSession, setViewingSession] = useState<CalendarSession | null>(null);

  const { data: mentors } = useQuery({
    ...orpc.programs.admin.batches.getMentors.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: attendanceData } = useQuery({
    ...orpc.programs.admin.batches.attendance.list.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
  const participants = attendanceData?.participants || [];

  // Filtering & Sorting State
  const [filterWeek, setFilterWeek] = useState<string | null>("all");
  const [filterType, setFilterType] = useState<string | null>("all");
  const [filterStatus, setFilterStatus] = useState<string | null>("all");
  const [filterMentorId, setFilterMentorId] = useState<string | null>("all");
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
    if (filterMentorId !== "all") {
      result = result.filter((s) => s.mentorId === filterMentorId);
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
  }, [sessions, filterWeek, filterType, filterStatus, filterMentorId, sortBy]);

  const clearFilters = () => {
    setFilterWeek("all");
    setFilterType("all");
    setFilterStatus("all");
    setFilterMentorId("all");
    setSortBy("date_asc");
  };

  // Mutations
  const upsertMutation = useMutation(
    orpc.programActivities.session.upsert.mutationOptions({
      onSuccess: () => {
        toast.success(editingSession ? "Session updated" : "Session created");
        setIsFormOpen(false);
        setEditingSession(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.session.list.key({
            input: { batchId: batch.id },
          }),
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
          queryKey: orpc.programActivities.session.list.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const form = useForm<SessionFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(sessionSchema) as any,
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
    // Convert WIB (UTC+7) datetime-local value to ISO string with offset
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
    const formattedSession = {
      ...session,
      startsAt: new Date(session.startsAt).toISOString().slice(0, 16), // Format for datetime-local
      studentId: session.studentId || undefined,
      meetingLink: session.meetingLink || "",
      recordingLink: session.recordingLink || "",
      notes: session.notes || "",
    };
    setEditingSession(formattedSession);
    form.reset(formattedSession);
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

  const checkCollision = (week: number, type: "one_on_one" | "group_mentoring", studentId?: string) => {
    if (!sessions) return false;

    // If editing, exclude current session
    const currentSessionId = editingSession?.id;

    return sessions.some((s) => {
      if (s.id === currentSessionId) return false; // Ignore self
      if (s.status === "cancelled") return false;
      if (s.week !== week) return false;

      // Logic from backend:
      // 1. One-on-one: Unique per student per week
      if (type === "one_on_one") {
        // Collision if existing session is 1-on-1 AND for same student
        return s.type === "one_on_one" && s.studentId === studentId;
      }

      // 2. Group Mentoring: Unique per batch per week
      if (type === "group_mentoring") {
        // Collision if existing session is group_mentoring
        return s.type === "group_mentoring";
      }

      return false;
    });
  };

  if (viewingSession) {
    const start = new Date(viewingSession.startsAt);
    const end = addMinutes(start, viewingSession.durationMinutes);

    return (
      <Dialog open={true} onOpenChange={(open) => !open && setViewingSession(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
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
                <span className="font-medium">{format(start, "MMM d, yyyy")}</span>
              </div>
              <div>
                <span className="mb-1 block text-muted-foreground">Time</span>
                <span className="font-medium">
                  {format(start, "HH:mm")} - {format(end, "HH:mm")} WIB
                </span>
              </div>
              <div>
                <span className="mb-1 block text-muted-foreground">Duration</span>
                <span className="font-medium">{viewingSession.durationMinutes} mins</span>
              </div>
              <div className="col-span-2">
                <span className="mb-1 block text-muted-foreground">Mentor</span>
                <span className="font-medium">{viewingSession.mentor?.name}</span>
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
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this session?")) {
                    deleteMutation.mutate({ id: viewingSession.id });
                    setViewingSession(null);
                  }
                }}
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </Button>
              <Button
                onClick={() => {
                  handleEdit(viewingSession);
                  setViewingSession(null);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isFormOpen) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "Create Session"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Update session details." : "Schedule a new session for this batch."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="week"
                  render={({ field }) => {
                    const currentType = form.watch("type");
                    const currentStudentId = form.watch("studentId");
                    const isCollision = checkCollision(Number(field.value), currentType, currentStudentId);

                    return (
                      <FormItem>
                        <FormLabel>Week</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className={isCollision ? "border-destructive text-destructive" : ""}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({
                              length: batch.durationWeeks || 20,
                            }).map((_, i) => {
                              const weekNum = i + 1;
                              const isTaken = checkCollision(weekNum, currentType, currentStudentId);
                              return (
                                <SelectItem
                                  key={weekNum}
                                  value={weekNum.toString()}
                                  className={isTaken ? "text-muted-foreground line-through" : ""}
                                >
                                  Week {weekNum} {isTaken ? "(Scheduled)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {isCollision && (
                          <p className="mt-1 text-destructive text-sm">⚠️ Session already scheduled for this week</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="group_mentoring">Group Mentoring</SelectItem>
                          <SelectItem value="one_on_one">1-on-1</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date & Time <span className="font-normal text-muted-foreground">(WIB)</span>
                      </FormLabel>
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
                      <FormLabel>Duration (min)</FormLabel>
                      <FormControl>
                        <Input type="number" min={15} step={15} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="mentorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mentor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            {field.value ? (
                              <span className="font-medium text-sm">
                                {mentors?.find((m) => m.id === field.value)?.name || field.value}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Select mentor</span>
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mentors?.map((mentor) => (
                            <SelectItem key={mentor.id} value={mentor.id}>
                              {mentor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("type") === "one_on_one" && (
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              {field.value ? (
                                <span className="font-medium text-sm">
                                  {participants?.find((p) => p.id === field.value)?.name || field.value}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Select student</span>
                              )}
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {participants?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-7xl flex-col sm:h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>Sessions: {batch.name}</DialogTitle>
              <DialogDescription>Manage schedule for 1-on-1s and group mentoring.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
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
            <Button onClick={() => handleCreate()}>
              <Plus className="mr-2 h-4 w-4" /> Add Session
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                {Array.from({ length: batch.durationWeeks || 20 }).map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Week {i + 1}
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

            <Select value={filterMentorId} onValueChange={setFilterMentorId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mentors</SelectItem>
                {mentors?.map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </SelectItem>
                ))}
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

            {(filterWeek !== "all" ||
              filterType !== "all" ||
              filterStatus !== "all" ||
              filterMentorId !== "all" ||
              sortBy !== "date_asc") && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10" title="Clear filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="table" className="mt-0 h-full">
              <div className="overflow-x-auto rounded-md border">
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
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
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
                              <span className="font-medium">
                                {format(new Date(session.startsAt), "MMM d, h:mm a")} WIB
                              </span>
                              <span className="text-muted-foreground text-xs">{session.durationMinutes} min</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {session.type === "one_on_one" ? (
                                <User className="mr-2 h-4 w-4 text-blue-500" />
                              ) : (
                                <Users className="mr-2 h-4 w-4 text-green-500" />
                              )}
                              <span className="capitalize">{session.type.replace(/_/g, " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell>{session.mentor.name}</TableCell>
                          <TableCell>{session.student?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuGroup>
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
                                        <LinkIcon className="mr-2 h-4 w-4" /> Join Meeting
                                      </a>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      if (confirm("Are you sure?")) {
                                        deleteMutation.mutate({
                                          id: session.id,
                                        });
                                      }
                                    }}
                                  >
                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenuGroup>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="calendar" className="mt-0 h-full">
              <BatchSessionsCalendar
                sessions={filteredSessions}
                onEditSession={setViewingSession}
                onDateClick={handleCreate}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
