"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, FileText, Globe, Loader2, MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

type CmsArticleStatus = "draft" | "scheduled" | "published" | "archived";
type CmsArticleType = "news" | "article";

export function ArticleList() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [filters, setFilters] = useState<{
    type?: CmsArticleType;
    status?: CmsArticleStatus;
    search?: string;
    authorId?: string;
    categoryId?: string;
  }>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    ...orpc.cms.articles.admin.list.queryOptions({
      type: filters.type,
      status: filters.status,
      search: filters.search,
      authorId: filters.authorId,
      categoryId: filters.categoryId,
      limit: pageSize,
      offset: page * pageSize,
    }),
    staleTime: 1000 * 60 * 2,
  });

  // Fetch categories & authors for filter dropdowns
  const { data: categories } = useQuery(orpc.cms.categories.admin.list.queryOptions());
  const { data: authors } = useQuery(orpc.cms.authors.admin.list.queryOptions({ input: { roles: [] } }));

  const articles = data?.data || [];
  const total = data?.pagination?.total || 0;

  const allOnPageSelected = articles.length > 0 && articles.every((a) => selected.has(a.id));

  const toggleSelectAll = useCallback(() => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(articles.map((a) => a.id)));
    }
  }, [allOnPageSelected, articles]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const deleteMutation = useMutation(
    orpc.cms.articles.admin.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Article deleted");
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const publishMutation = useMutation(
    orpc.cms.articles.admin.publish.mutationOptions({
      onSuccess: () => {
        toast.success("Article published");
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const unpublishMutation = useMutation(
    orpc.cms.articles.admin.unpublish.mutationOptions({
      onSuccess: () => {
        toast.success("Article unpublished");
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const bulkPublishMutation = useMutation(
    orpc.cms.articles.admin.bulkPublish.mutationOptions({
      onSuccess: () => {
        toast.success("Articles published");
        setSelected(new Set());
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const bulkDeleteMutation = useMutation(
    orpc.cms.articles.admin.bulkDelete.mutationOptions({
      onSuccess: () => {
        toast.success("Articles deleted");
        setSelected(new Set());
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: CmsArticleStatus) => {
    const variants: Record<CmsArticleStatus, "default" | "secondary" | "outline" | "destructive"> = {
      draft: "secondary",
      scheduled: "outline",
      published: "default",
      archived: "destructive",
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Articles</h2>
          <p className="font-manrope text-text-muted-custom">
            Manage news and articles. {total > 0 && `${total} total items`}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="btn-mentor rounded-full">
          <Plus className="mr-2 h-4 w-4" /> New Article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.type || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, type: v === "all" ? undefined : (v as CmsArticleType) }))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="article">Article</SelectItem>
            <SelectItem value="news">News</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === "all" ? undefined : (v as CmsArticleStatus) }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.authorId || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, authorId: v === "all" ? undefined : v }))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Author" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Authors</SelectItem>
            {authors?.map((author: any) => (
              <SelectItem key={author.id} value={author.id}>
                {author.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v === "all" ? undefined : v }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories
              ?.flatMap((cat: any) => [cat, ...(cat.children || [])])
              ?.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search title..."
          className="w-[200px]"
          value={filters.search || ""}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      {/* Batch Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3">
          <span className="font-medium text-primary text-sm">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => bulkPublishMutation.mutate({ ids: Array.from(selected) })}
              disabled={bulkPublishMutation.isPending}
            >
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Publish All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm(`Delete ${selected.size} articles? This cannot be undone.`)) {
                  bulkDeleteMutation.mutate({ ids: Array.from(selected) });
                }
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash className="mr-1.5 h-3.5 w-3.5" />
              Delete All
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No articles found.{" "}
                  <Button variant="link" className="text-primary" onClick={() => setIsCreateOpen(true)}>
                    Create your first article
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id} className={selected.has(article.id) ? "bg-primary/5" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.has(article.id)} onCheckedChange={() => toggleSelect(article.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/cms/articles/${article.id}`)}
                        className="text-left font-medium hover:text-primary hover:underline"
                      >
                        {article.title}
                      </button>
                      <span className="text-muted-foreground text-xs">{article.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs">{article.categoryName || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {article.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(article.status as CmsArticleStatus)}</TableCell>
                  <TableCell className="text-muted-foreground">{article.authorName || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(article.updatedAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/cms/articles/${article.id}`)}>
                          <Pencil className="mr-2 inline h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/articles/${article.slug}`, "_blank")}>
                          <Eye className="mr-2 inline h-4 w-4" /> View
                        </DropdownMenuItem>
                        {article.status === "published" ? (
                          <DropdownMenuItem onClick={() => unpublishMutation.mutate({ id: article.id })}>
                            <Archive className="mr-2 inline h-4 w-4" /> Unpublish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => publishMutation.mutate({ id: article.id })}>
                            <Globe className="mr-2 inline h-4 w-4" /> Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            if (confirm("Are you sure? This action cannot be undone.")) {
                              deleteMutation.mutate({ id: article.id });
                            }
                          }}
                        >
                          <Trash className="mr-2 inline h-4 w-4" /> Delete
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

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Quick Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Article</DialogTitle>
            <DialogDescription>Choose article type to create.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto justify-start py-4 text-left"
              onClick={() => {
                setIsCreateOpen(false);
                router.push("/admin/cms/articles/new?type=article");
              }}
            >
              <FileText className="mr-3 h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Article</div>
                <div className="text-muted-foreground text-sm">
                  Long-form content like guides, tutorials, or opinions
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start py-4 text-left"
              onClick={() => {
                setIsCreateOpen(false);
                router.push("/admin/cms/articles/new?type=news");
              }}
            >
              <FileText className="mr-3 h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">News</div>
                <div className="text-muted-foreground text-sm">
                  Short-form updates, announcements, or press releases
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
