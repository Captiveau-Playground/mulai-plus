"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  published: z.boolean(),
  userId: z.string().optional(),
  tags: z.array(z.string()),
  benefits: z.array(z.string()),
  price: z.coerce.number().min(0).default(0),
  discountType: z.enum(["fixed", "percentage"]).default("fixed"),
  discountValue: z.coerce.number().min(0).default(0),
});

type CourseFormValues = z.infer<typeof courseSchema>;

interface CourseSettingsProps {
  courseId: string;
}

export function CourseSettings({ courseId }: CourseSettingsProps) {
  const queryClient = useQueryClient();
  const { data: course, isLoading: isCourseLoading } = useQuery(
    orpc.lms.course.get.queryOptions({ input: { id: courseId } }),
  );
  const { data: categories } = useQuery(orpc.lms.category.list.queryOptions());
  const { data: tags } = useQuery(orpc.lms.tag.list.queryOptions());
  const { data: mentors } = useQuery(orpc.lms.mentors.list.queryOptions());

  const createTagMutation = useMutation(
    orpc.lms.tag.create.mutationOptions({
      onSuccess: () => {
        toast.success("Tag created");
        queryClient.invalidateQueries({ queryKey: orpc.lms.tag.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const [tagSearch, setTagSearch] = useState("");

  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      categoryId: undefined,
      thumbnailUrl: "",
      published: false,
      userId: undefined,
      tags: [],
      benefits: [],
      price: 0,
      discountType: "fixed",
      discountValue: 0,
    },
  });

  useEffect(() => {
    if (course) {
      form.reset({
        title: course.title,
        slug: course.slug,
        description: course.description || "",
        categoryId: course.categoryId || undefined,
        thumbnailUrl: course.thumbnailUrl || "",
        published: course.published,
        userId: course.userId || undefined,
        tags: course.tags?.map((t) => t.tagId) || [],
        benefits: course.benefits || [],
        price: course.price || 0,
        discountType: (course.discountType as "fixed" | "percentage") || "fixed",
        discountValue: course.discountValue || 0,
      });
    }
  }, [course, form]);

  const updateMutation = useMutation(
    orpc.lms.course.update.mutationOptions({
      onSuccess: () => {
        toast.success("Course settings updated");
        queryClient.invalidateQueries({ queryKey: orpc.lms.course.get.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const onSubmit = (values: CourseFormValues) => {
    updateMutation.mutate({
      id: courseId,
      ...values,
    });
  };

  const [benefitInput, setBenefitInput] = useState("");

  const addBenefit = () => {
    if (!benefitInput.trim()) return;
    const currentBenefits = form.getValues("benefits");
    form.setValue("benefits", [...currentBenefits, benefitInput.trim()]);
    setBenefitInput("");
  };

  const removeBenefit = (index: number) => {
    const currentBenefits = form.getValues("benefits");
    form.setValue(
      "benefits",
      currentBenefits.filter((_, i) => i !== index),
    );
  };

  if (isCourseLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-lg">Course Settings</h3>
        <p className="text-muted-foreground text-sm">Manage your course details and configuration.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Course Title"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (!course?.published) {
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)+/g, "");
                        form.setValue("slug", slug);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="course-slug" {...field} />
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
                  <Textarea placeholder="Course description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="w-full!">
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value
                            ? categories?.find((c) => c.id === field.value)?.name ||
                              (field.value === course?.categoryId ? course?.category?.name : field.value)
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
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
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor (Admin/Mentor)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value
                            ? mentors?.find((u) => u.id === field.value)?.name ||
                              (field.value === course?.userId ? course?.user?.name : field.value)
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mentors?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
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
            name="thumbnailUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thumbnail URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormDescription>URL to the course poster image.</FormDescription>
                <FormMessage />
                {field.value && (
                  <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                    {/* biome-ignore lint/performance/noImgElement: rendering arbitrary external urls */}
                    <img
                      key={field.value}
                      src={field.value}
                      alt="Course thumbnail"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (IDR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={(field.value as string | number) ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Discount</FormLabel>
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem className="w-[130px]">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed (Rp)</SelectItem>
                          <SelectItem value="percentage">Percent (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          value={(field.value as string | number) ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Final Price:</span>
              <span className="font-bold text-primary text-xl">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(
                  (() => {
                    const price = Number(form.watch("price") || 0);
                    const type = form.watch("discountType");
                    const value = Number(form.watch("discountValue") || 0);
                    if (type === "percentage") {
                      return Math.max(0, price - (price * value) / 100);
                    }
                    return Math.max(0, price - value);
                  })(),
                )}
              </span>
            </div>
          </div>

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Tags</FormLabel>
                <Popover>
                  <FormControl>
                    <PopoverTrigger
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full justify-between",
                        !field.value?.length && "text-muted-foreground",
                      )}
                    >
                      {field.value?.length ? `${field.value.length} tags selected` : "Select tags"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                  </FormControl>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search tags..." value={tagSearch} onValueChange={setTagSearch} />
                      <CommandList>
                        <CommandEmpty>
                          {tagSearch ? (
                            <div className="p-1">
                              <Button
                                variant="ghost"
                                className="h-8 w-full justify-start text-sm"
                                onClick={() => {
                                  createTagMutation.mutate(
                                    {
                                      name: tagSearch,
                                      slug: tagSearch.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                                    },
                                    {
                                      onSuccess: (data) => {
                                        // biome-ignore lint/suspicious/noExplicitAny: inferring type from mutation result
                                        const newTagId = (data as any).id;
                                        if (newTagId) {
                                          const current = new Set(form.getValues("tags"));
                                          current.add(newTagId);
                                          form.setValue("tags", Array.from(current));
                                          setTagSearch("");
                                        }
                                      },
                                    },
                                  );
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create tag "{tagSearch}"
                              </Button>
                            </div>
                          ) : (
                            "No tag found."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {tags?.map((tag) => (
                            <CommandItem
                              value={tag.name}
                              key={tag.id}
                              onSelect={() => {
                                const current = new Set(field.value);
                                if (current.has(tag.id)) {
                                  current.delete(tag.id);
                                } else {
                                  current.add(tag.id);
                                }
                                form.setValue("tags", Array.from(current));
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value?.includes(tag.id) ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {tag.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="mt-2 flex flex-wrap gap-2">
                  {field.value?.map((tagId) => {
                    const tag = tags?.find((t) => t.id === tagId);
                    return tag ? (
                      <Badge key={tagId} variant="secondary">
                        {tag.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="benefits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Benefits / Badges</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    placeholder="e.g. Certificate of Completion"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBenefit();
                      }
                    }}
                  />
                  <Button type="button" onClick={addBenefit} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {field.value.map((benefit, index) => (
                    <Badge
                      // biome-ignore lint/suspicious/noArrayIndexKey: benefits are simple strings without ids
                      key={`${benefit}-${index}`}
                      variant="outline"
                      className="py-1 pr-1 pl-2"
                    >
                      {benefit}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-4 w-4 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={() => removeBenefit(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="published"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Published</FormLabel>
                  <FormDescription>Make this course visible to students.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
}
