"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File, FileImage, FileText, Upload } from "lucide-react";
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
import { orpc } from "@/utils/orpc";

// Define media type interface
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

export function MediaLibrary() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ mimeType?: string }>({});
  const [page, setPage] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    ...orpc.cms.media.admin.list.queryOptions({
      mimeType: filters.mimeType,
      limit: pageSize,
      offset: page * pageSize,
    }),
    staleTime: 1000 * 60 * 2,
  });

  const mediaItems = data?.data || [];
  const total = data?.pagination?.total || 0;

  // Create media record mutation
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
        setSelectedMedia(null);
        setIsPreviewOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const openPreview = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsPreviewOpen(true);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Upload to R2
        const formData = new FormData();
        formData.append("file", file);
        formData.append("key", "cms/media");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const result = await response.json();

        // Get image dimensions if it's an image
        let width: number | undefined;
        let height: number | undefined;

        if (file.type.startsWith("image/")) {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        }

        // Create media record
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
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : "Failed to upload file";
      toast.error(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Get image dimensions helper
  const getImageDimensions = (file: File): Promise<{ width?: number; height?: number }> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve({});
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Media Library</h2>
          <p className="font-manrope text-text-muted-custom">
            Manage images and files for your content. {total > 0 && `${total} files uploaded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            className="cursor-pointer"
            onClick={() => setIsUploading(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsUploading(true);
              }
            }}
          >
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,application/pdf"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <Button disabled={isUploading}>
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))
        ) : mediaItems.length === 0 ? (
          <div className="col-span-full flex h-48 flex-col items-center justify-center gap-3">
            <File className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No media files yet</p>
          </div>
        ) : (
          mediaItems.map((media) => {
            const mediaItem = media as MediaItem;
            const FileIcon = getFileIcon(mediaItem.mimeType);
            const isImage = media.mimeType?.startsWith("image/");

            return (
              <button
                key={media.id}
                type="button"
                className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border bg-muted/50 p-0 transition-colors hover:border-primary/50"
                onClick={() => openPreview(media)}
              >
                {isImage ? (
                  <Image
                    src={media.url}
                    alt={media.alt || media.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                    <span className="line-clamp-2 text-center text-muted-foreground text-xs">{media.filename}</span>
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="w-full p-2">
                    <span className="block truncate text-white text-xs">{media.filename}</span>
                    <span className="text-white/70 text-xs">{formatFileSize(media.size)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
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

      {/* Preview Dialog */}
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
                if (confirm("Delete this file? This cannot be undone.")) {
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
