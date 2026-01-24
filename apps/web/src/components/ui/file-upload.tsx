"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
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
  bucket = "test",
  path = "public",
  className,
  disabled,
  accept = "image/*",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debug: Check connectivity and bucket existence on mount
    supabase.storage.listBuckets().then(({ data, error }) => {
      if (error) {
        console.error("Supabase Connectivity/Auth Check Failed:", error);
      } else {
        console.log(
          "Supabase Buckets Available:",
          data?.map((b) => b.name),
        );
        const bucketExists = data?.some((b) => b.name === bucket);
        if (!bucketExists) {
          console.warn(
            `⚠️ Warning: Bucket '${bucket}' not found in public list. If it exists, check RLS policies allow 'SELECT' for anon/public.`,
          );
        }
      }
    });
  }, [bucket]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      console.log(await supabase.storage.listBuckets());

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

      if (uploadError) {
        console.error("Supabase Upload Error Detail:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message} (Code: ${uploadError.name || "Unknown"})`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      // Reset input value to allow re-uploading same file if needed
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
          <img src={value} alt="Upload preview" className="h-full w-full object-cover" />
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
                  <p className="text-muted-foreground text-xs">SVG, PNG, JPG or GIF (max. 2MB)</p>
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
