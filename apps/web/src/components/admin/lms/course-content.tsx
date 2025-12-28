"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, GripVertical, Loader2, Pencil, PlayCircle, Plus, Trash, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const sectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  order: z.number().int().default(0),
});

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  videoUrl: z.string().url("Must be a valid URL"),
  order: z.number().int().default(0),
  duration: z.number().int().optional(),
});

type SectionFormValues = z.infer<typeof sectionSchema>;
type LessonFormValues = z.infer<typeof lessonSchema>;

export function CourseContent({ courseId }: { courseId: string }) {
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isLessonOpen, setIsLessonOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<{
    id: string;
    title: string;
    order: number;
  } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{
    id: string;
    title: string;
    videoUrl: string;
    order: number;
    duration?: number | null;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data: course, isLoading } = useQuery(orpc.lms.course.get.queryOptions({ input: { id: courseId } }));

  // Section Mutations
  const createSectionMutation = useMutation(
    orpc.lms.section.create.mutationOptions({
      onSuccess: () => {
        toast.success("Section created");
        setIsSectionOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateSectionMutation = useMutation(
    orpc.lms.section.update.mutationOptions({
      onSuccess: () => {
        toast.success("Section updated");
        setEditingSection(null);
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteSectionMutation = useMutation(
    orpc.lms.section.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Section deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // Lesson Mutations
  const createLessonMutation = useMutation(
    orpc.lms.lesson.create.mutationOptions({
      onSuccess: () => {
        toast.success("Lesson created");
        setIsLessonOpen(false);
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateLessonMutation = useMutation(
    orpc.lms.lesson.update.mutationOptions({
      onSuccess: () => {
        toast.success("Lesson updated");
        setEditingLesson(null);
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteLessonMutation = useMutation(
    orpc.lms.lesson.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Lesson deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // Forms
  const sectionForm = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { title: "", order: 0 },
  });

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: "", videoUrl: "", order: 0, duration: 0 },
  });

  const editSectionForm = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { title: "", order: 0 },
  });

  const editLessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: "", videoUrl: "", order: 0, duration: 0 },
  });

  // Handlers
  const onCreateSection = (values: SectionFormValues) => {
    createSectionMutation.mutate({ courseId, ...values });
  };

  const onUpdateSection = (values: SectionFormValues) => {
    if (!editingSection) return;
    updateSectionMutation.mutate({ id: editingSection.id, ...values });
  };

  const onCreateLesson = (values: LessonFormValues) => {
    if (!activeSectionId) return;
    createLessonMutation.mutate({ sectionId: activeSectionId, ...values });
  };

  const onUpdateLesson = (values: LessonFormValues) => {
    if (!editingLesson) return;
    updateLessonMutation.mutate({ id: editingLesson.id, ...values });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/lms/courses" className={cn(buttonVariants({ variant: "outline", size: "icon" }))}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="font-bold text-2xl tracking-tight">{course.title}</h2>
          <p className="text-muted-foreground text-sm">Manage curriculum and content</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setIsSectionOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Section
        </Button>
        <Dialog open={isSectionOpen} onOpenChange={setIsSectionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
              <DialogDescription>Create a new section (chapter) for this course.</DialogDescription>
            </DialogHeader>
            <Form {...sectionForm}>
              <form onSubmit={sectionForm.handleSubmit(onCreateSection)} className="space-y-4">
                <FormField
                  control={sectionForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Introduction" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sectionForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createSectionMutation.isPending}>
                    {createSectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <Accordion className="w-full">
          {course.sections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="mb-4 rounded-lg border px-4">
              <div className="flex items-center justify-between py-2">
                <AccordionTrigger className="flex-1 py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium text-lg">
                      Section {section.order}: {section.title}
                    </span>
                    <span className="text-muted-foreground text-sm">({section.lessons.length} lessons)</span>
                  </div>
                </AccordionTrigger>
                <div className="ml-4 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSection(section);
                      editSectionForm.reset({
                        title: section.title,
                        order: section.order,
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this section and all its lessons?")) {
                        deleteSectionMutation.mutate({ id: section.id });
                      }
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <AccordionContent className="pt-2 pb-4">
                <div className="space-y-2 pl-4">
                  {section.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between rounded-md border bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <PlayCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lesson.title}</p>
                          <a
                            href={lesson.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-muted-foreground text-xs hover:underline"
                          >
                            <Video className="h-3 w-3" /> Video Link
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLesson(lesson);
                            editLessonForm.reset({
                              title: lesson.title,
                              videoUrl: lesson.videoUrl,
                              order: lesson.order,
                              duration: lesson.duration || 0,
                            });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this lesson?")) {
                              deleteLessonMutation.mutate({ id: lesson.id });
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-dashed"
                    onClick={() => {
                      setActiveSectionId(section.id);
                      setIsLessonOpen(true);
                      lessonForm.reset({
                        order: section.lessons.length + 1,
                        title: "",
                        videoUrl: "",
                      });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Lesson
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {course.sections.length === 0 && (
          <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
            <p>No sections yet. Click "Add Section" to start building your course.</p>
          </div>
        )}
      </div>

      {/* Edit Section Dialog */}
      <Dialog
        open={!!editingSection}
        onOpenChange={(open) => {
          if (!open) setEditingSection(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          <Form {...editSectionForm}>
            <form onSubmit={editSectionForm.handleSubmit(onUpdateSection)} className="space-y-4">
              <FormField
                control={editSectionForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSectionForm.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateSectionMutation.isPending}>
                  {updateSectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Lesson Dialog */}
      <Dialog open={isLessonOpen} onOpenChange={setIsLessonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lesson</DialogTitle>
            <DialogDescription>Add a new video lesson to this section.</DialogDescription>
          </DialogHeader>
          <Form {...lessonForm}>
            <form onSubmit={lessonForm.handleSubmit(onCreateLesson)} className="space-y-4">
              <FormField
                control={lessonForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Lesson Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={lessonForm.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL (YouTube)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={lessonForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={lessonForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Optional"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createLessonMutation.isPending}>
                  {createLessonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */}
      <Dialog
        open={!!editingLesson}
        onOpenChange={(open) => {
          if (!open) setEditingLesson(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
          </DialogHeader>
          <Form {...editLessonForm}>
            <form onSubmit={editLessonForm.handleSubmit(onUpdateLesson)} className="space-y-4">
              <FormField
                control={editLessonForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editLessonForm.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editLessonForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editLessonForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateLessonMutation.isPending}>
                  {updateLessonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
