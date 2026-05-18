/**
 * Server-side R2 Client
 * Handles file uploads, deletions, and presigned URLs on the server
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { R2Config } from "@mulai-plus/env/server";
import { getR2Config } from "@mulai-plus/env/server";
import { nanoid } from "nanoid";

export type { R2Config };

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

let r2Client: S3Client | null = null;
let r2Config: R2Config | null = null;

export function initR2Client(): void {
  const config = getR2Config();

  r2Config = config;
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function getClient(): S3Client {
  if (!r2Client) {
    initR2Client();
  }
  if (!r2Client) {
    throw new Error("Failed to initialize R2 client");
  }
  return r2Client;
}

function getConfig(): R2Config {
  if (!r2Config) {
    initR2Client();
  }
  if (!r2Config) {
    throw new Error("Failed to initialize R2 config");
  }
  return r2Config;
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

export async function uploadToR2(
  file: Buffer | Uint8Array,
  options: {
    filename: string;
    mimeType: string;
    path?: string;
    public?: boolean;
  },
): Promise<UploadResult> {
  const client = getClient();
  const config = getConfig();

  const key = generateFileName(options.filename, options.path);
  const size = file instanceof Buffer ? file.length : file.length;

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: options.mimeType,
    ContentLength: size,
    ACL: options.public !== false ? "public-read" : "private",
    Body: file,
  });

  await client.send(command);

  return {
    url: `${config.publicUrl.replace(/\/$/, "")}/${key}`,
    key,
    filename: options.filename,
    size,
    mimeType: options.mimeType,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getClient();
  const config = getConfig();

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await client.send(command);
}

export async function deleteManyFromR2(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteFromR2(key)));
}

export async function getPresignedDownloadUrl(
  key: string,
  options: {
    expiresIn?: number;
    filename?: string;
  } = {},
): Promise<{ url: string; expiresAt: Date }> {
  const client = getClient();
  const config = getConfig();
  const expiresIn = options.expiresIn || 3600;

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ...(options.filename && {
      ResponseContentDisposition: `attachment; filename="${options.filename}"`,
    }),
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
}

export function getPublicUrl(key: string): string {
  const config = getConfig();
  return `${config.publicUrl.replace(/\/$/, "")}/${key}`;
}

export function extractKeyFromUrl(url: string): string | null {
  const config = getConfig();
  const baseUrl = config.publicUrl.replace(/\/$/, "");

  if (url.startsWith(baseUrl)) {
    return url.slice(baseUrl.length + 1);
  }

  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

export async function listR2Objects(prefix = ""): Promise<string[]> {
  const client = getClient();
  const config = getConfig();

  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: prefix,
  });

  const response = await client.send(command);
  return response.Contents?.map((obj) => obj.Key).filter((key): key is string => Boolean(key)) || [];
}

export interface CleanupResult {
  deletedCount: number;
  failedKeys: string[];
}

export interface R2ObjectMeta {
  key: string;
  size: number;
  lastModified: Date;
  eTag?: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
}

/**
 * Guess MIME type from file extension
 */
function guessMimeType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    avif: "image/avif",
    bmp: "image/bmp",
    ico: "image/x-icon",
    mp4: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    ts: "application/typescript",
  };
  return mimeMap[ext] || "application/octet-stream";
}

/**
 * Convert R2 public URL to CDN URL (cdn.mulaiplus.id)
 */
function toCdnUrl(key: string, publicUrl: string): string {
  // If URL uses r2.dev, replace with CDN
  if (publicUrl.includes(".r2.dev")) {
    return `https://cdn.mulaiplus.id/${key}`;
  }
  return publicUrl;
}

/**
 * List all R2 objects with detailed metadata.
 * Filters out folder placeholders (keys ending with / or zero-size).
 */
export async function listR2ObjectsDetailed(prefix = ""): Promise<R2ObjectMeta[]> {
  const client = getClient();
  const config = getConfig();

  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: prefix,
  });

  const response = await client.send(command);

  const baseUrl = config.publicUrl.replace(/\/$/, "");

  return (
    response.Contents?.filter((obj) => {
      // Skip folder placeholders (keys ending with / or zero-size)
      const key = obj.Key || "";
      return key.length > 0 && !key.endsWith("/") && (obj.Size ?? 0) > 0;
    }).map((obj) => {
      const key = obj.Key!;
      const filename = key.split("/").pop() || key;
      const rawPublicUrl = `${baseUrl}/${key}`;
      return {
        key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
        eTag: obj.ETag,
        publicUrl: toCdnUrl(key, rawPublicUrl),
        filename,
        mimeType: guessMimeType(key),
      };
    }) || []
  );
}

export async function cleanupOrphanedFiles(validKeys: Set<string>): Promise<CleanupResult> {
  const allKeys = await listR2Objects();
  const toDelete = allKeys.filter((key) => !validKeys.has(key));

  const result: CleanupResult = { deletedCount: 0, failedKeys: [] };

  for (const key of toDelete) {
    try {
      await deleteFromR2(key);
      result.deletedCount++;
    } catch (error) {
      result.failedKeys.push(key);
      console.error(`Failed to delete ${key}:`, error);
    }
  }

  return result;
}
