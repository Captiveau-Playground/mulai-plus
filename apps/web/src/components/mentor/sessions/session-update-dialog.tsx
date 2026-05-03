"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { orpc } from "@/utils/orpc";

const sessionSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "missed"]),
  meetingLink: z.string().optional(),
  recordingLink: z.string().optional(),
  notes: z.string().optional(),
  startsAt: z.string().min(1, "Date and time is required"),
  durationMinutes: z.coerce.number().min(15, "Duration must be at least 15 minutes"),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionUpdateDialogProps {
  session: {
    id: string;
    batchId: string;
    mentorId: string;
    week: number;
    type: "one_on_one" | "group_mentoring" | string;
    startsAt: string | Date;
    durationMinutes: number;
    studentId?: string | null;
    status: "scheduled" | "completed" | "cancelled" | "missed" | string;
    meetingLink?: string | null;
    recordingLink?: string | null;
    notes?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionUpdateDialog({ session, open, onOpenChange }: SessionUpdateDialogProps) {
  const queryClient = useQueryClient();
  const isOneOnOne = session.type === "one_on_one";

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema) as unknown as Resolver<SessionFormValues>,
    defaultValues: {
      status: session.status as any,
      meetingLink: session.meetingLink || "",
      recordingLink: session.recordingLink || "",
      notes: session.notes || "",
      startsAt: session.startsAt ? new Date(session.startsAt).toISOString().slice(0, 16) : "",
      durationMinutes: session.durationMinutes || 60,
    },
  });

  const updateOneOnOneMutation = useMutation(
    orpc.programActivities.mentor.updateOneOnOne.mutationOptions({
      onSuccess: () => {
        toast.success("Session updated");
        onOpenChange(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.session.mySessions.key(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const upsertMutation = useMutation(
    orpc.programActivities.session.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Session updated");
        onOpenChange(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.session.mySessions.key(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const isPending = updateOneOnOneMutation.isPending || upsertMutation.isPending;

  const onSubmit: SubmitHandler<SessionFormValues> = (values) => {
    if (isOneOnOne) {
      updateOneOnOneMutation.mutate({
        id: session.id,
        ...values,
      });
    } else {
      upsertMutation.mutate({
        id: session.id,
        batchId: session.batchId,
        mentorId: session.mentorId,
        week: session.week,
        type: session.type as any,
        startsAt: new Date(values.startsAt).toISOString(),
        durationMinutes: values.durationMinutes,
        studentId: session.studentId || undefined,
        status: values.status,
        meetingLink: values.meetingLink,
        recordingLink: values.recordingLink,
        notes: values.notes,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mentor-section sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-bold font-bricolage text-brand-navy text-xl">Update Session</DialogTitle>
          <DialogDescription className="font-manrope text-text-muted-custom">
            Update session details, status, and links.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={isPending} />
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
                      <Input type="number" min={15} step={15} {...field} disabled={isPending} />
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
                      <SelectTrigger disabled={isPending} className="rounded-xl border-gray-200 text-text-main">
                        {field.value ? (
                          <span className="font-medium text-text-main capitalize">{field.value}</span>
                        ) : (
                          <span className="text-text-muted-custom">Select status</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input
                      placeholder="https://meet.google.com/..."
                      className="text-text-main"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recording Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." className="text-text-main" {...field} disabled={isPending} />
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
                    <Textarea placeholder="Session notes..." {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-gray-200"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="btn-mentor rounded-xl">
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
