import { utimes } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createContext } from "@mulai-plus/api/context";
import { newsletter } from "@mulai-plus/api/lib/newsletter";
import { appRouter } from "@mulai-plus/api/routers/index";
import { auth } from "@mulai-plus/auth";
import { and, db, eq, lte } from "@mulai-plus/db";
import { cmsArticle } from "@mulai-plus/db/schema/cms";
import { env } from "@mulai-plus/env/server";
import { uploadRouter } from "@mulai-plus/r2";
import { initR2Client } from "@mulai-plus/r2/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Initialize R2 client
initR2Client();

const app = new Hono();

// Mount R2 upload routes FIRST (before middleware catches all)
app.route("/api/upload", uploadRouter);

// Force reload for api router changes
app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// System Restart Endpoint for Admins
app.post("/api/system/restart", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user || session.user.role !== "admin") {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  // Trigger restart by touching the entry file
  // This triggers the file watcher (bun --hot or bun --watch) to reload the server
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const now = new Date();
    await utimes(currentFile, now, now);
    return c.json({ success: true, message: "Server restarting..." });
  } catch (error) {
    console.error("Failed to restart server:", error);
    return c.json({ success: false, message: "Failed to restart server" }, 500);
  }
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

// Mount R2 upload routes
app.get("/", (c) => {
  return c.text("OK");
});

// ── Cron: Auto-publish scheduled articles every 5 minutes ──
setInterval(
  async () => {
    try {
      const now = new Date();
      const scheduled = await db
        .select()
        .from(cmsArticle)
        .where(and(eq(cmsArticle.status, "scheduled"), lte(cmsArticle.scheduledAt, now)))
        .limit(20);

      for (const article of scheduled) {
        // Update status to published
        await db.update(cmsArticle).set({ status: "published", publishedAt: now }).where(eq(cmsArticle.id, article.id));

        // Send newsletter broadcast
        try {
          const typeLabel = article.type === "news" ? "News" : "Artikel";
          const siteUrl = env.APP_URL;
          const articleUrl = `${siteUrl}/blog/${article.type === "news" ? "news" : "articles"}/${article.slug}`;
          const coverImage = article.coverImageUrl
            ? `<img src="${article.coverImageUrl}" alt="${article.title}" style="width:100%;max-width:600px;border-radius:12px;margin:16px 0" />`
            : "";

          await newsletter.sendBroadcastNow({
            name: `${typeLabel} Baru: ${article.title}`,
            subject: `${typeLabel} Baru — ${article.title}`,
            html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="text-align:center;padding:16px 0;border-bottom:2px solid #1A1F6D">
                <h1 style="color:#1A1F6D;font-size:24px;margin:0">MULAI+</h1>
                <p style="color:#888;font-size:12px">Bimbingan Universitas, Jurusan & Beasiswa</p>
              </div>
              ${coverImage}
              <h2 style="color:#1A1F6D;font-size:20px;margin:16px 0 8px">${article.title}</h2>
              ${article.excerpt ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">${article.excerpt}</p>` : ""}
              <div style="margin:24px 0;text-align:center">
                <a href="${articleUrl}" style="display:inline-block;background:#1A1F6D;color:#fff;padding:12px 32px;border-radius:999px;text-decoration:none;font-size:14px">
                  Baca ${typeLabel} Lengkap →
                </a>
              </div>
              <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa">
                <p>Dikirim oleh MULAI+ — ${siteUrl}</p>
                <p><a href="{{{{RESEND_UNSUBSCRIBE_URL}}}}" style="color:#888">Berhenti berlangganan</a></p>
              </div>
            </div>
          `,
            articleId: article.id,
          });
        } catch (err) {
          console.error(`[Cron] Failed to send newsletter for ${article.id}:`, err);
        }
      }

      if (scheduled.length > 0) {
        console.log(`[Cron] Auto-published ${scheduled.length} articles`);
      }
    } catch (err) {
      console.error("[Cron] Error auto-publishing articles:", err);
    }
  },
  5 * 60 * 1000,
); // every 5 minutes

export default {
  port: env.PORT,
  fetch: app.fetch,
};
