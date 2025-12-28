"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash,
  Video,
} from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

// Schemas
const sectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  order: z.number().int(),
});

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  order: z.number().int(),
  status: z.enum(["draft", "published", "archived"]),
  duration: z.number().int().optional(),
});

type SectionFormValues = z.infer<typeof sectionSchema>;
type LessonFormValues = z.infer<typeof lessonSchema>;

// Sortable Section Component
function SortableSection({
  section,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  children,
}: {
  section: any;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: {
      type: "Section",
      section,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <div className="flex items-center rounded-lg border bg-card p-2 shadow-sm">
        <div {...attributes} {...listeners} className="cursor-grab p-2 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{section.title}</span>
              <Badge variant="secondary" className="text-xs">
                {section.lessons.length} lessons
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onToggle}>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAddLesson}>
                    <Plus className="mr-2 h-4 w-4" /> Add Lesson
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      {isExpanded && <div className="mt-2 pl-8">{children}</div>}
    </div>
  );
}

// Sortable Lesson Component
function SortableLesson({
  lesson,
  onEdit,
  onDelete,
  onMove,
  sections,
}: {
  lesson: any;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (sectionId: string) => void;
  sections: any[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: {
      type: "Lesson",
      lesson,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <Eye className="h-4 w-4 text-green-500" />;
      case "archived":
        return <Archive className="h-4 w-4 text-orange-500" />;
      default:
        return <EyeOff className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 flex items-center rounded-md border bg-background p-2">
      <div {...attributes} {...listeners} className="cursor-grab p-2 text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-3">
          {lesson.videoUrl ? (
            <Video className="h-4 w-4 text-blue-500" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{lesson.title}</span>
          <div title={lesson.status}>{getStatusIcon(lesson.status)}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-3 w-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {sections
                .filter((s) => s.id !== lesson.sectionId)
                .map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => onMove(s.id)}>
                    {s.title}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function CourseContent({ courseId }: { courseId: string }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<{
    id: string;
    title: string;
    order: number;
  } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{
    id: string;
    sectionId: string;
    title: string;
    description?: string;
    videoUrl?: string;
    order: number;
    status: "draft" | "published" | "archived";
    duration?: number;
  } | null>(null);
  const [activeSectionIdForLesson, setActiveSectionIdForLesson] = useState<string | null>(null);
  const [_activeDragId, setActiveDragId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: course, isLoading } = useQuery(orpc.lms.course.get.queryOptions({ input: { id: courseId } }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Forms
  const sectionForm = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
  });

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
  });

  // Mutations
  const createSectionMutation = useMutation(
    orpc.lms.section.create.mutationOptions({
      onSuccess: () => {
        toast.success("Section created");
        setIsSectionDialogOpen(false);
        sectionForm.reset();
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateSectionMutation = useMutation(
    orpc.lms.section.update.mutationOptions({
      onSuccess: () => {
        toast.success("Section updated");
        setIsSectionDialogOpen(false);
        setEditingSection(null);
        sectionForm.reset();
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (err) => toast.error(err.message),
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
      onError: (err) => toast.error(err.message),
    }),
  );

  const reorderSectionMutation = useMutation(
    orpc.lms.section.reorder.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const createLessonMutation = useMutation(
    orpc.lms.lesson.create.mutationOptions({
      onSuccess: () => {
        toast.success("Lesson created");
        setIsLessonDialogOpen(false);
        lessonForm.reset();
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateLessonMutation = useMutation(
    orpc.lms.lesson.update.mutationOptions({
      onSuccess: () => {
        toast.success("Lesson updated");
        setIsLessonDialogOpen(false);
        setEditingLesson(null);
        lessonForm.reset();
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (err) => toast.error(err.message),
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
      onError: (err) => toast.error(err.message),
    }),
  );

  const reorderLessonMutation = useMutation(
    orpc.lms.lesson.reorder.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lms.course.get.key({ input: { id: courseId } }),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  // Handlers
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    // Section Reorder
    if (activeData.type === "Section" && overData.type === "Section") {
      if (active.id !== over.id) {
        const oldIndex = course?.sections.findIndex((s) => s.id === active.id) ?? -1;
        const newIndex = course?.sections.findIndex((s) => s.id === over.id) ?? -1;

        if (oldIndex !== -1 && newIndex !== -1) {
          const newSections = arrayMove(course?.sections || [], oldIndex, newIndex);
          // Optimistic update could go here, but for now we rely on mutation
          reorderSectionMutation.mutate({
            items: newSections.map((s, idx) => ({ id: s.id, order: idx })),
          });
        }
      }
    }

    // Lesson Reorder (within same section)
    if (activeData.type === "Lesson" && overData.type === "Lesson") {
      const activeLesson = activeData.lesson;
      const overLesson = overData.lesson;

      if (activeLesson.sectionId === overLesson.sectionId && active.id !== over.id) {
        const section = course?.sections.find((s) => s.id === activeLesson.sectionId);
        if (section) {
          const oldIndex = section.lessons.findIndex((l) => l.id === active.id);
          const newIndex = section.lessons.findIndex((l) => l.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newLessons = arrayMove(section.lessons, oldIndex, newIndex);
            reorderLessonMutation.mutate({
              items: newLessons.map((l, idx) => ({ id: l.id, order: idx })),
            });
          }
        }
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateSection = () => {
    setEditingSection(null);
    sectionForm.reset({ title: "", order: course?.sections.length || 0 });
    setIsSectionDialogOpen(true);
  };

  const openEditSection = (section: any) => {
    setEditingSection(section);
    sectionForm.reset({ title: section.title, order: section.order });
    setIsSectionDialogOpen(true);
  };

  const openCreateLesson = (sectionId: string) => {
    setActiveSectionIdForLesson(sectionId);
    setEditingLesson(null);
    const section = course?.sections.find((s) => s.id === sectionId);
    const order = section?.lessons.length || 0;
    lessonForm.reset({
      title: "",
      description: "",
      videoUrl: "",
      order,
      status: "draft",
    });
    setIsLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    lessonForm.reset({
      title: lesson.title,
      description: lesson.description || "",
      videoUrl: lesson.videoUrl || "",
      order: lesson.order,
      status: lesson.status,
    });
    setIsLessonDialogOpen(true);
  };

  const handleSectionSubmit = (values: SectionFormValues) => {
    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, ...values });
    } else {
      createSectionMutation.mutate({ courseId, ...values });
    }
  };

  const handleLessonSubmit = (values: LessonFormValues) => {
    if (editingLesson) {
      updateLessonMutation.mutate({
        id: editingLesson.id,
        sectionId: editingLesson.sectionId,
        ...values,
      });
    } else if (activeSectionIdForLesson) {
      createLessonMutation.mutate({
        sectionId: activeSectionIdForLesson,
        courseId,
        ...values,
      });
    }
  };

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
        <h2 className="font-semibold text-lg">Course Content</h2>
        <Button onClick={openCreateSection} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Section
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={course?.sections.map((s) => s.id) || []} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {course?.sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                isExpanded={!!expandedSections[section.id]}
                onToggle={() => toggleSection(section.id)}
                onEdit={() => openEditSection(section)}
                onDelete={() => {
                  if (confirm("Are you sure you want to delete this section?")) {
                    deleteSectionMutation.mutate({ id: section.id });
                  }
                }}
                onAddLesson={() => {
                  if (!expandedSections[section.id]) toggleSection(section.id);
                  openCreateLesson(section.id);
                }}
              >
                <SortableContext items={section.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  {section.lessons.length === 0 ? (
                    <div className="py-2 text-center text-muted-foreground text-sm">No lessons in this section.</div>
                  ) : (
                    section.lessons.map((lesson) => (
                      <SortableLesson
                        key={lesson.id}
                        lesson={lesson}
                        sections={course?.sections || []}
                        onEdit={() => openEditLesson(lesson)}
                        onDelete={() => {
                          if (confirm("Are you sure you want to delete this lesson?")) {
                            deleteLessonMutation.mutate({ id: lesson.id });
                          }
                        }}
                        onMove={(targetSectionId) => {
                          updateLessonMutation.mutate({
                            id: lesson.id,
                            sectionId: targetSectionId,
                          });
                        }}
                      />
                    ))
                  )}
                </SortableContext>
              </SortableSection>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>{/* Optional: Add drag overlay for better visual feedback */}</DragOverlay>
      </DndContext>

      {/* Section Dialog */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Create Section"}</DialogTitle>
            <DialogDescription>Sections help organize your course content.</DialogDescription>
          </DialogHeader>
          <Form {...sectionForm}>
            <form onSubmit={sectionForm.handleSubmit(handleSectionSubmit)} className="space-y-4">
              <FormField
                control={sectionForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Section Title" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createSectionMutation.isPending || updateSectionMutation.isPending}>
                  {editingSection ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
            <DialogDescription>Add content to your section.</DialogDescription>
          </DialogHeader>
          <Form {...lessonForm}>
            <form onSubmit={lessonForm.handleSubmit(handleLessonSubmit)} className="space-y-4">
              <FormField<LessonFormValues>
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
              <FormField<LessonFormValues>
                control={lessonForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Lesson description..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField<LessonFormValues>
                  control={lessonForm.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField<LessonFormValues>
                  control={lessonForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value as string | number | null | undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue className={cn(!field.value && "text-muted-foreground")}>
                              {field.value ? undefined : "Select status"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createLessonMutation.isPending || updateLessonMutation.isPending}>
                  {editingLesson ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
