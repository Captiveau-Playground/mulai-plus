/**
 * R2 Upload API Router
 * Handles file uploads from the client via server
 */

import { getR2Config } from "@mulai-plus/env/server";
import { Hono } from "hono";
import { deleteFromR2, getPresignedDownloadUrl, uploadToR2 } from "./server";

const upload = new Hono();

// Configure R2 client
let r2Initialized = false;

function ensureR2Initialized() {
  if (!r2Initialized) {
    getR2Config(); // This will validate env config
    r2Initialized = true;
  }
}

// ─── Upload Endpoint ─────────────────────────────────────────────────────────

upload.post("/", async (c) => {
  try {
    ensureR2Initialized();

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const key = formData.get("key") as string | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToR2(buffer, {
      filename: file.name,
      mimeType: file.type,
      path: key ? key.split("/").slice(0, -1).join("/") : undefined,
    });

    return c.json({
      success: true,
      url: result.url,
      key: result.key,
      filename: result.filename,
      size: result.size,
      mimeType: result.mimeType,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return c.json({ error: message }, 500);
  }
});

// ─── Presigned URL Endpoint ────────────────────────────────────────────────────

upload.post("/presign", async (c) => {
  try {
    ensureR2Initialized();

    const body = await c.req.json<{
      filename: string;
      mimeType: string;
      path?: string;
      expiresIn?: number;
    }>();

    if (!body.filename || !body.mimeType) {
      return c.json({ error: "filename and mimeType are required" }, 400);
    }

    // For presigned URLs, we need to implement R2's direct upload
    // This requires a Cloudflare Worker to handle the presigned URL generation
    // For now, return an error indicating this needs server-side setup
    return c.json(
      {
        error: "Presigned uploads require Cloudflare Worker setup. Use direct upload instead.",
      },
      501,
    );
  } catch (error: unknown) {
    console.error("Presign error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate presigned URL";
    return c.json({ error: message }, 500);
  }
});

// ─── Delete Endpoint ──────────────────────────────────────────────────────────

upload.delete("/", async (c) => {
  try {
    ensureR2Initialized();

    const body = await c.req.json<{ key: string }>();

    if (!body.key) {
      return c.json({ error: "key is required" }, 400);
    }

    await deleteFromR2(body.key);

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete error:", error);
    const message = error instanceof Error ? error.message : "Delete failed";
    return c.json({ error: message }, 500);
  }
});

// ─── Get Download URL (for private files) ─────────────────────────────────────

upload.post("/download-url", async (c) => {
  try {
    ensureR2Initialized();

    const body = await c.req.json<{
      key: string;
      filename?: string;
      expiresIn?: number;
    }>();

    if (!body.key) {
      return c.json({ error: "key is required" }, 400);
    }

    const result = await getPresignedDownloadUrl(body.key, {
      filename: body.filename,
      expiresIn: body.expiresIn || 3600,
    });

    return c.json(result);
  } catch (error: unknown) {
    console.error("Download URL error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate download URL";
    return c.json({ error: message }, 500);
  }
});

export { upload as uploadRouter };
