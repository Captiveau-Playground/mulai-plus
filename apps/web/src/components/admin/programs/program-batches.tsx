"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

const batchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  registrationStartDate: z.string().min(1, "Registration start date is required"),
  registrationEndDate: z.string().min(1, "Registration end date is required"),
  quota: z.coerce.number().min(0).default(0),
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
    quota: number;
    status: "upcoming" | "open" | "closed" | "running" | "completed";
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
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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
                                quota: batch.quota,
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
    quota: number;
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
      quota: batch.quota,
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
