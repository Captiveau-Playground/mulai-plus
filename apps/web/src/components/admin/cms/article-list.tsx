"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, FileText, Globe, Loader2, MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [filters, setFilters] = useState<{
    type?: CmsArticleType;
    status?: CmsArticleStatus;
    search?: string;
  }>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    ...orpc.cms.articles.admin.list.queryOptions({
      type: filters.type,
      status: filters.status,
      search: filters.search,
      limit: pageSize,
      offset: page * pageSize,
    }),
    staleTime: 1000 * 60 * 2,
  });

  const articles = data?.data || [];
  const total = data?.pagination?.total || 0;

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

        <Input
          placeholder="Search title..."
          className="w-[200px]"
          value={filters.search || ""}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
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
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No articles found.{" "}
                  <Button variant="link" className="text-primary" onClick={() => setIsCreateOpen(true)}>
                    Create your first article
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <a
                        href={`/admin/cms/articles/${article.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {article.title}
                      </a>
                      <span className="text-muted-foreground text-xs">{article.slug}</span>
                    </div>
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
                        <DropdownMenuItem>
                          <a href={`/admin/cms/articles/${article.id}`}>
                            <Pencil className="mr-2 inline h-4 w-4" /> Edit
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <a href={`/articles/${article.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-2 inline h-4 w-4" /> View
                          </a>
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
                window.location.href = "/admin/cms/articles/new?type=article";
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
                window.location.href = "/admin/cms/articles/new?type=news";
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
