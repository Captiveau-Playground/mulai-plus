"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Instagram, Linkedin, Loader2, MoreHorizontal, Pencil, Plus, Trash, Twitter, User } from "lucide-react";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

const authorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.enum(["editor", "admin", "contributor"]).default("contributor"),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
});

type AuthorFormValues = z.infer<typeof authorSchema>;

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function AuthorList() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any | null>(null);

  const { data: authors, isLoading } = useQuery(orpc.cms.authors.admin.listAuthors.queryOptions());

  const createMutation = useMutation(
    orpc.cms.authors.admin.create.mutationOptions({
      onSuccess: () => {
        toast.success("Author created");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: orpc.cms.authors.admin.listAuthors.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.cms.authors.admin.update.mutationOptions({
      onSuccess: () => {
        toast.success("Author updated");
        setEditingAuthor(null);
        queryClient.invalidateQueries({ queryKey: orpc.cms.authors.admin.listAuthors.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.cms.authors.admin.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Author deleted");
        queryClient.invalidateQueries({ queryKey: orpc.cms.authors.admin.listAuthors.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<AuthorFormValues>({
    resolver: standardSchemaResolver(authorSchema) as any,
    defaultValues: {
      name: "",
      slug: "",
      bio: "",
      avatarUrl: "",
      role: "contributor",
      socialLinks: {},
    },
  });

  const onSubmit = (values: AuthorFormValues) => {
    if (editingAuthor) {
      updateMutation.mutate({ id: editingAuthor.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openCreateDialog = () => {
    setEditingAuthor(null);
    form.reset({ name: "", slug: "", bio: "", avatarUrl: "", role: "contributor", socialLinks: {} });
    setIsCreateOpen(true);
  };

  const openEditDialog = (author: any) => {
    setEditingAuthor(author);
    form.reset({
      name: author.name,
      slug: author.slug,
      bio: author.bio || "",
      avatarUrl: author.avatarUrl || "",
      role: author.role || "contributor",
      socialLinks: author.socialLinks || {},
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const roleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      editor: "secondary",
      contributor: "outline",
    };
    return <Badge variant={variants[role] || "outline"}>{role}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Authors</h2>
          <p className="font-manrope text-text-muted-custom">Manage content authors and their profiles.</p>
        </div>
        <Button onClick={openCreateDialog} className="btn-mentor rounded-full">
          <Plus className="mr-2 h-4 w-4" /> New Author
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : authors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No authors yet.
                </TableCell>
              </TableRow>
            ) : (
              authors?.map((author: any) => (
                <TableRow key={author.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {author.avatarUrl ? (
                        <img src={author.avatarUrl} alt={author.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{author.name}</span>
                        {author.bio && (
                          <span className="max-w-[300px] truncate text-muted-foreground text-xs">{author.bio}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs">{author.slug}</span>
                  </TableCell>
                  <TableCell>{roleBadge(author.role)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(author)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            if (confirm(`Delete "${author.name}"?`)) {
                              deleteMutation.mutate({ id: author.id });
                            }
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingAuthor}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingAuthor(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAuthor ? "Edit Author" : "Create Author"}</DialogTitle>
            <DialogDescription>
              {editingAuthor ? "Update author profile details." : "Add a new content author."}
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
                      <Input
                        placeholder="Author name"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!form.getValues("slug")) {
                            form.setValue("slug", slugify(e.target.value));
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
                      <Input placeholder="author-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Short bio..." {...field} className="min-h-[80px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <span className="font-medium text-sm">Social Links</span>
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="socialLinks.instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Instagram className="h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Instagram URL" {...field} value={field.value || ""} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialLinks.linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Linkedin className="h-4 w-4 text-muted-foreground" />
                            <Input placeholder="LinkedIn URL" {...field} value={field.value || ""} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Twitter className="h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Twitter URL" {...field} value={field.value || ""} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialLinks.website"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Website URL" {...field} value={field.value || ""} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingAuthor(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAuthor ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
