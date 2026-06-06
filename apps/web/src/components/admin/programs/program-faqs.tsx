"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Loader2, MoreHorizontal, Pencil, Plus, Trash, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  order: z.coerce.number().default(0),
});

type FaqFormValues = z.infer<typeof faqSchema>;

export function ProgramFaqs({ programId }: { programId: string }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<{
    id: string;
    question: string;
    answer: string;
    order: number;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    ...orpc.programs.admin.faqs.list.queryOptions({ input: { programId } }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const faqs = data || [];

  const createMutation = useMutation(
    orpc.programs.admin.faqs.create.mutationOptions({
      onSuccess: () => {
        toast.success("FAQ created");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.faqs.list.key({ input: { programId } }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.programs.admin.faqs.update.mutationOptions({
      onSuccess: () => {
        toast.success("FAQ updated");
        setEditingFaq(null);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.faqs.list.key({ input: { programId } }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.programs.admin.faqs.delete.mutationOptions({
      onSuccess: () => {
        toast.success("FAQ deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.faqs.list.key({ input: { programId } }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<FaqFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: standardSchemaResolver(faqSchema) as any,
    defaultValues: {
      question: "",
      answer: "",
      order: 0,
    },
  });

  const onSubmit = (values: FaqFormValues) => {
    createMutation.mutate({
      programId,
      ...values,
    });
  };

  const onUpdate = (values: FaqFormValues) => {
    if (!editingFaq) return;
    updateMutation.mutate({
      id: editingFaq.id,
      ...values,
    });
  };

  return (
    <Card className="mentor-card">
      <CardHeader className="bg-white">
        <div className="flex items-center gap-3">
          <div className="icon-box-light">
            <HelpCircle className="h-5 w-5 text-brand-navy" />
          </div>
          <div className="flex-1">
            <CardTitle className="font-bricolage text-lg text-text-main">FAQs</CardTitle>
            <CardDescription className="font-manrope text-text-muted-custom">
              Manage Frequently Asked Questions.
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="!bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !rounded-full !border-0 shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Add FAQ
          </Button>
        </div>
      </CardHeader>
      <CardContent className="bg-white px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Order</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Answer</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-mentor-teal" />
                </TableCell>
              </TableRow>
            ) : faqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HelpCircle className="h-8 w-8 text-text-muted-custom/50" />
                    <p className="font-manrope text-text-muted-custom">No FAQs found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>{faq.order}</TableCell>
                  <TableCell className="font-medium">{faq.question}</TableCell>
                  <TableCell className="line-clamp-2 max-w-md truncate">{faq.answer}</TableCell>
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
                              setEditingFaq({
                                id: faq.id,
                                question: faq.question,
                                answer: faq.answer,
                                order: faq.order,
                              })
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirmId(faq.id)}>
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
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add FAQ</DialogTitle>
            <DialogDescription>Add a new question and answer.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. What is the duration?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer</FormLabel>
                      <FormControl>
                        <Textarea placeholder="The program lasts for..." {...field} />
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
                <Button
                  type="submit"
                  className="!bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !rounded-full !border-0"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {editingFaq && (
        <EditFaqDialog
          faq={editingFaq}
          open={!!editingFaq}
          onOpenChange={(open) => !open && setEditingFaq(null)}
          onSubmit={onUpdate}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-red-100">
              <TriangleAlert className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) deleteMutation.mutate({ id: deleteConfirmId });
                setDeleteConfirmId(null);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function EditFaqDialog({
  faq,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  faq: {
    id: string;
    question: string;
    answer: string;
    order: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FaqFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FaqFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: standardSchemaResolver(faqSchema) as any,
    defaultValues: {
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit FAQ</DialogTitle>
          <DialogDescription>Update the question and answer.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input placeholder="Question" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Answer" {...field} />
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
              <Button
                type="submit"
                className="!bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !rounded-full !border-0"
                disabled={isPending}
              >
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
