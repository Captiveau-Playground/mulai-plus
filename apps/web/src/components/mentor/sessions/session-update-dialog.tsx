"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

const sessionSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "missed"]),
  meetingLink: z.string().optional(),
  recordingLink: z.string().optional(),
  notes: z.string().optional(),
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

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      status: session.status as any,
      meetingLink: session.meetingLink || "",
      recordingLink: session.recordingLink || "",
      notes: session.notes || "",
    },
  });

  const mutation = useMutation(
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

  const onSubmit = (values: SessionFormValues) => {
    mutation.mutate({
      id: session.id,
      batchId: session.batchId,
      mentorId: session.mentorId,
      week: session.week,
      type: session.type as any,
      startsAt: new Date(session.startsAt).toISOString(),
      durationMinutes: session.durationMinutes,
      studentId: session.studentId || undefined,
      ...values,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Session</DialogTitle>
          <DialogDescription>Update session details, status, and links.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={mutation.isPending}>
                        <SelectValue />
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
                    <Input placeholder="https://meet.google.com/..." {...field} disabled={mutation.isPending} />
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
                    <Input placeholder="https://..." {...field} disabled={mutation.isPending} />
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
                    <Textarea placeholder="Session notes..." {...field} disabled={mutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
