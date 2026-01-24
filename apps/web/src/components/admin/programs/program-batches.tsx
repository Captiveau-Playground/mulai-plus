"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, MoreHorizontal, Pencil, Plus, Trash, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

function BatchAttendanceDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: { id: string; durationWeeks: number; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery(
    orpc.programs.admin.batches.attendance.list.queryOptions({
      input: { batchId: batch.id },
    }),
  );

  const [updates, setUpdates] = useState<Record<string, { status: "present" | "absent" | "excused"; notes?: string }>>(
    {},
  );

  const mutation = useMutation(
    orpc.programs.admin.batches.attendance.update.mutationOptions({
      onSuccess: () => {
        toast.success("Attendance updated");
        onOpenChange(false);
        setUpdates({});
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleSave = () => {
    const updateList = Object.entries(updates).map(([key, value]) => {
      const [userId, weekStr] = key.split("-");
      return {
        userId,
        week: Number.parseInt(weekStr, 10),
        status: value.status,
        notes: value.notes,
      };
    });
    mutation.mutate({ batchId: batch.id, updates: updateList });
  };

  const getStatus = (userId: string, week: number) => {
    if (updates[`${userId}-${week}`]) {
      return updates[`${userId}-${week}`].status;
    }
    const existing = data?.attendance.find((a) => a.userId === userId && a.week === week);
    return existing?.status || "";
  };

  const weeks = Array.from({ length: batch.durationWeeks }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl">
        <DialogHeader>
          <DialogTitle>Batch Attendance: {batch.name}</DialogTitle>
          <DialogDescription>
            Track weekly attendance for accepted participants ({batch.durationWeeks} weeks).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <ScrollArea className="h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 w-[200px] min-w-[200px] bg-background">Student</TableHead>
                    {weeks.map((week) => (
                      <TableHead key={week} className="min-w-[120px]">
                        Week {week}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.participants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={weeks.length + 1} className="h-24 text-center">
                        No accepted participants found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.participants.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium">{student.name}</TableCell>
                        {weeks.map((week) => (
                          <TableCell key={week}>
                            <Select
                              value={getStatus(student.id, week)}
                              onValueChange={(val) => {
                                setUpdates((prev) => ({
                                  ...prev,
                                  [`${student.id}-${week}`]: {
                                    status: val as "present" | "absent" | "excused",
                                  },
                                }));
                              }}
                            >
                              <SelectTrigger className="h-8 w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="excused">Excused</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchMentorsDialog({
  batchId,
  open,
  onOpenChange,
}: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const _queryClient = useQueryClient();
  const { data: allMentors } = useQuery(orpc.lms.mentors.list.queryOptions());
  const { data: batchMentors, isLoading } = useQuery(
    orpc.programs.admin.batches.getMentors.queryOptions({ input: { batchId } }),
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (batchMentors) {
      setSelectedIds(batchMentors.map((m) => m.id));
    }
  }, [batchMentors]);

  const mutation = useMutation(
    orpc.programs.admin.batches.assignMentors.mutationOptions({
      onSuccess: () => {
        toast.success("Mentors updated");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleSave = () => {
    mutation.mutate({ batchId, userIds: selectedIds });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Batch Mentors</DialogTitle>
          <DialogDescription>Select mentors for this batch.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {allMentors?.map((mentor) => (
                  <div key={mentor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={mentor.id}
                      checked={selectedIds.includes(mentor.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds([...selectedIds, mentor.id]);
                        else setSelectedIds(selectedIds.filter((id) => id !== mentor.id));
                      }}
                    />
                    <Label htmlFor={mentor.id} className="flex cursor-pointer flex-col">
                      <span className="font-medium">{mentor.name}</span>
                      <span className="text-muted-foreground text-xs">{mentor.email}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchTimelineDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: {
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    registrationStartDate: Date | string;
    registrationEndDate: Date | string;
    verificationStartDate?: Date | string | null;
    verificationEndDate?: Date | string | null;
    assessmentStartDate?: Date | string | null;
    assessmentEndDate?: Date | string | null;
    announcementDate?: Date | string | null;
    onboardingDate?: Date | string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const events = [
    {
      label: "Registration Start",
      date: batch.registrationStartDate,
      color: "bg-blue-500",
    },
    {
      label: "Registration End",
      date: batch.registrationEndDate,
      color: "bg-blue-500",
    },
    {
      label: "Verification Start",
      date: batch.verificationStartDate,
      color: "bg-yellow-500",
    },
    {
      label: "Verification End",
      date: batch.verificationEndDate,
      color: "bg-yellow-500",
    },
    {
      label: "Assessment Start",
      date: batch.assessmentStartDate,
      color: "bg-orange-500",
    },
    {
      label: "Assessment End",
      date: batch.assessmentEndDate,
      color: "bg-orange-500",
    },
    {
      label: "Announcement",
      date: batch.announcementDate,
      color: "bg-green-500",
    },
    {
      label: "Onboarding",
      date: batch.onboardingDate,
      color: "bg-purple-500",
    },
    {
      label: "Program Start",
      date: batch.startDate,
      color: "bg-emerald-500",
    },
    {
      label: "Program End",
      date: batch.endDate,
      color: "bg-emerald-500",
    },
  ]
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Timeline: {batch.name}</DialogTitle>
          <DialogDescription>Chronological sequence of events for this batch.</DialogDescription>
        </DialogHeader>
        <div className="relative ml-4 space-y-6 border-muted border-l py-4 pl-6">
          {events.map((event, index) => (
            <div key={index} className="relative">
              <span
                className={`absolute -left-[31px] flex h-4 w-4 rounded-full ${event.color} ring-4 ring-background`}
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{event.label}</span>
                <span className="text-muted-foreground text-sm">
                  {format(new Date(event.date!), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const batchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  registrationStartDate: z.string().min(1, "Registration start date is required"),
  registrationEndDate: z.string().min(1, "Registration end date is required"),
  verificationStartDate: z.string().optional(),
  verificationEndDate: z.string().optional(),
  assessmentStartDate: z.string().optional(),
  assessmentEndDate: z.string().optional(),
  announcementDate: z.string().optional(),
  onboardingDate: z.string().optional(),
  quota: z.coerce.number().min(0).default(0),
  durationWeeks: z.coerce.number().min(0).default(0),
  status: z.enum(["upcoming", "open", "closed", "running", "completed"] as const),
});

type BatchFormValues = z.infer<typeof batchSchema>;

export function ProgramBatches({ programId }: { programId: string }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    registrationStartDate: string;
    registrationEndDate: string;
    verificationStartDate?: string | null;
    verificationEndDate?: string | null;
    assessmentStartDate?: string | null;
    assessmentEndDate?: string | null;
    announcementDate?: string | null;
    onboardingDate?: string | null;
    quota: number;
    durationWeeks: number;
    status: "upcoming" | "open" | "closed" | "running" | "completed";
  } | null>(null);
  const [mentorBatchId, setMentorBatchId] = useState<string | null>(null);
  const [attendanceBatch, setAttendanceBatch] = useState<{
    id: string;
    name: string;
    durationWeeks: number;
  } | null>(null);
  const [timelineBatch, setTimelineBatch] = useState<{
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    registrationStartDate: Date | string;
    registrationEndDate: Date | string;
    verificationStartDate?: Date | string | null;
    verificationEndDate?: Date | string | null;
    assessmentStartDate?: Date | string | null;
    assessmentEndDate?: Date | string | null;
    announcementDate?: Date | string | null;
    onboardingDate?: Date | string | null;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(orpc.programs.admin.batches.list.queryOptions({ input: { programId } }));
  const batches = data || [];

  const createMutation = useMutation(
    orpc.programs.admin.batches.create.mutationOptions({
      onSuccess: () => {
        toast.success("Batch created");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.batches.list.key({
            input: { programId },
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.programs.admin.batches.update.mutationOptions({
      onSuccess: () => {
        toast.success("Batch updated");
        setEditingBatch(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.batches.list.key({
            input: { programId },
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.programs.admin.batches.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Batch deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.batches.list.key({
            input: { programId },
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<BatchFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(batchSchema) as any,
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      registrationStartDate: "",
      registrationEndDate: "",
      quota: 0,
      durationWeeks: 0,
      status: "upcoming",
    },
  });

  const onSubmit = (values: BatchFormValues) => {
    createMutation.mutate({
      programId,
      ...values,
    });
  };

  const onUpdate = (values: BatchFormValues) => {
    if (!editingBatch) return;
    updateMutation.mutate({
      id: editingBatch.id,
      ...values,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-lg">Batches</h3>
          <p className="text-muted-foreground text-sm">Manage batches for this program.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Batch
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No batches found.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{format(new Date(batch.startDate), "MMM d, yyyy")}</span>
                      <span className="text-muted-foreground text-xs">
                        to {format(new Date(batch.endDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{format(new Date(batch.registrationStartDate), "MMM d")}</span>
                      <span className="text-muted-foreground text-xs">
                        to {format(new Date(batch.registrationEndDate), "MMM d")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{batch.quota}</TableCell>
                  <TableCell>{batch.durationWeeks} Weeks</TableCell>
                  <TableCell>
                    <Badge variant={batch.status === "open" ? "default" : "secondary"}>{batch.status}</Badge>
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
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setMentorBatchId(batch.id)}>
                            <Users className="mr-2 h-4 w-4" /> Manage Mentors
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setAttendanceBatch({
                                id: batch.id,
                                name: batch.name,
                                durationWeeks: batch.durationWeeks,
                              })
                            }
                          >
                            <Calendar className="mr-2 h-4 w-4" /> Attendance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTimelineBatch(batch)}>
                            <Clock className="mr-2 h-4 w-4" /> Timeline
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setEditingBatch({
                                id: batch.id,
                                name: batch.name,
                                startDate: new Date(batch.startDate).toISOString().split("T")[0],
                                endDate: new Date(batch.endDate).toISOString().split("T")[0],
                                registrationStartDate: new Date(batch.registrationStartDate)
                                  .toISOString()
                                  .split("T")[0],
                                registrationEndDate: new Date(batch.registrationEndDate).toISOString().split("T")[0],
                                verificationStartDate: batch.verificationStartDate
                                  ? new Date(batch.verificationStartDate).toISOString().split("T")[0]
                                  : "",
                                verificationEndDate: batch.verificationEndDate
                                  ? new Date(batch.verificationEndDate).toISOString().split("T")[0]
                                  : "",
                                assessmentStartDate: batch.assessmentStartDate
                                  ? new Date(batch.assessmentStartDate).toISOString().split("T")[0]
                                  : "",
                                assessmentEndDate: batch.assessmentEndDate
                                  ? new Date(batch.assessmentEndDate).toISOString().split("T")[0]
                                  : "",
                                announcementDate: batch.announcementDate
                                  ? new Date(batch.announcementDate).toISOString().split("T")[0]
                                  : "",
                                onboardingDate: batch.onboardingDate
                                  ? new Date(batch.onboardingDate).toISOString().split("T")[0]
                                  : "",
                                quota: batch.quota,
                                durationWeeks: batch.durationWeeks,
                                status: batch.status as "upcoming" | "open" | "closed" | "running" | "completed",
                              })
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm("Are you sure?")) {
                                deleteMutation.mutate({ id: batch.id });
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Batch</DialogTitle>
            <DialogDescription>Add a new batch to this program.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Batch Name (e.g. Batch 1)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reg. Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reg. End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="verificationStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verif. Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="verificationEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verif. End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assessmentStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assess. Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assessmentEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assess. End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="announcementDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Announcement</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="onboardingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onboarding</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quota</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationWeeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Weeks)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {editingBatch && (
        <EditBatchDialog
          batch={editingBatch}
          open={!!editingBatch}
          onOpenChange={(open) => !open && setEditingBatch(null)}
          onSubmit={onUpdate}
          isPending={updateMutation.isPending}
        />
      )}

      {mentorBatchId && (
        <BatchMentorsDialog
          batchId={mentorBatchId}
          open={!!mentorBatchId}
          onOpenChange={(open) => !open && setMentorBatchId(null)}
        />
      )}

      {attendanceBatch && (
        <BatchAttendanceDialog
          batch={attendanceBatch}
          open={!!attendanceBatch}
          onOpenChange={(open) => !open && setAttendanceBatch(null)}
        />
      )}

      {timelineBatch && (
        <BatchTimelineDialog
          batch={timelineBatch}
          open={!!timelineBatch}
          onOpenChange={(open) => !open && setTimelineBatch(null)}
        />
      )}
    </div>
  );
}

function EditBatchDialog({
  batch,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  batch: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    registrationStartDate: string;
    registrationEndDate: string;
    verificationStartDate?: string | null;
    verificationEndDate?: string | null;
    assessmentStartDate?: string | null;
    assessmentEndDate?: string | null;
    announcementDate?: string | null;
    onboardingDate?: string | null;
    quota: number;
    durationWeeks: number;
    status: "upcoming" | "open" | "closed" | "running" | "completed";
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BatchFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<BatchFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(batchSchema) as any,
    defaultValues: {
      name: batch.name,
      startDate: batch.startDate,
      endDate: batch.endDate,
      registrationStartDate: batch.registrationStartDate,
      registrationEndDate: batch.registrationEndDate,
      verificationStartDate: batch.verificationStartDate ?? undefined,
      verificationEndDate: batch.verificationEndDate ?? undefined,
      assessmentStartDate: batch.assessmentStartDate ?? undefined,
      assessmentEndDate: batch.assessmentEndDate ?? undefined,
      announcementDate: batch.announcementDate ?? undefined,
      onboardingDate: batch.onboardingDate ?? undefined,
      quota: batch.quota,
      durationWeeks: batch.durationWeeks,
      status: batch.status,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Batch</DialogTitle>
          <DialogDescription>Edit batch details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Batch Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reg. Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reg. End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="verificationStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verif. Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="verificationEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verif. End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assessmentStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assess. Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assessmentEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assess. End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="announcementDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Announcement</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="onboardingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onboarding</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quota</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationWeeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Weeks)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
