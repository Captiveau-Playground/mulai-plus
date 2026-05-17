"use client";

import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  bucket?: string;
  path?: string; // folder path inside bucket
  className?: string;
  disabled?: boolean;
  accept?: string;
}

export function FileUpload({
  value,
  onChange,
  onRemove,
  path = "media",
  className,
  disabled,
  accept = "image/*",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (path) {
        formData.append("key", path);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const result = await response.json();
      onChange(result.url);
      toast.success("File uploaded successfully");
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : "Failed to upload file";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
    onRemove?.();
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <div className="group relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
          <Image src={value} alt="Upload preview" fill className="object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button type="button" variant="destructive" size="sm" onClick={handleRemove} disabled={disabled}>
              <X className="mr-2 h-4 w-4" />
              Remove Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <label
            className={cn(
              "flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed bg-muted/50 transition-colors hover:bg-muted",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="mb-2 text-muted-foreground text-sm">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-muted-foreground text-xs">SVG, PNG, JPG, GIF or WebP (max. 10MB)</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={disabled || isUploading}
              accept={accept}
            />
          </label>
        </div>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
