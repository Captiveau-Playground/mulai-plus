"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, GripVertical, Loader2, MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

type CategoryWithChildren = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: CategoryWithChildren[];
};

function CategoryItem({
  category,
  onEdit,
  onDelete,
}: {
  category: CategoryWithChildren;
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (id: string) => void;
}) {
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="border-gray-100 border-b last:border-b-0">
      <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">{category.name}</span>
            <span className="text-muted-foreground text-xs">{category.slug}</span>
          </div>
          {!category.isActive && (
            <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">Inactive</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChildren && (
            <span className="text-muted-foreground text-xs">{category.children?.length} subcategories</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => {
                  if (confirm(`Delete "${category.name}"?`)) {
                    onDelete(category.id);
                  }
                }}
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {hasChildren && (
        <div className="ml-8 border-gray-100 border-l-2">
          {category.children?.map((child) => (
            <CategoryItem key={child.id} category={child} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryList() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null);
  const [_parentId, setParentId] = useState<string | undefined>(undefined);

  const { data: categories, isLoading } = useQuery(orpc.cms.categories.admin.list.queryOptions());

  const createMutation = useMutation(
    orpc.cms.categories.admin.create.mutationOptions({
      onSuccess: () => {
        toast.success("Category created");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: orpc.cms.categories.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.cms.categories.admin.update.mutationOptions({
      onSuccess: () => {
        toast.success("Category updated");
        setEditingCategory(null);
        queryClient.invalidateQueries({ queryKey: orpc.cms.categories.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.cms.categories.admin.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Category deleted");
        queryClient.invalidateQueries({ queryKey: orpc.cms.categories.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      parentId: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openCreateDialog = (parentId?: string) => {
    setParentId(parentId);
    setEditingCategory(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
      parentId: parentId || "",
      sortOrder: 0,
      isActive: true,
    });
    setIsCreateOpen(true);
  };

  const openEditDialog = (category: CategoryWithChildren) => {
    setEditingCategory(category);
    setParentId(undefined);
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      parentId: category.parentId || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Build flat list of all categories for parent selection
  const flatCategories = categories?.flatMap((cat: CategoryWithChildren) => [cat, ...(cat.children || [])]) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Categories</h2>
          <p className="font-manrope text-text-muted-custom">Organize articles into categories and subcategories.</p>
        </div>
        <Button onClick={() => openCreateDialog()} className="btn-mentor rounded-full">
          <Plus className="mr-2 h-4 w-4" /> New Category
        </Button>
      </div>

      {/* Category List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories?.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No categories yet</p>
            <Button variant="outline" onClick={() => openCreateDialog()}>
              Create your first category
            </Button>
          </div>
        ) : (
          <div>
            {categories?.map((category: CategoryWithChildren) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={openEditDialog}
                onDelete={(id) => deleteMutation.mutate({ id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category details." : "Add a new category to organize your content."}
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
                      <Input placeholder="Category name" {...field} />
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
                      <Input placeholder="category-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None (top-level)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None (top-level)</SelectItem>
                        {flatCategories
                          .filter((c: CategoryWithChildren) => c.id !== editingCategory?.id)
                          .map((cat: CategoryWithChildren) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Visible in article selection</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingCategory(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
