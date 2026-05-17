/**
 * R2 Upload API - Direct upload endpoint via Hono
 *
 * Security: Auth handled by client-side (TanStack Query + ORPC auth cookies)
 * - POST/DELETE: Only accessible by authenticated admin users (via client calls)
 * - GET: Public (R2 files are public-read by default)
 */

import { getR2Config } from "@mulai-plus/env/server";
import { Hono } from "hono";
import { deleteFromR2, uploadToR2 } from "./server";

const upload = new Hono();

// CORS middleware
upload.use("/*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "*");

  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  await next();
});

let r2Initialized = false;

function ensureR2Initialized() {
  if (!r2Initialized) {
    try {
      getR2Config();
      r2Initialized = true;
    } catch {
      // Env not configured yet
    }
  }
}

// POST / - Upload file
upload.post("/", async (c) => {
  ensureR2Initialized();

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const key = formData.get("key") as string | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToR2(buffer, {
      filename: file.name,
      mimeType: file.type,
      path: key ? key.split("/").slice(0, -1).join("/") : undefined,
    });

    // Replace r2.dev URL with custom CDN domain for development
    let finalUrl = result.url;
    if (result.url.includes(".r2.dev")) {
      const keyPart = result.url.split(".r2.dev/")[1] || result.key;
      finalUrl = `https://cdn.mulaiplus.id/${keyPart}`;
    }

    return c.json({
      success: true,
      url: finalUrl,
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

// DELETE / - Delete file
upload.delete("/", async (c) => {
  ensureR2Initialized();

  try {
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

export { upload as uploadRouter };
