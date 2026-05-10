"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { type Resolver, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const createSessionSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  studentId: z.string().min(1, "Student is required"),
  week: z.coerce.number().min(1),
  startsAt: z.string().min(1, "Date and time is required"),
  durationMinutes: z.coerce.number().min(15),
  meetingLink: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type CreateSessionFormValues = z.infer<typeof createSessionSchema>;

interface SessionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatchId?: string | null;
  defaultDate?: Date | null;
}

export function SessionCreateDialog({ open, onOpenChange, defaultBatchId, defaultDate }: SessionCreateDialogProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(defaultBatchId || undefined);
  const queryClient = useQueryClient();

  const { data: batches } = useQuery({
    ...orpc.programs.myBatches.queryOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const selectedBatch = batches?.find((b) => b.id === selectedBatchId);

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    ...orpc.programActivities.mentor.getBatchStudents.queryOptions({
      input: { batchId: selectedBatchId! },
      enabled: !!selectedBatchId,
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: existingSessions } = useQuery({
    ...orpc.programActivities.session.list.queryOptions({
      input: { batchId: selectedBatchId! },
      enabled: !!selectedBatchId,
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema) as unknown as Resolver<CreateSessionFormValues>,
    defaultValues: {
      batchId: defaultBatchId || "",
      studentId: "",
      week: 1,
      startsAt: defaultDate ? defaultDate.toISOString().slice(0, 16) : "",
      durationMinutes: 60,
      meetingLink: "",
      notes: "",
    },
  });

  // Reset form when defaultDate changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on open/date change
  useState(() => {
    if (open && defaultDate) {
      form.setValue("startsAt", defaultDate.toISOString().slice(0, 16));
    }
  });

  const mutation = useMutation(
    orpc.programActivities.mentor.createOneOnOne.mutationOptions({
      onSuccess: () => {
        toast.success("Session created");
        onOpenChange(false);
        form.reset();
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.session.mySessions.key(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const checkCollision = (week: number, studentId?: string) => {
    if (!existingSessions || !studentId) return false;
    return existingSessions.some(
      (s) => s.week === week && s.studentId === studentId && s.type === "one_on_one" && s.status !== "cancelled",
    );
  };

  const onSubmit: SubmitHandler<CreateSessionFormValues> = (values) => {
    mutation.mutate({
      ...values,
      startsAt: new Date(values.startsAt).toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mentor-section sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-bold font-bricolage text-brand-navy text-xl">Create 1-on-1 Session</DialogTitle>
          <DialogDescription className="font-manrope text-text-muted-custom">
            Schedule a new 1-on-1 mentoring session.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-rows-2">
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedBatchId(value || undefined);
                        form.setValue("studentId", ""); // Reset student when batch changes
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-gray-200 text-text-main">
                          {field.value && batches ? (
                            <span className="font-medium text-text-main">
                              {(() => {
                                const b = batches.find((x) => x.id === field.value);
                                return b ? `${b.name} (${b.program?.name || ""})` : field.value;
                              })()}
                            </span>
                          ) : (
                            <span className="text-text-muted-custom">Select batch</span>
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {batches?.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.name} ({batch.program?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!selectedBatchId || isLoadingStudents}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-gray-200 text-text-main">
                          {field.value && students ? (
                            <span className="font-medium text-text-main">
                              {(() => {
                                const s = students.find((x) => x.id === field.value);
                                return s ? `${s.name} (${s.email || ""})` : field.value;
                              })()}
                            </span>
                          ) : (
                            <span className="text-text-muted-custom">
                              {isLoadingStudents ? "Loading students..." : "Select student"}
                            </span>
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students?.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} ({student.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="week"
                render={({ field }) => {
                  const currentStudentId = form.watch("studentId");
                  const isCollision = checkCollision(Number(field.value), currentStudentId);

                  return (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value?.toString()}
                        disabled={!selectedBatchId}
                      >
                        <FormControl>
                          <SelectTrigger
                            className={cn(
                              "rounded-xl border-gray-200 text-text-main",
                              isCollision ? "!border-red-400 !text-red-600" : "",
                            )}
                          >
                            {field.value ? (
                              <span className="font-medium text-text-main">Week {field.value}</span>
                            ) : (
                              <span className="text-text-muted-custom">Select week</span>
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({
                            length: selectedBatch?.durationWeeks || 20,
                          }).map((_, i) => {
                            const weekNum = i + 1;
                            const isTaken = checkCollision(weekNum, currentStudentId);
                            return (
                              <SelectItem
                                key={weekNum}
                                value={weekNum.toString()}
                                disabled={isTaken}
                                className={isTaken ? "text-text-muted-custom line-through" : ""}
                              >
                                Week {weekNum} {isTaken ? "(Scheduled)" : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {isCollision && (
                        <p className="mt-1 text-red-500 text-sm">⚠️ Session already scheduled for this week</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={15} step={15} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
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
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." className="text-text-main" {...field} />
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
                      <Textarea placeholder="Session agenda or notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-gray-200"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="btn-mentor rounded-xl">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Session
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
