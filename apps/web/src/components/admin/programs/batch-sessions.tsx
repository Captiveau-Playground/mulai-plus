"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link as LinkIcon, Loader2, MoreHorizontal, Pencil, Plus, Trash, User, Users } from "lucide-react";
import { useState } from "react";
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
import { orpc } from "@/utils/orpc";

const sessionSchema = z.object({
  week: z.coerce.number().min(1, "Week is required"),
  type: z.enum(["one_on_one", "group_mentoring"]),
  status: z.enum(["scheduled", "completed", "cancelled", "missed"]),
  startsAt: z.string().min(1, "Start time is required"),
  durationMinutes: z.coerce.number().min(15).default(60),
  mentorId: z.string().min(1, "Mentor is required"),
  studentId: z.string().optional(),
  meetingLink: z.string().optional(),
  recordingLink: z.string().optional(),
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
  const { data: sessions, isLoading: isLoadingSessions } = useQuery(
    orpc.programActivities.session.list.queryOptions({
      input: { batchId: batch.id },
    }),
  );

  const { data: mentors } = useQuery(
    orpc.programs.admin.batches.getMentors.queryOptions({
      input: { batchId: batch.id },
    }),
  );

  const { data: attendanceData } = useQuery(
    orpc.programs.admin.batches.attendance.list.queryOptions({
      input: { batchId: batch.id },
    }),
  );
  const participants = attendanceData?.participants || [];

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
    upsertMutation.mutate({
      id: editingSession?.id,
      batchId: batch.id,
      ...values,
      studentId: values.type === "one_on_one" ? values.studentId : undefined,
    });
  };

  const handleEdit = (session: any) => {
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

  const handleCreate = () => {
    setEditingSession(null);
    form.reset({
      week: 1,
      type: "group_mentoring",
      status: "scheduled",
      startsAt: "",
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

  if (isFormOpen) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="min-w-7xl">
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "Create Session"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Update session details." : "Schedule a new session for this batch."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mentorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mentor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            {field.value ? (
                              <SelectValue />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              {field.value ? (
                                <SelectValue />
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
      <DialogContent className="min-w-7xl">
        <DialogHeader>
          <DialogTitle>Sessions: {batch.name}</DialogTitle>
          <DialogDescription>Manage schedule for 1-on-1s and group mentoring.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Session
          </Button>
        </div>

        <div className="rounded-md border">
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
              ) : sessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No sessions scheduled.
                  </TableCell>
                </TableRow>
              ) : (
                sessions?.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>Week {session.week}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{format(new Date(session.startsAt), "MMM d, h:mm a")}</span>
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
                                  deleteMutation.mutate({ id: session.id });
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
