"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { File, Link as LinkIcon, Loader2, Pencil, Plus, Trash, Video } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";

const attachmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["file", "video", "link", "tool"]),
  url: z
    .string()
    .url("Must be a valid URL")
    .refine((val) => val.startsWith("https://"), "URL must use HTTPS")
    .or(z.literal("")),
  week: z.coerce.number().optional(),
  sessionId: z.string().optional(),
});

type AttachmentFormValues = z.infer<typeof attachmentSchema>;

export function MentorBatchAttachments({ batch }: { batch: { id: string; name: string; durationWeeks: number } }) {
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

  const { data: myRequests, isLoading: isLoadingRequests } = useQuery({
    ...orpc.programActivities.attachment.myRequests.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Mutations
  const createMutation = useMutation(
    orpc.programActivities.attachment.create.mutationOptions({
      onSuccess: () => {
        toast.success("Attachment creation request submitted for approval");
        setIsFormOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.myRequests.key({
            input: { batchId: batch.id },
          }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    orpc.programActivities.attachment.update.mutationOptions({
      onSuccess: () => {
        toast.success("Attachment update request submitted for approval");
        setIsFormOpen(false);
        setEditingAttachment(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.myRequests.key({
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
        toast.success("Attachment deletion request submitted for approval");
        queryClient.invalidateQueries({
          queryKey: orpc.programActivities.attachment.myRequests.key({
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

  return (
    <div className="mentor-section space-y-4">
      <Tabs defaultValue="active" className="w-full">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="rounded-xl bg-white p-1 shadow-sm">
            <TabsTrigger
              value="active"
              className="rounded-lg data-[state=active]:bg-brand-navy data-[state=active]:text-white"
            >
              Active Resources
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="rounded-lg data-[state=active]:bg-brand-navy data-[state=active]:text-white"
            >
              My Requests
              {myRequests && myRequests.length > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-mentor-teal text-[10px] text-white">
                  {myRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <Button onClick={handleCreate} className="btn-mentor rounded-full shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Request New
          </Button>
        </div>

        <TabsContent value="active">
          {/* Table - desktop */}
          <div className="hidden rounded-md border md:block">
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
                    <TableRow key={attachment.id} className="border-gray-100 transition-colors hover:bg-bg-light">
                      <TableCell>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center font-manrope font-medium text-text-main hover:text-mentor-teal"
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(attachment)}
                          className="mr-1 text-text-muted-custom hover:text-mentor-teal"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:bg-red-50 hover:text-red-500"
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

          {/* Cards - mobile */}
          <div className="space-y-3 md:hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-text-muted-custom" />
              </div>
            ) : attachments?.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
                <p className="font-manrope text-sm text-text-muted-custom">No attachments found.</p>
              </div>
            ) : (
              attachments?.map((attachment) => (
                <div key={attachment.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 font-manrope font-medium text-text-main hover:text-mentor-teal"
                    >
                      {attachment.type === "video" ? (
                        <Video className="h-4 w-4 shrink-0 text-mentor-teal" />
                      ) : attachment.type === "file" ? (
                        <File className="h-4 w-4 shrink-0 text-mentor-teal" />
                      ) : (
                        <LinkIcon className="h-4 w-4 shrink-0 text-mentor-teal" />
                      )}
                      <span className="break-words">{attachment.name}</span>
                    </a>
                    <span className="shrink-0 rounded-lg border px-2 py-0.5 font-manrope text-[10px] text-text-muted-custom capitalize">
                      {attachment.type}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-4 text-text-muted-custom text-xs">
                    <span>{attachment.week ? `Week ${attachment.week}` : "All Weeks"}</span>
                    {attachment.sessionId && (
                      <span className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        Linked
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5 border-gray-100 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(attachment)}
                      className="rounded-lg border-gray-200 text-xs"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-50 hover:text-red-500"
                      onClick={() => {
                        if (confirm("Are you sure?")) {
                          deleteMutation.mutate({ id: attachment.id });
                        }
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          {/* Table - desktop */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRequests ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : myRequests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  myRequests?.map((req) => (
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
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 font-semibold text-white text-xs shadow transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            req.status === "pending"
                              ? "bg-yellow-500 hover:bg-yellow-500/80"
                              : req.status === "approved"
                                ? "bg-green-500 hover:bg-green-500/80"
                                : "bg-red-500 hover:bg-red-500/80",
                          )}
                        >
                          {req.status}
                        </span>
                        {req.rejectionReason && <p className="mt-1 text-red-500 text-xs">{req.rejectionReason}</p>}
                      </TableCell>
                      <TableCell>{format(new Date(req.createdAt), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Cards - mobile */}
          <div className="space-y-3 md:hidden">
            {isLoadingRequests ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-text-muted-custom" />
              </div>
            ) : myRequests?.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
                <p className="font-manrope text-sm text-text-muted-custom">No requests found.</p>
              </div>
            ) : (
              myRequests?.map((req) => (
                <div key={req.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="rounded-lg bg-brand-navy/5 px-2.5 py-1 font-manrope font-medium text-brand-navy text-xs capitalize">
                      {req.action}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 font-manrope font-semibold text-[10px] text-white",
                        req.status === "pending"
                          ? "bg-yellow-500"
                          : req.status === "approved"
                            ? "bg-green-500"
                            : "bg-red-500",
                      )}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="mb-2 text-sm">
                    {req.action === "create" || req.action === "update" ? (
                      <>
                        <p className="font-manrope font-medium text-text-main">{(req.data as any).name}</p>
                        <p className="font-manrope text-text-muted-custom text-xs capitalize">
                          {(req.data as any).type}
                        </p>
                      </>
                    ) : (
                      <p className="font-manrope text-text-muted-custom text-xs">Attachment ID: {req.attachmentId}</p>
                    )}
                  </div>

                  <div className="font-manrope text-text-muted-custom text-xs">
                    {format(new Date(req.createdAt), "MMM d, yyyy")}
                  </div>

                  {req.rejectionReason && (
                    <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 font-manrope text-red-600 text-xs">
                      {req.rejectionReason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bold font-bricolage text-brand-navy text-xl">
              {editingAttachment ? "Edit Attachment Request" : "Request New Attachment"}
            </DialogTitle>
            <DialogDescription className="font-manrope text-text-muted-custom">
              Submit a request to {editingAttachment ? "update" : "add"} a resource. Admin approval required.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

              <div className="grid grid-cols-2 gap-5 pt-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-text-main">
                            {field.value ? (
                              <span className="text-text-main capitalize">{field.value}</span>
                            ) : (
                              <span className="text-text-muted-custom">Select type</span>
                            )}
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
                        onValueChange={(val) => field.onChange(val === "0" ? 0 : Number(val))}
                        defaultValue={
                          field.value !== undefined && field.value !== null ? String(field.value) : undefined
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="text-text-main">
                            {field.value !== undefined && field.value !== null ? (
                              field.value === 0 ? (
                                <span className="text-text-main">All Weeks</span>
                              ) : (
                                <span className="text-text-main">Week {field.value}</span>
                              )
                            ) : (
                              <span className="text-text-muted-custom">All Weeks</span>
                            )}
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

              <div className="grid grid-rows-2 gap-5">
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Session (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="text-text-main">
                            {field.value && field.value !== "none" ? (
                              <span className="text-text-main">
                                {(() => {
                                  if (!sessions) return "Loading...";
                                  const s = sessions.find((x) => x.id === field.value);
                                  if (!s) return "Unknown session";
                                  return `Week ${s.week} - ${s.type.replace("_", " ")} | Mentor: ${s.mentor?.name || "-"} | Student: ${s.student?.name || "Group"} (${format(new Date(s.startsAt), "MMM d")})`;
                                })()}
                              </span>
                            ) : (
                              <span className="text-text-muted-custom">None</span>
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
                  className="rounded-xl border-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-mentor rounded-xl"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingAttachment ? "Submit Update" : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
