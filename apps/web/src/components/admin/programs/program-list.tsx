"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
import Link from "next/link";
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
import { FileUpload } from "@/components/ui/file-upload";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { authClient, isAdmin } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const programSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  bannerUrl: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programSchema>;

export function ProgramList() {
  const { data: session } = authClient.useSession();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<{
    id: string;
    name: string;
    description?: string | null;
    bannerUrl?: string | null;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    ...orpc.programs.admin.list.queryOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const programs = data?.data || [];

  const createMutation = useMutation(
    orpc.programs.admin.create.mutationOptions({
      onSuccess: () => {
        toast.success("Program created");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.list.key(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.programs.admin.update.mutationOptions({
      onSuccess: () => {
        toast.success("Program updated");
        setEditingProgram(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.list.key(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.programs.admin.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Program deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.list.key(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<ProgramFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(programSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      bannerUrl: "",
    },
  });

  const onSubmit = (values: ProgramFormValues) => {
    createMutation.mutate(values);
  };

  const onUpdate = (values: ProgramFormValues) => {
    if (!editingProgram) return;
    updateMutation.mutate({
      id: editingProgram.id,
      ...values,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Programs</h2>
          <p className="text-muted-foreground">Manage your mentoring programs.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Program
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No programs found.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{program.name}</span>
                      <span className="line-clamp-1 text-muted-foreground text-xs">{program.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">0</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenuGroup>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Link
                              href={
                                isAdmin(session)
                                  ? `/admin/programs/${program.id}`
                                  : `/program-manager/programs/${program.id}`
                              }
                            >
                              <BookOpen className="mr-2 h-4 w-4" /> View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingProgram({
                                id: program.id,
                                name: program.name,
                                description: program.description,
                                bannerUrl: program.bannerUrl,
                              });
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this program?")) {
                                deleteMutation.mutate({ id: program.id });
                              }
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </DropdownMenuGroup>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Program</DialogTitle>
            <DialogDescription>Create a new mentoring program.</DialogDescription>
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
                      <Input placeholder="Program Name" {...field} />
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
              <FormField
                control={form.control}
                name="bannerUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image</FormLabel>
                    <FormControl>
                      <FileUpload value={field.value} onChange={field.onChange} bucket="banners" path="programs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingProgram}
        onOpenChange={(open) => {
          if (!open) setEditingProgram(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>Update program details.</DialogDescription>
          </DialogHeader>
          <EditProgramForm
            program={editingProgram}
            onSubmit={onUpdate}
            isPending={updateMutation.isPending}
            onCancel={() => setEditingProgram(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditProgramForm({
  program,
  onSubmit,
  isPending,
  onCancel,
}: {
  program: {
    id: string;
    name: string;
    description?: string | null;
    bannerUrl?: string | null;
  } | null;
  onSubmit: (values: ProgramFormValues) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const form = useForm<ProgramFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(programSchema) as any,
    defaultValues: {
      name: program?.name ?? "",
      description: program?.description ?? "",
      bannerUrl: program?.bannerUrl ?? "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Program Name" {...field} />
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
        <FormField
          control={form.control}
          name="bannerUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banner Image</FormLabel>
              <FormControl>
                <FileUpload value={field.value} onChange={field.onChange} bucket="banners" path="programs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
