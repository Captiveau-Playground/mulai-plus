"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, File, Link as LinkIcon, Loader2, Pencil, Plus, Trash, Video, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";

const attachmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["file", "video", "link", "tool"]),
  url: z
    .string()
    .url("Must be a valid URL")
    .refine((val) => val.startsWith("https://"), "URL must use HTTPS"),
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
  const [editingAttachment, setEditingAttachment] = useState<any>(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: attachments, isLoading } = useQuery({
    ...orpc.programActivities.attachment.list.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: sessions } = useQuery({
    ...orpc.programActivities.session.list.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    ...orpc.programs.admin.attachmentRequests.list.queryOptions({
      input: { batchId: batch.id, status: "pending" },
    }),
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Mutations
  const approveMutation = useMutation(
    orpc.programs.admin.attachmentRequests.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Request approved");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.attachmentRequests.list.key({
            input: { batchId: batch.id },
          }),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.list.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err: Error) => toast.error(err.message),
    }),
  );

  const rejectMutation = useMutation(
    orpc.programs.admin.attachmentRequests.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Request rejected");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.attachmentRequests.list.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err: Error) => toast.error(err.message),
    }),
  );

  const createMutation = useMutation(
    orpc.programActivities.attachment.create.mutationOptions({
      onSuccess: () => {
        toast.success("Attachment creation request submitted for approval");
        setIsFormOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.list.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err: Error) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    orpc.programActivities.attachment.update.mutationOptions({
      onSuccess: () => {
        toast.success("Attachment update request submitted for approval");
        setIsFormOpen(false);
        setEditingAttachment(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.list.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err: Error) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    orpc.programActivities.attachment.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Attachment deletion request submitted for approval");
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
    if (editingAttachment) {
      updateMutation.mutate({
        id: editingAttachment.id,
        name: values.name,
        type: values.type,
        url: values.url,
        week: values.week ? Number(values.week) : undefined,
        sessionId: values.sessionId === "none" || !values.sessionId ? null : values.sessionId,
      });
    } else {
      createMutation.mutate({
        batchId: batch.id,
        ...values,
        week: values.week ? Number(values.week) : undefined,
        sessionId: values.sessionId === "none" ? undefined : values.sessionId,
      });
    }
  };

  const handleCreate = () => {
    setEditingAttachment(null);
    form.reset({
      name: "",
      type: "link",
      url: "",
      week: undefined,
      sessionId: undefined,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (attachment: any) => {
    setEditingAttachment(attachment);
    form.reset({
      name: attachment.name,
      type: attachment.type,
      url: attachment.url,
      week: attachment.week || undefined,
      sessionId: attachment.sessionId || "none",
    });
    setIsFormOpen(true);
  };

  const weeks = Array.from({ length: batch.durationWeeks }, (_, i) => i + 1);

  if (isFormOpen) {
    return (
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            setEditingAttachment(null);
          }
        }}
      >
        <DialogContent className="min-w-7xl">
          <DialogHeader>
            <DialogTitle>{editingAttachment ? "Edit Attachment" : "Add Attachment"}</DialogTitle>
            <DialogDescription>
              {editingAttachment ? "Update the attachment details." : "Add a resource link for this batch."}
            </DialogDescription>
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

              <div className="grid grid-cols-2 gap-4 pt-4">
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
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Session (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            {field.value && field.value !== "none" ? (
                              <span className="font-medium text-sm">
                                {(() => {
                                  if (!sessions) return "Loading...";
                                  const s = sessions.find((x) => x.id === field.value);
                                  if (!s) return "Unknown session";
                                  return `Week ${s.week} - ${s.type.replace("_", " ")} | Mentor: ${s.mentor?.name || "-"} | Student: ${s.student?.name || "Group"} (${format(new Date(s.startsAt), "MMM d")})`;
                                })()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {sessions?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              Week {s.week} - {s.type.replace("_", " ")} | Mentor: {s.mentor?.name || "-"} | Student:{" "}
                              {s.student?.name || "Group"} ({format(new Date(s.startsAt), "MMM d")})
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
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingAttachment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingAttachment ? "Update" : "Add"}
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Attachments: {batch.name}</DialogTitle>
          <DialogDescription>Manage resources and links.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="active" className="w-full">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="active">Active Attachments</TabsTrigger>
              <TabsTrigger value="requests">
                Requests
                {requests?.data && requests.data.length > 0 && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                    {requests.data.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Attachment
            </Button>
          </div>

          <TabsContent value="active">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Linked Session</TableHead>
                    <TableHead className="w-[100px]" />
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
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(attachment)} className="mr-2">
                            <Pencil className="h-4 w-4" />
                          </Button>
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
          </TabsContent>

          <TabsContent value="requests">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRequests ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : requests?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No pending requests.
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests?.data?.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium capitalize">{req.action}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            {req.action === "create" || req.action === "update" ? (
                              <>
                                <span className="font-medium">{(req.data as any).name}</span>
                                <span className="text-muted-foreground">{(req.data as any).type}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Attachment ID: {req.attachmentId}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{req.requestedBy?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border border-transparent bg-yellow-500 px-2.5 py-0.5 font-semibold text-white text-xs shadow transition-colors hover:bg-yellow-500/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            {req.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8 w-8 bg-green-600 p-0 hover:bg-green-700"
                              onClick={() => approveMutation.mutate({ requestId: req.id })}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                rejectMutation.mutate({
                                  requestId: req.id,
                                  reason: "Admin rejected",
                                })
                              }
                              disabled={rejectMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
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
