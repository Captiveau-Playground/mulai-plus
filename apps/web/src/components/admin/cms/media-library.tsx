"use client";

import { env } from "@mulai-plus/env/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, Database, File, FileImage, FileText, Folder, RefreshCw, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return FileText;
  return File;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MediaLibrary() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ mimeType?: string }>({});
  const [page, setPage] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("library");
  const [bucketPage, setBucketPage] = useState(0);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 30;
  const UPLOAD_ENDPOINT = `${env.NEXT_PUBLIC_SERVER_URL}/api/upload`;

  // ── Folders ────────────────────────────────────────────────────────────

  const { data: folders = [] } = useQuery({
    ...orpc.cms.media.admin.listFolders.queryOptions(),
    staleTime: 1000 * 60 * 5,
    enabled: activeTab === "library",
  });

  // ── Library (DB) Queries ────────────────────────────────────────────────

  const { data: libraryData, isLoading: libraryLoading } = useQuery({
    ...orpc.cms.media.admin.list.queryOptions({
      mimeType: filters.mimeType,
      prefix: selectedFolder || undefined,
      limit: pageSize,
      offset: page * pageSize,
    }),
    staleTime: 1000 * 60 * 2,
    enabled: activeTab === "library",
  });

  const mediaItems = libraryData?.data || [];
  const total = libraryData?.pagination?.total || 0;

  // ── Bucket (R2) Queries ─────────────────────────────────────────────────

  const { data: bucketData, isLoading: bucketLoading } = useQuery({
    ...orpc.cms.media.admin.listBucket.queryOptions({
      prefix: undefined,
      limit: pageSize,
      offset: bucketPage * pageSize,
    }),
    staleTime: 1000 * 60 * 2,
    enabled: activeTab === "bucket",
  });

  const bucketObjects = bucketData?.data || [];
  const bucketTotal = bucketData?.pagination?.total || 0;

  // ── Bucket Stats ────────────────────────────────────────────────────────

  const { data: bucketStats } = useQuery({
    ...orpc.cms.media.admin.bucketStats.queryOptions(),
    staleTime: 1000 * 60 * 5,
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const createMediaMutation = useMutation(
    orpc.cms.media.admin.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.cms.media.admin.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Media deleted");
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.list.key() });
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.listFolders.key() });
        setSelectedMedia(null);
        setIsPreviewOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const syncFromR2Mutation = useMutation(
    orpc.cms.media.admin.syncFromR2.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.list.key() });
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.listFolders.key() });
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.bucketStats.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteFromBucketMutation = useMutation(
    orpc.cms.media.admin.deleteFromBucket.mutationOptions({
      onSuccess: () => {
        toast.success("File deleted from R2");
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.listBucket.key() });
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.list.key() });
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.bucketStats.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const bulkDeleteMutation = useMutation(
    orpc.cms.media.admin.bulkDelete.mutationOptions({
      onSuccess: () => {
        toast.success("Selected items deleted");
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.list.key() });
        queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.listFolders.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  const openPreview = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsPreviewOpen(true);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("key", "cms/media");

        const response = await fetch(UPLOAD_ENDPOINT, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const result = await response.json();

        let width: number | undefined;
        let height: number | undefined;

        if (file.type.startsWith("image/")) {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        }

        await createMediaMutation.mutateAsync({
          url: result.url,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          width,
          height,
        });
      }

      toast.success("File(s) uploaded successfully");
      queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.list.key() });
      queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.listFolders.key() });
      queryClient.invalidateQueries({ queryKey: orpc.cms.media.admin.bucketStats.key() });
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : "Failed to upload file";
      toast.error(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const getImageDimensions = (file: File): Promise<{ width?: number; height?: number }> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve({});
        return;
      }

      const img = document.createElement("img");
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSync = () => {
    syncFromR2Mutation.mutate({});
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(mediaItems.map((m) => (m as MediaItem).id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (confirm(`Delete ${count} selected item(s)? This cannot be undone.`)) {
      bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Media Library</h2>
          <p className="font-manrope text-text-muted-custom">
            {activeTab === "library"
              ? `Manage images and files for your content. ${total > 0 ? `${total} files` : ""}`
              : `Browse files directly from R2 bucket. ${bucketTotal > 0 ? `${bucketTotal} objects` : ""}`}
          </p>
          {bucketStats && (
            <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" /> DB: {bucketStats.database.totalRecords} records
              </span>
              <span className="flex items-center gap-1">
                <Cloud className="h-3 w-3" /> R2: {bucketStats.bucket.totalFiles} files
              </span>
              <span>{formatFileSize(bucketStats.bucket.totalSize || 0)} total</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              const input = document.getElementById("file-upload");
              if (input) input.click();
            }}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncFromR2Mutation.isPending}>
            {syncFromR2Mutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync R2
          </Button>
        </div>
      </div>

      {/* Tabs: Library | R2 Bucket */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="library" className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Library
            </TabsTrigger>
            <TabsTrigger value="bucket" className="flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5" /> R2 Bucket
            </TabsTrigger>
          </TabsList>

          {/* Filters (only for library) */}
          {activeTab === "library" && (
            <Select
              value={filters.mimeType || "all"}
              onValueChange={(v) => setFilters({ mimeType: v === "all" ? undefined : v || undefined })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image/">Images</SelectItem>
                <SelectItem value="video/">Videos</SelectItem>
                <SelectItem value="application/pdf">PDFs</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ── Library (DB) Grid ───────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div className="mt-4">
            {/* Folder Navigation */}
            {folders.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Folder className="mr-1 h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolder(null);
                    setPage(0);
                  }}
                  className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
                    !selectedFolder
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => {
                      setSelectedFolder(folder);
                      setPage(0);
                    }}
                    className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
                      selectedFolder === folder
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    📁 {folder}
                  </button>
                ))}
              </div>
            )}

            {/* Selection Bar */}
            {selectedIds.size > 0 && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-2 px-3">
                <span className="font-medium text-sm">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All ({total})
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete {selectedIds.size}
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {mediaItems.length === 0 && !libraryLoading && (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <File className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  {selectedFolder
                    ? `No files in "${selectedFolder}" folder`
                    : "No media files yet. Upload or sync from R2."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {libraryLoading
                ? Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
                  ))
                : mediaItems.map((media) => {
                    const mediaItem = media as MediaItem;
                    const FileIcon = getFileIcon(mediaItem.mimeType);
                    const isImage = mediaItem.mimeType?.startsWith("image/");

                    return (
                      <div key={mediaItem.id} className="group relative aspect-square">
                        {/* Selection Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(mediaItem.id);
                          }}
                          className={`absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded border-2 shadow-sm transition-all ${
                            selectedIds.has(mediaItem.id)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white/60 bg-black/20 text-transparent opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {selectedIds.has(mediaItem.id) && (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          className="w-full cursor-pointer overflow-hidden rounded-lg border bg-muted/50 p-0 transition-colors hover:border-primary/50"
                          onClick={() => openPreview(mediaItem)}
                          style={{ height: "100%" }}
                        >
                          {isImage ? (
                            <Image
                              src={mediaItem.url}
                              alt={mediaItem.alt || mediaItem.filename}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                              <FileIcon className="h-12 w-12 text-muted-foreground" />
                              <span className="line-clamp-2 text-center text-muted-foreground text-xs">
                                {mediaItem.filename}
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="w-full p-2">
                              <span className="block truncate text-white text-xs">{mediaItem.filename}</span>
                              <span className="text-white/70 text-xs">{formatFileSize(mediaItem.size)}</span>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-between pt-4">
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
          </div>
        )}

        {/* ── R2 Bucket Grid ──────────────────────────────────────────────── */}
        {activeTab === "bucket" && (
          <div className="mt-4">
            {bucketLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : bucketObjects.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <Cloud className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">R2 bucket is empty</p>
                <Button variant="outline" size="sm" onClick={handleSync}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Sync to Library
                </Button>
              </div>
            ) : (
              <>
                {/* Bucket stats row */}
                <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{bucketTotal} objects</span>
                  <span className="text-muted-foreground">
                    | Images: {bucketObjects.filter((o) => o.mimeType.startsWith("image/")).length}
                    {" | "}
                    Total: {formatFileSize(bucketObjects.reduce((sum, o) => sum + o.size, 0))}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {bucketObjects.map((obj) => {
                    const item = obj;
                    const FileIcon = getFileIcon(item.mimeType);
                    const isImage = item.mimeType.startsWith("image/");

                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors hover:border-primary/30 hover:shadow-sm"
                      >
                        {/* Preview */}
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
                          {isImage ? (
                            <Image
                              src={item.publicUrl}
                              alt={item.filename}
                              fill
                              className="object-cover"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <FileIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm" title={item.key}>
                            {item.filename}
                          </p>
                          <p className="truncate text-muted-foreground text-xs">
                            {formatFileSize(item.size)} ·{" "}
                            {item.key.split("/").length > 1 ? item.key.split("/").slice(0, -1).join("/") : "/"}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-shrink-0 gap-1">
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Copy URL"
                            onClick={() => copyUrl(item.publicUrl)}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                            title="Delete from R2"
                            onClick={() => {
                              if (confirm(`Delete "${item.filename}" from R2? This cannot be undone.`)) {
                                deleteFromBucketMutation.mutate({ key: item.key });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {bucketTotal > pageSize && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-muted-foreground text-sm">
                      Showing {bucketPage * pageSize + 1} to {Math.min((bucketPage + 1) * pageSize, bucketTotal)} of{" "}
                      {bucketTotal}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBucketPage((p) => Math.max(0, p - 1))}
                        disabled={bucketPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBucketPage((p) => p + 1)}
                        disabled={(bucketPage + 1) * pageSize >= bucketTotal}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Tabs>

      {/* ── Preview Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.filename}</DialogTitle>
            <DialogDescription>{formatFileSize(selectedMedia?.size || 0)}</DialogDescription>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              {selectedMedia.mimeType?.startsWith("image/") ? (
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={selectedMedia.url}
                    alt={selectedMedia.alt || selectedMedia.filename}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg bg-muted">
                  {React.createElement(getFileIcon(selectedMedia.mimeType), {
                    className: "h-16 w-16 text-muted-foreground",
                  })}
                  <span className="text-muted-foreground">{selectedMedia.mimeType}</span>
                </div>
              )}

              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URL</span>
                  <button
                    type="button"
                    onClick={() => copyUrl(selectedMedia.url)}
                    className="max-w-[300px] truncate text-primary hover:underline"
                  >
                    {selectedMedia.url}
                  </button>
                </div>
                {selectedMedia.width && selectedMedia.height && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span>
                      {selectedMedia.width} x {selectedMedia.height}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this file? This cannot be undone.") && selectedMedia) {
                  deleteMutation.mutate({ id: selectedMedia.id });
                }
              }}
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => copyUrl(selectedMedia?.url || "")}>
              Copy URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
