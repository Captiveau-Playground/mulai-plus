"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

const testimonialSchema = z.object({
  userId: z.string().min(1, "User is required"),
  content: z.string().min(1, "Content is required"),
  education: z.string().optional(),
  programName: z.string().optional(),
  rating: z.string(),
  isVisible: z.boolean(),
});

type TestimonialFormValues = z.infer<typeof testimonialSchema>;

export function TestimonialList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<{
    id: string;
    userId: string;
    content: string;
    education?: string | null;
    programName?: string | null;
    rating?: string | null;
    isVisible: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data: testimonials, isLoading } = useQuery(orpc.testimonials.list.queryOptions());
  const { data: students } = useQuery(orpc.user.listStudents.queryOptions());

  const createMutation = useMutation(
    orpc.testimonials.create.mutationOptions({
      onSuccess: () => {
        toast.success("Testimonial created");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.testimonials.list.key(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.testimonials.update.mutationOptions({
      onSuccess: () => {
        toast.success("Testimonial updated");
        setEditingTestimonial(null);
        queryClient.invalidateQueries({
          queryKey: orpc.testimonials.list.key(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.testimonials.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Testimonial deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.testimonials.list.key(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Testimonials</h2>
          <p className="text-muted-foreground">Manage student testimonials.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Education</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.user.image || ""} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.user.name}</span>
                      <span className="text-muted-foreground text-xs">{item.user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={item.content}>
                  {item.content}
                </TableCell>
                <TableCell>{item.education || "-"}</TableCell>
                <TableCell>{item.programName || "-"}</TableCell>
                <TableCell>{item.rating} / 5</TableCell>
                <TableCell>
                  <div className={`h-2 w-2 rounded-full ${item.isVisible ? "bg-green-500" : "bg-gray-300"}`} />
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
                            setEditingTestimonial({
                              id: item.id,
                              userId: item.userId,
                              content: item.content,
                              education: item.education,
                              programName: item.programName,
                              rating: item.rating,
                              isVisible: item.isVisible,
                            })
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure?")) {
                              deleteMutation.mutate({ id: item.id });
                            }
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenuGroup>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {testimonials?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No testimonials found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="min-w-7xl">
          <DialogHeader>
            <DialogTitle>Add Testimonial</DialogTitle>
            <DialogDescription>Create a new testimonial for a student.</DialogDescription>
          </DialogHeader>
          <TestimonialForm
            students={students || []}
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
            defaultValues={{
              rating: "5",
              isVisible: true,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTestimonial} onOpenChange={(open) => !open && setEditingTestimonial(null)}>
        <DialogContent className="min-w-7xl">
          <DialogHeader>
            <DialogTitle>Edit Testimonial</DialogTitle>
            <DialogDescription>Update the testimonial details.</DialogDescription>
          </DialogHeader>
          {editingTestimonial && (
            <TestimonialForm
              students={students || []}
              onSubmit={(values) =>
                updateMutation.mutate({
                  id: editingTestimonial.id,
                  ...values,
                })
              }
              isSubmitting={updateMutation.isPending}
              defaultValues={{
                userId: editingTestimonial.userId,
                content: editingTestimonial.content,
                education: editingTestimonial.education || "",
                programName: editingTestimonial.programName || "",
                rating: editingTestimonial.rating || "5",
                isVisible: editingTestimonial.isVisible,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TestimonialForm({
  students,
  onSubmit,
  isSubmitting,
  defaultValues,
}: {
  students: { id: string; name: string; email: string; image: string | null }[];
  onSubmit: (values: TestimonialFormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<TestimonialFormValues>;
}) {
  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      userId: "",
      content: "",
      education: "",
      programName: "",
      rating: "5",
      isVisible: true,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>{!field.value && "Select a student"}</SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map((student) => (
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
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Testimonial Content</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter the testimonial..." className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="education"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Education / School</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. SMA Negeri 1..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="programName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alumni Program</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Fullstack Batch 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue>{!field.value && "Select rating"}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isVisible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Visible</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
