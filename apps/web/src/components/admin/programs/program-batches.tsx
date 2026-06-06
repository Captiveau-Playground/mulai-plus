"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, Loader2, MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { FileUpload } from "@/components/ui/file-upload";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import { BatchAttachmentsDialog } from "./batch-attachments";
import { BatchSessionsDialog } from "./batch-sessions";
import { BatchAttendanceDialog } from "./dialogs/batch-attendance";
import { BatchMentorsDialog } from "./dialogs/batch-mentors";
import { BatchReportTemplateDialog } from "./dialogs/batch-report-template";
import { BatchTimelineDialog } from "./dialogs/batch-timeline";
import { EditBatchDialog } from "./dialogs/edit-batch";
import { MentorMenteeAssignDialog } from "./mentor-mentee-assign";
import { SummaryReportsReview } from "./summary-reports-review";

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
  bannerUrl: z.string().optional(),
  communityLink: z.string().optional(),
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
    bannerUrl?: string | null;
    status: "upcoming" | "open" | "closed" | "running" | "completed";
  } | null>(null);
  const [mentorBatchId, setMentorBatchId] = useState<string | null>(null);
  const [menteeAssignBatch, setMenteeAssignBatch] = useState<{ id: string; name: string } | null>(null);
  const [reportTemplateBatch, setReportTemplateBatch] = useState<{ id: string; name: string } | null>(null);
  const [summaryReportsBatch, setSummaryReportsBatch] = useState<{
    id: string;
    name: string;
    programId: string;
  } | null>(null);
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
  const [sessionsBatch, setSessionsBatch] = useState<{
    id: string;
    name: string;
    durationWeeks: number;
  } | null>(null);
  const [attachmentsBatch, setAttachmentsBatch] = useState<{
    id: string;
    name: string;
    durationWeeks: number;
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
    resolver: standardSchemaResolver(batchSchema) as any,
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      registrationStartDate: "",
      registrationEndDate: "",
      quota: 0,
      durationWeeks: 0,
      bannerUrl: "",
      communityLink: "",
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium text-lg">Batches</h3>
          <p className="text-muted-foreground text-sm">Manage batches for this program.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Batch
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
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
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/programs/${programId}/batches/${batch.id}` as any}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full text-xs")}
                      >
                        Manage
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuGroup>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
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
                                  bannerUrl: batch.bannerUrl,
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
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
              <div className="grid grid-cols-2 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
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
                name="bannerUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image</FormLabel>
                    <FormControl>
                      <FileUpload value={field.value} onChange={field.onChange} bucket="test" path="public" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="communityLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Community Link (WhatsApp)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://chat.whatsapp.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>

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
      {menteeAssignBatch && (
        <MentorMenteeAssignDialog
          batch={menteeAssignBatch}
          programId={programId}
          open={!!menteeAssignBatch}
          onOpenChange={(open) => !open && setMenteeAssignBatch(null)}
        />
      )}
      {reportTemplateBatch && (
        <BatchReportTemplateDialog
          batch={reportTemplateBatch}
          open={!!reportTemplateBatch}
          onOpenChange={(open) => !open && setReportTemplateBatch(null)}
        />
      )}
      {summaryReportsBatch && (
        <SummaryReportsReview
          batch={summaryReportsBatch}
          open={!!summaryReportsBatch}
          onOpenChange={(open) => !open && setSummaryReportsBatch(null)}
        />
      )}
      {sessionsBatch && (
        <BatchSessionsDialog
          batch={sessionsBatch}
          open={!!sessionsBatch}
          onOpenChange={(open) => !open && setSessionsBatch(null)}
        />
      )}
      {attachmentsBatch && (
        <BatchAttachmentsDialog
          batch={attachmentsBatch}
          open={!!attachmentsBatch}
          onOpenChange={(open) => !open && setAttachmentsBatch(null)}
        />
      )}
    </div>
  );
}
