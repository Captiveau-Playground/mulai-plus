"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
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
  DialogTrigger,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

const benefitSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.coerce.number().default(0),
});

type BenefitFormValues = z.infer<typeof benefitSchema>;

export function ProgramBenefits({ programId }: { programId: string }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<{
    id: string;
    title: string;
    description?: string | null;
    icon?: string | null;
    order: number;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(orpc.programs.admin.benefits.list.queryOptions({ input: { programId } }));
  const benefits = data || [];

  const createMutation = useMutation(
    orpc.programs.admin.benefits.create.mutationOptions({
      onSuccess: () => {
        toast.success("Benefit created");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.benefits.list.key({
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
    orpc.programs.admin.benefits.update.mutationOptions({
      onSuccess: () => {
        toast.success("Benefit updated");
        setEditingBenefit(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.benefits.list.key({
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
    orpc.programs.admin.benefits.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Benefit deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.benefits.list.key({
            input: { programId },
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<BenefitFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(benefitSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      icon: "",
      order: 0,
    },
  });

  const onSubmit = (values: BenefitFormValues) => {
    createMutation.mutate({
      programId,
      ...values,
    });
  };

  const onUpdate = (values: BenefitFormValues) => {
    if (!editingBenefit) return;
    updateMutation.mutate({
      id: editingBenefit.id,
      ...values,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium text-lg">Program Benefits</h3>
          <p className="text-muted-foreground text-sm">Manage program benefits.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Benefit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Benefit</DialogTitle>
              <DialogDescription>Add a new benefit.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon (Lucide Name)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Check, Star" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
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
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Order</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : benefits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No benefits found.
                </TableCell>
              </TableRow>
            ) : (
              benefits.map((benefit) => (
                <TableRow key={benefit.id}>
                  <TableCell>{benefit.order}</TableCell>
                  <TableCell>{benefit.icon && <span className="font-mono text-xs">{benefit.icon}</span>}</TableCell>
                  <TableCell className="font-medium">{benefit.title}</TableCell>
                  <TableCell className="line-clamp-2 max-w-md truncate">{benefit.description}</TableCell>
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
                              setEditingBenefit({
                                id: benefit.id,
                                title: benefit.title,
                                description: benefit.description,
                                icon: benefit.icon,
                                order: benefit.order,
                              })
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm("Are you sure?")) {
                                deleteMutation.mutate({ id: benefit.id });
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

      {editingBenefit && (
        <EditBenefitDialog
          benefit={editingBenefit}
          open={!!editingBenefit}
          onOpenChange={(open) => !open && setEditingBenefit(null)}
          onSubmit={onUpdate}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditBenefitDialog({
  benefit,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  benefit: {
    id: string;
    title: string;
    description?: string | null;
    icon?: string | null;
    order: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BenefitFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<BenefitFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(benefitSchema) as any,
    defaultValues: {
      title: benefit.title,
      description: benefit.description || "",
      icon: benefit.icon || "",
      order: benefit.order,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Benefit</DialogTitle>
          <DialogDescription>Edit benefit details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input placeholder="Icon" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
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
