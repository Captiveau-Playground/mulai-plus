/**
 * Client-side R2 Upload Client
 * Handles uploads from the browser using presigned URLs
 */

import { nanoid } from "nanoid";

export interface R2ClientConfig {
  uploadEndpoint: string; // API endpoint for uploads
}

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface PresignedUploadRequest {
  filename: string;
  mimeType: string;
  path?: string;
}

let r2ClientConfig: R2ClientConfig | null = null;

export function initR2Client(config: R2ClientConfig) {
  r2ClientConfig = config;
}

function getConfig(): R2ClientConfig {
  if (!r2ClientConfig) {
    throw new Error("R2 client not initialized. Call initR2Client() first.");
  }
  return r2ClientConfig;
}

function generateFileName(originalName: string, prefix?: string): string {
  const id = nanoid(12);
  const ext = originalName.split(".").pop() || "";
  const baseName =
    originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 50) || "file";
  return prefix ? `${prefix}/${id}-${baseName}${ext ? `.${ext}` : ""}` : `${id}-${baseName}${ext ? `.${ext}` : ""}`;
}

async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
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
}

/**
 * Upload file to R2 via server endpoint
 */
export async function uploadToR2(
  file: File,
  options: {
    path?: string;
    onProgress?: (progress: number) => void;
  } = {},
): Promise<UploadResult> {
  const config = getConfig();
  const key = generateFileName(file.name, options.path);
  const { width, height } = await getImageDimensions(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress((e.loaded / e.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve({
            url: result.url,
            key: result.key,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            width,
            height,
          });
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));

    xhr.open("POST", config.uploadEndpoint);
    xhr.send(formData);
  });
}

/**
 * Upload file using fetch (without progress)
 */
export async function uploadToR2Simple(
  file: File,
  options: {
    path?: string;
  } = {},
): Promise<UploadResult> {
  const config = getConfig();
  const key = generateFileName(file.name, options.path);
  const { width, height } = await getImageDimensions(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);

  const response = await fetch(config.uploadEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    url: result.url,
    key: result.key,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
    width,
    height,
  };
}

/**
 * Get a presigned URL for direct browser upload to R2
 */
export async function getPresignedUploadUrl(
  request: PresignedUploadRequest,
): Promise<{ uploadUrl: string; key: string }> {
  const config = getConfig();

  const response = await fetch(`${config.uploadEndpoint}/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to get presigned URL: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload directly to R2 using a presigned URL (bypasses our server)
 */
export async function uploadToR2Direct(
  file: File,
  uploadUrl: string,
  options: {
    onProgress?: (progress: number) => void;
  } = {},
): Promise<void> {
  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress((e.loaded / e.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/**
 * Extract R2 key from URL
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

/**
 * Check if URL is from R2 (based on pattern)
 */
export function isR2Url(url: string, publicUrlPattern?: string): boolean {
  if (publicUrlPattern) {
    return url.startsWith(publicUrlPattern);
  }
  // Generic check for R2 domains
  return url.includes(".r2.cloudflarestorage.com") || url.includes("/cdn-cgi/");
}
