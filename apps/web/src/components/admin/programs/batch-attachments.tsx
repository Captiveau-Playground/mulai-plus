"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { File, Link as LinkIcon, Loader2, Plus, Trash, Video } from "lucide-react";
import { useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

const attachmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["file", "video", "link", "tool"]),
  url: z.string().url("Must be a valid URL"),
  week: z.coerce.number().optional(),
  sessionId: z.string().optional(),
});

type AttachmentFormValues = z.infer<typeof attachmentSchema>;

export function BatchAttachmentsDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: { id: string; name: string; durationWeeks: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const queryClient = useQueryClient();

  // Queries
  const { data: attachments, isLoading } = useQuery(
    orpc.programActivities.attachment.list.queryOptions({
      input: { batchId: batch.id },
    }),
  );

  const { data: sessions } = useQuery(
    orpc.programActivities.session.list.queryOptions({
      input: { batchId: batch.id },
    }),
  );

  // Mutations
  const createMutation = useMutation(
    orpc.programActivities.attachment.create.mutationOptions({
      onSuccess: () => {
        toast.success("Attachment added");
        setIsFormOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.list.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    orpc.programActivities.attachment.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Attachment deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.list.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const form = useForm<AttachmentFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(attachmentSchema) as any,
    defaultValues: {
      name: "",
      type: "link",
      url: "",
    },
  });

  const onSubmit = (values: AttachmentFormValues) => {
    createMutation.mutate({
      batchId: batch.id,
      ...values,
      week: values.week ? Number(values.week) : undefined,
      sessionId: values.sessionId || undefined,
    });
  };

  const handleCreate = () => {
    form.reset({
      name: "",
      type: "link",
      url: "",
      week: undefined,
      sessionId: undefined,
    });
    setIsFormOpen(true);
  };

  const weeks = Array.from({ length: batch.durationWeeks }, (_, i) => i + 1);

  if (isFormOpen) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="min-w-7xl">
          <DialogHeader>
            <DialogTitle>Add Attachment</DialogTitle>
            <DialogDescription>Add a resource link for this batch.</DialogDescription>
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
                      <Input placeholder="Resource Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            {field.value ? <SelectValue /> : <span className="text-muted-foreground">All Weeks</span>}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">All Weeks</SelectItem>
                          {weeks.map((w) => (
                            <SelectItem key={w} value={String(w)}>
                              Week {w}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Session (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          {field.value && field.value !== "none" ? (
                            <SelectValue />
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {sessions?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            Week {s.week} - {s.type} ({format(new Date(s.startsAt), "MMM d")})
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
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
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
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add
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
          <DialogTitle>Attachments: {batch.name}</DialogTitle>
          <DialogDescription>Manage resources and links.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Attachment
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Linked Session</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : attachments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No attachments found.
                  </TableCell>
                </TableRow>
              ) : (
                attachments?.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center font-medium hover:underline"
                      >
                        {attachment.type === "video" ? (
                          <Video className="mr-2 h-4 w-4" />
                        ) : attachment.type === "file" ? (
                          <File className="mr-2 h-4 w-4" />
                        ) : (
                          <LinkIcon className="mr-2 h-4 w-4" />
                        )}
                        {attachment.name}
                      </a>
                    </TableCell>
                    <TableCell className="capitalize">{attachment.type}</TableCell>
                    <TableCell>{attachment.week ? `Week ${attachment.week}` : "All Weeks"}</TableCell>
                    <TableCell>
                      {attachment.sessionId ? (
                        <span className="text-muted-foreground text-xs">Linked to session</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm("Are you sure?")) {
                            deleteMutation.mutate({ id: attachment.id });
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
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
