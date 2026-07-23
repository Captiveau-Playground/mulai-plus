import { randomUUID } from "node:crypto";
import { asc, db, eq, like } from "@mulai-plus/db";
import { user } from "@mulai-plus/db/schema/auth";
import {
  cmsArticle,
  cmsArticleSeo,
  cmsArticleTag,
  cmsAuthor,
  cmsCategory,
  cmsMedia,
  cmsTag,
} from "@mulai-plus/db/schema/cms";
import { uploadToR2 } from "@mulai-plus/r2/server";
import { z } from "zod";
import { hermesProcedure } from "../index";
import { newsletter } from "../lib/newsletter";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function calculateReadingTime(content: string | null): number {
  if (!content) return 1;
  const text = content.replace(/<[^>]*>/g, ""); // Strip HTML
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// ─── Schemas ─────────────────────────────────────────────────────────────────────

const createArticleSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  coverImageUrl: z.string().optional(),
  coverImageAlt: z.string().optional(),
  type: z.enum(["news", "article"]).default("article"),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
  authorId: z.string().optional(),
  authorUserId: z.string().optional(),
  authorName: z.string().optional(),
  categoryId: z.string().optional(),
  featured: z.boolean().default(false),
  scheduledAt: z.string().datetime().optional(),
  tagIds: z.array(z.string()).optional(),
  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().optional(),
  robots: z.string().optional(),
});

const saveImageSchema = z.object({
  url: z.string().url().optional(),
  base64: z.string().optional(),
  filename: z.string().optional(),
  alt: z.string().optional(),
  path: z.string().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────────

export const hermesRouter = {
  // ── Read: Reference Data ─────────────────────────────────────

  /**
   * Get all active categories (id, name, slug, parentId, sortOrder).
   * Hermes uses this to pick the right categoryId for an article.
   */
  listCategories: hermesProcedure.handler(async () => {
    const rows = await db.query.cmsCategory.findMany({
      where: eq(cmsCategory.isActive, true),
      orderBy: [asc(cmsCategory.sortOrder), asc(cmsCategory.name)],
      columns: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        sortOrder: true,
      },
      with: {
        parent: {
          columns: { id: true, name: true },
        },
      },
    });
    return rows;
  }),

  /**
   * Get all tags (id, name, slug).
   */
  listTags: hermesProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
        })
        .optional(),
    )
    .handler(async ({ input }) => {
      const where = input?.search ? like(cmsTag.name, `%${input.search}%`) : undefined;
      return await db.query.cmsTag.findMany({
        where,
        orderBy: [asc(cmsTag.name)],
        columns: { id: true, name: true, slug: true },
      });
    }),

  /**
   * Get all CMS authors (id, name, slug, bio, avatarUrl, role).
   */
  listAuthors: hermesProcedure.handler(async () => {
    return await db.query.cmsAuthor.findMany({
      orderBy: [asc(cmsAuthor.name)],
      columns: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        avatarUrl: true,
        role: true,
      },
    });
  }),

  // ── Create: Article / News ───────────────────────────────────

  /**
   * Create a CMS article or news via Hermes agent (API key auth).
   * Mirrors cms.articles.admin.create but uses API key instead of session.
   *
   * - type = "article" | "news"
   * - status = "draft" | "scheduled" | "published" | "archived"
   * - Jika status = "published" → auto-send newsletter
   * - Jika status = "scheduled" → cron publish tiap 5 menit
   */
  createArticle: hermesProcedure.input(createArticleSchema).handler(async ({ input }) => {
    const id = randomUUID();

    // ── Slug ──────────────────────────────────────────────────
    let slug = input.slug;
    if (!slug || slug.trim() === "") {
      slug = slugify(input.title);
    }
    const existingSlug = await db.query.cmsArticle.findFirst({
      where: eq(cmsArticle.slug, slug),
      columns: { id: true },
    });
    if (existingSlug) {
      slug = `${slug}-${id.substring(0, 8)}`;
    }

    const readingTimeMinutes = calculateReadingTime(input.content ?? null);
    const now = new Date();

    // ── Author resolution ─────────────────────────────────────
    let resolvedAuthorId = input.authorId;

    if (!resolvedAuthorId && input.authorUserId) {
      const linkedAuthor = await db.query.cmsAuthor.findFirst({
        where: eq(cmsAuthor.userId, input.authorUserId),
        columns: { id: true },
      });
      if (linkedAuthor) {
        resolvedAuthorId = linkedAuthor.id;
      } else {
        const targetUser = await db.query.user.findFirst({
          where: eq(user.id, input.authorUserId),
          columns: { id: true, name: true },
        });
        if (targetUser) {
          const authorId = randomUUID();
          await db.insert(cmsAuthor).values({
            id: authorId,
            name: targetUser.name,
            slug: `${slugify(targetUser.name)}-${authorId.substring(0, 6)}`,
            userId: targetUser.id,
          });
          resolvedAuthorId = authorId;
        }
      }
    }

    if (!resolvedAuthorId && input.authorName) {
      const authorId = randomUUID();
      await db.insert(cmsAuthor).values({
        id: authorId,
        name: input.authorName,
        slug: `${slugify(input.authorName)}-${authorId.substring(0, 6)}`,
      });
      resolvedAuthorId = authorId;
    }

    if (!resolvedAuthorId) {
      throw new Error("Author is required. Provide authorId, authorUserId, or authorName.");
    }

    // ── Transaction ───────────────────────────────────────────
    await db.transaction(async (tx) => {
      await tx.insert(cmsArticle).values({
        id,
        title: input.title,
        slug,
        content: input.content,
        excerpt: input.excerpt,
        coverImageUrl: input.coverImageUrl,
        coverImageAlt: input.coverImageAlt,
        type: input.type,
        status: input.status,
        authorId: resolvedAuthorId,
        categoryId: input.categoryId,
        featured: input.featured,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        readingTimeMinutes,
        publishedAt: input.status === "published" ? now : undefined,
      });

      if (input.metaTitle || input.metaDescription) {
        await tx.insert(cmsArticleSeo).values({
          id: randomUUID(),
          articleId: id,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          metaKeywords: input.metaKeywords,
          ogImageUrl: input.ogImageUrl,
          canonicalUrl: input.canonicalUrl,
          robots: input.robots,
        });
      }

      if (input.tagIds && input.tagIds.length > 0) {
        await tx.insert(cmsArticleTag).values(input.tagIds.map((tagId) => ({ articleId: id, tagId })));
      }
    });

    // ── Newsletter (only if published) ────────────────────────
    if (input.status === "published") {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";
        const articleUrl = `${siteUrl}/blog/${input.type === "news" ? "news" : "articles"}/${slug}`;
        const coverImage = input.coverImageUrl
          ? `<img src="${input.coverImageUrl}" alt="${input.title}" style="width:100%;max-width:600px;border-radius:12px;margin:16px 0" />`
          : "";
        const typeLabel = input.type === "news" ? "News" : "Artikel";

        const broadcastName = `${typeLabel} Baru: ${input.title}`.substring(0, 70);
        await newsletter.sendBroadcastNow({
          name: broadcastName,
          subject: `${typeLabel} Baru — ${input.title}`,
          html: `
              <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="text-align:center;padding:16px 0;border-bottom:2px solid #1A1F6D">
                  <h1 style="color:#1A1F6D;font-size:24px;margin:0">MULAI+</h1>
                  <p style="color:#888;font-size:12px">Bimbingan Universitas, Jurusan & Beasiswa</p>
                </div>
                ${coverImage}
                <h2 style="color:#1A1F6D;font-size:20px;margin:16px 0 8px">${input.title}</h2>
                ${input.excerpt ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">${input.excerpt}</p>` : ""}
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
          articleId: id,
        });

        // Mark newsletter as sent
        await db.update(cmsArticle).set({ newsletterSent: true }).where(eq(cmsArticle.id, id));
      } catch (err) {
        console.error(`[Hermes] Newsletter failed for ${id}:`, err);
      }
    }

    return { success: true, id, slug };
  }),

  // ── Media ────────────────────────────────────────────────────

  /**
   * Download an image from a URL, upload to R2, and create CMS media record.
   * Used by Hermes to persist AI-generated images into the media library.
   */
  saveImage: hermesProcedure.input(saveImageSchema).handler(async ({ input }) => {
    // ── Resolve image buffer ───────────────────────────────────
    let buffer: Buffer;
    let contentType = "image/png";

    if (input.url) {
      const resp = await fetch(input.url);
      if (!resp.ok) {
        throw new Error(`Failed to download image: ${resp.status} ${resp.statusText}`);
      }
      buffer = Buffer.from(await resp.arrayBuffer());
      contentType = resp.headers.get("content-type") || "image/png";
    } else if (input.base64) {
      const match = input.base64.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        contentType = match[1]!;
        buffer = Buffer.from(match[2]!, "base64");
      } else {
        buffer = Buffer.from(input.base64, "base64");
      }
    } else {
      throw new Error("Provide either url or base64");
    }

    // Determine filename & extension
    const ext = contentType.split("/")[1] || "png";
    const filename = input.filename || `hermes-${randomUUID().substring(0, 8)}.${ext}`;

    // ── Upload to R2 ────────────────────────────────────────────
    const uploaded = await uploadToR2(buffer, {
      filename,
      mimeType: contentType,
      path: input.path || "cms",
    });

    // ── Create CMS media record ─────────────────────────────────
    const mediaId = randomUUID();
    await db.insert(cmsMedia).values({
      id: mediaId,
      url: uploaded.url,
      filename: uploaded.filename,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      alt: input.alt || null,
    });

    return {
      success: true,
      mediaId,
      url: uploaded.url,
      key: uploaded.key,
      filename: uploaded.filename,
      size: uploaded.size,
      mimeType: uploaded.mimeType,
    };
  }),
};
