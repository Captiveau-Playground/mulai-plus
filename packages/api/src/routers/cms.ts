import { randomUUID } from "node:crypto";
import { and, asc, count, db, desc, eq, inArray, isNull, ne } from "@mulai-plus/db";
import {
  cmsArticle,
  cmsArticleSeo,
  cmsArticleTag,
  cmsAuthor,
  cmsCategory,
  cmsMedia,
  cmsTag,
  newsletterSubscriber,
} from "@mulai-plus/db/schema/cms";
import { z } from "zod";
import { adminOrProgramManagerProcedure, publicProcedure } from "../index";

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

// ─── Helper ────────────────────────────────────────────────────────────────────

function calculateReadingTime(content: string | null): number {
  if (!content) return 1;
  const text = content.replace(/<[^>]*>/g, ""); // Strip HTML
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// ─── Articles Router ───────────────────────────────────────────────────────────

export const articlesRouter = {
  public: {
    list: publicProcedure
      .input(
        z
          .object({
            type: z.enum(["news", "article"]).optional(),
            categorySlug: z.string().optional(),
            tagSlug: z.string().optional(),
            authorSlug: z.string().optional(),
            featured: z.boolean().optional(),
            limit: z.number().default(10),
            offset: z.number().default(0),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        const limit = input?.limit ?? 10;
        const offset = input?.offset ?? 0;

        // For now, simple query - we'll enhance with relations later
        const conditions = [eq(cmsArticle.status, "published")];

        if (input?.type) {
          conditions.push(eq(cmsArticle.type, input.type));
        }

        if (input?.featured) {
          conditions.push(eq(cmsArticle.featured, true));
        }

        const whereClause = and(...conditions);

        const items = await db.query.cmsArticle.findMany({
          where: whereClause,
          limit,
          offset,
          orderBy: [desc(cmsArticle.publishedAt)],
          with: {
            author: true,
            category: true,
            tags: {
              with: {
                tag: true,
              },
            },
          },
        });

        const [total] = await db.select({ count: count() }).from(cmsArticle).where(whereClause);

        return {
          data: items,
          pagination: {
            total: total?.count ?? 0,
            limit,
            offset,
          },
        };
      }),

    get: publicProcedure.input(z.object({ slug: z.string() })).handler(async ({ input }) => {
      const item = await db.query.cmsArticle.findFirst({
        where: and(eq(cmsArticle.slug, input.slug), eq(cmsArticle.status, "published")),
        with: {
          author: true,
          category: true,
          tags: {
            with: {
              tag: true,
            },
          },
          seo: true,
        },
      });

      if (!item) {
        throw new Error("Article not found");
      }

      return item;
    }),

    getRelated: publicProcedure
      .input(
        z.object({
          articleId: z.string(),
          limit: z.number().default(5),
        }),
      )
      .handler(async ({ input }) => {
        const article = await db.query.cmsArticle.findFirst({
          where: eq(cmsArticle.id, input.articleId),
          with: {
            category: true,
            tags: {
              with: {
                tag: true,
              },
            },
          },
        });

        if (!article) {
          throw new Error("Article not found");
        }

        // Get articles from same category, excluding current
        const related = await db.query.cmsArticle.findMany({
          where: article.categoryId
            ? and(
                eq(cmsArticle.categoryId, article.categoryId),
                eq(cmsArticle.status, "published"),
                eq(cmsArticle.type, "article"),
              )
            : and(eq(cmsArticle.status, "published"), eq(cmsArticle.type, "article")),
          limit: input.limit + 1, // +1 because we'll filter out current
          orderBy: [desc(cmsArticle.publishedAt)],
          with: {
            author: true,
            category: true,
          },
        });

        return related.filter((a) => a.id !== input.articleId).slice(0, input.limit);
      }),
  },

  // ─── Admin Articles ─────────────────────────────────────────────────────────

  admin: {
    list: adminOrProgramManagerProcedure
      .input(
        z
          .object({
            type: z.enum(["news", "article"]).optional(),
            status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
            search: z.string().optional(),
            authorId: z.string().optional(),
            categoryId: z.string().optional(),
            limit: z.number().default(20),
            offset: z.number().default(0),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;

        const conditions: any[] = [isNull(cmsArticle.deletedAt)];

        if (input?.type) {
          conditions.push(eq(cmsArticle.type, input.type));
        }

        if (input?.status) {
          conditions.push(eq(cmsArticle.status, input.status));
        }

        if (input?.authorId) {
          conditions.push(eq(cmsArticle.authorId, input.authorId));
        }

        if (input?.categoryId) {
          conditions.push(eq(cmsArticle.categoryId, input.categoryId));
        }

        if (input?.search) {
          conditions.push(
            // Simple search on title - could enhance with full-text search
          );
        }

        const whereClause = and(...conditions);

        const items = await db
          .select({
            id: cmsArticle.id,
            title: cmsArticle.title,
            slug: cmsArticle.slug,
            type: cmsArticle.type,
            status: cmsArticle.status,
            featured: cmsArticle.featured,
            viewCount: cmsArticle.viewCount,
            publishedAt: cmsArticle.publishedAt,
            scheduledAt: cmsArticle.scheduledAt,
            createdAt: cmsArticle.createdAt,
            updatedAt: cmsArticle.updatedAt,
            authorName: cmsAuthor.name,
            categoryName: cmsCategory.name,
          })
          .from(cmsArticle)
          .leftJoin(cmsAuthor, eq(cmsArticle.authorId, cmsAuthor.id))
          .leftJoin(cmsCategory, eq(cmsArticle.categoryId, cmsCategory.id))
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(cmsArticle.updatedAt));

        const [total] = await db.select({ count: count() }).from(cmsArticle).where(whereClause);

        return {
          data: items,
          pagination: {
            total: total?.count ?? 0,
            limit,
            offset,
          },
        };
      }),

    get: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const item = await db.query.cmsArticle.findFirst({
        where: eq(cmsArticle.id, input.id),
        with: {
          author: true,
          category: true,
          tags: {
            with: {
              tag: true,
            },
          },
          seo: true,
        },
      });

      if (!item) {
        throw new Error("Article not found");
      }

      return item;
    }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          title: z.string().min(1),
          slug: z.string().optional(),
          content: z.string().optional(),
          excerpt: z.string().optional(),
          coverImageUrl: z.string().optional(),
          coverImageAlt: z.string().optional(),
          type: z.enum(["news", "article"]).default("article"),
          status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
          authorId: z.string(),
          categoryId: z.string().optional(),
          featured: z.boolean().default(false),
          scheduledAt: z
            .string()
            .optional()
            .transform((s) => (s ? new Date(s) : undefined)),
          tagIds: z.array(z.string()).optional(),
          // SEO
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
          metaKeywords: z.string().optional(),
          ogImageUrl: z.string().optional(),
          canonicalUrl: z.string().optional(),
          robots: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();

        // Generate slug if not provided
        let slug = input.slug;
        if (!slug || slug.trim() === "") {
          slug = slugify(input.title);
        }

        // Ensure unique slug
        const existingSlug = await db.query.cmsArticle.findFirst({
          where: eq(cmsArticle.slug, slug),
          columns: { id: true },
        });
        if (existingSlug) {
          slug = `${slug}-${id.substring(0, 8)}`;
        }

        const readingTimeMinutes = calculateReadingTime(input.content ?? null);
        const now = new Date();

        // Start transaction
        await db.transaction(async (tx) => {
          // Create article
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
            authorId: input.authorId,
            categoryId: input.categoryId,
            featured: input.featured,
            scheduledAt: input.scheduledAt,
            readingTimeMinutes,
            publishedAt: input.status === "published" ? now : undefined,
          });

          // Create SEO record
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

          // Create article tags
          if (input.tagIds && input.tagIds.length > 0) {
            await tx.insert(cmsArticleTag).values(
              input.tagIds.map((tagId) => ({
                articleId: id,
                tagId,
              })),
            );
          }
        });

        return { id, slug };
      }),

    update: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1).optional(),
          slug: z.string().optional(),
          content: z.string().optional(),
          excerpt: z.string().optional(),
          coverImageUrl: z.string().optional(),
          coverImageAlt: z.string().optional(),
          type: z.enum(["news", "article"]).optional(),
          status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
          authorId: z.string().optional(),
          categoryId: z.string().optional(),
          featured: z.boolean().optional(),
          scheduledAt: z
            .string()
            .optional()
            .transform((s) => (s ? new Date(s) : undefined)),
          publishedAt: z
            .string()
            .optional()
            .transform((s) => (s ? new Date(s) : undefined)),
          tagIds: z.array(z.string()).optional(),
          // SEO
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
          metaKeywords: z.string().optional(),
          ogImageUrl: z.string().optional(),
          canonicalUrl: z.string().optional(),
          robots: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, tagIds, ...data } = input;

        // Calculate reading time if content changed
        if (data.content !== undefined) {
          (data as any).readingTimeMinutes = calculateReadingTime(data.content);
        }

        // Handle slug change
        if (data.slug && data.slug.trim() !== "") {
          const existing = await db.query.cmsArticle.findFirst({
            where: and(eq(cmsArticle.slug, data.slug), eq(cmsArticle.id, id)),
            columns: { id: true },
          });
          if (!existing) {
            // Slug changed to new value - verify uniqueness
            const conflict = await db.query.cmsArticle.findFirst({
              where: and(eq(cmsArticle.slug, data.slug), ne(cmsArticle.id, id)),
              columns: { id: true },
            });
            if (conflict) {
              data.slug = `${data.slug}-${id.substring(0, 8)}`;
            }
          }
        }

        await db.transaction(async (tx) => {
          // Update article
          await tx.update(cmsArticle).set(data).where(eq(cmsArticle.id, id));

          // Update SEO if provided
          if (data.metaTitle !== undefined || data.metaDescription !== undefined) {
            const existingSeo = await tx.query.cmsArticleSeo.findFirst({
              where: eq(cmsArticleSeo.articleId, id),
            });

            if (existingSeo) {
              await tx
                .update(cmsArticleSeo)
                .set({
                  metaTitle: data.metaTitle,
                  metaDescription: data.metaDescription,
                  metaKeywords: data.metaKeywords,
                  ogImageUrl: data.ogImageUrl,
                  canonicalUrl: data.canonicalUrl,
                  robots: data.robots,
                })
                .where(eq(cmsArticleSeo.id, existingSeo.id));
            } else {
              await tx.insert(cmsArticleSeo).values({
                id: randomUUID(),
                articleId: id,
                metaTitle: data.metaTitle,
                metaDescription: data.metaDescription,
                metaKeywords: data.metaKeywords,
                ogImageUrl: data.ogImageUrl,
                canonicalUrl: data.canonicalUrl,
                robots: data.robots,
              });
            }
          }

          // Update tags if provided
          if (tagIds !== undefined) {
            await tx.delete(cmsArticleTag).where(eq(cmsArticleTag.articleId, id));
            if (tagIds.length > 0) {
              await tx.insert(cmsArticleTag).values(
                tagIds.map((tagId) => ({
                  articleId: id,
                  tagId,
                })),
              );
            }
          }
        });

        return { success: true };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      // Soft delete
      await db.update(cmsArticle).set({ deletedAt: new Date() }).where(eq(cmsArticle.id, input.id));
      return { success: true };
    }),

    publish: adminOrProgramManagerProcedure
      .input(z.object({ id: z.string(), scheduledAt: z.string().optional() }))
      .handler(async ({ input }) => {
        const now = new Date();
        await db
          .update(cmsArticle)
          .set({
            status: "published",
            publishedAt: now,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          })
          .where(eq(cmsArticle.id, input.id));
        return { success: true };
      }),

    unpublish: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db
        .update(cmsArticle)
        .set({
          status: "draft",
          publishedAt: undefined,
          scheduledAt: undefined,
        })
        .where(eq(cmsArticle.id, input.id));
      return { success: true };
    }),

    bulkPublish: adminOrProgramManagerProcedure
      .input(z.object({ ids: z.array(z.string()) }))
      .handler(async ({ input }) => {
        const now = new Date();
        await db
          .update(cmsArticle)
          .set({
            status: "published",
            publishedAt: now,
          })
          .where(inArray(cmsArticle.id, input.ids));
        return { success: true };
      }),

    bulkDelete: adminOrProgramManagerProcedure
      .input(z.object({ ids: z.array(z.string()) }))
      .handler(async ({ input }) => {
        const now = new Date();
        await db.update(cmsArticle).set({ deletedAt: now }).where(inArray(cmsArticle.id, input.ids));
        return { success: true };
      }),

    generateSlug: adminOrProgramManagerProcedure
      .input(z.object({ title: z.string(), currentSlug: z.string().optional() }))
      .handler(async ({ input }) => {
        const baseSlug = slugify(input.title);

        // Check existing slugs that match this base
        const existing = await db.query.cmsArticle.findFirst({
          where: eq(cmsArticle.slug, baseSlug),
          columns: { id: true, slug: true },
        });

        if (!existing || existing.slug === input.currentSlug) {
          return { slug: baseSlug };
        }

        // Add suffix
        const suffix = randomUUID().substring(0, 8);
        return { slug: `${baseSlug}-${suffix}` };
      }),
  },
};

// ─── Categories Router ────────────────────────────────────────────────────────

export const categoriesRouter = {
  public: {
    list: publicProcedure.handler(async () => {
      return await db.query.cmsCategory.findMany({
        where: eq(cmsCategory.isActive, true),
        orderBy: [asc(cmsCategory.sortOrder), asc(cmsCategory.name)],
        with: {
          children: {
            where: eq(cmsCategory.isActive, true),
            orderBy: [asc(cmsCategory.sortOrder)],
          },
        },
      });
    }),
  },

  admin: {
    list: adminOrProgramManagerProcedure.handler(async () => {
      return await db.query.cmsCategory.findMany({
        orderBy: [asc(cmsCategory.sortOrder), asc(cmsCategory.name)],
        with: {
          children: {
            orderBy: [asc(cmsCategory.sortOrder)],
          },
        },
      });
    }),

    get: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return await db.query.cmsCategory.findFirst({
        where: eq(cmsCategory.id, input.id),
        with: {
          parent: true,
          children: true,
        },
      });
    }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().optional(),
          description: z.string().optional(),
          parentId: z.string().optional(),
          sortOrder: z.number().default(0),
          isActive: z.boolean().default(true),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();

        let slug = input.slug;
        if (!slug || slug.trim() === "") {
          slug = slugify(input.name);
        }

        // Ensure unique slug
        const existing = await db.query.cmsCategory.findFirst({
          where: eq(cmsCategory.slug, slug),
          columns: { id: true },
        });
        if (existing) {
          slug = `${slug}-${id.substring(0, 8)}`;
        }

        await db.insert(cmsCategory).values({
          id,
          name: input.name,
          slug,
          description: input.description,
          parentId: input.parentId,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        });

        return { id, slug };
      }),

    update: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          slug: z.string().optional(),
          description: z.string().optional(),
          parentId: z.string().optional(),
          sortOrder: z.number().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...data } = input;

        // Handle slug uniqueness
        if (data.slug && data.slug.trim() !== "") {
          const conflict = await db.query.cmsCategory.findFirst({
            where: and(eq(cmsCategory.slug, data.slug), ne(cmsCategory.id, id)),
            columns: { id: true },
          });
          if (conflict) {
            data.slug = `${data.slug}-${id.substring(0, 8)}`;
          }
        }

        // Prevent circular reference
        if (data.parentId === id) {
          throw new Error("Category cannot be its own parent");
        }

        await db.update(cmsCategory).set(data).where(eq(cmsCategory.id, id));
        return { success: true };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(cmsCategory).where(eq(cmsCategory.id, input.id));
      return { success: true };
    }),

    reorder: adminOrProgramManagerProcedure
      .input(
        z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number(),
          }),
        ),
      )
      .handler(async ({ input }) => {
        await db.transaction(async (tx) => {
          for (const item of input) {
            await tx.update(cmsCategory).set({ sortOrder: item.sortOrder }).where(eq(cmsCategory.id, item.id));
          }
        });
        return { success: true };
      }),
  },
};

// ─── Tags Router ──────────────────────────────────────────────────────────────

export const tagsRouter = {
  public: {
    list: publicProcedure.handler(async () => {
      return await db.query.cmsTag.findMany({
        orderBy: [asc(cmsTag.name)],
      });
    }),

    search: publicProcedure.input(z.object({ query: z.string() })).handler(async ({ input }) => {
      const results = await db.query.cmsTag.findMany({
        where: `${cmsTag.name} ILIKE ${`%${input.query}%`}` as any, // Simple like search
        orderBy: [asc(cmsTag.name)],
        limit: 10,
      });
      return results;
    }),
  },

  admin: {
    list: adminOrProgramManagerProcedure.handler(async () => {
      return await db.query.cmsTag.findMany({
        orderBy: [asc(cmsTag.name)],
      });
    }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();

        let slug = input.slug;
        if (!slug || slug.trim() === "") {
          slug = slugify(input.name);
        }

        const existing = await db.query.cmsTag.findFirst({
          where: eq(cmsTag.slug, slug),
          columns: { id: true },
        });
        if (existing) {
          slug = `${slug}-${id.substring(0, 8)}`;
        }

        await db.insert(cmsTag).values({
          id,
          name: input.name,
          slug,
        });

        return { id, slug };
      }),

    update: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          slug: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...data } = input;

        if (data.slug && data.slug.trim() !== "") {
          const conflict = await db.query.cmsTag.findFirst({
            where: and(eq(cmsTag.slug, data.slug), ne(cmsTag.id, id)),
            columns: { id: true },
          });
          if (conflict) {
            data.slug = `${data.slug}-${id.substring(0, 8)}`;
          }
        }

        await db.update(cmsTag).set(data).where(eq(cmsTag.id, id));
        return { success: true };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(cmsTag).where(eq(cmsTag.id, input.id));
      return { success: true };
    }),
  },
};

// ─── Authors Router ────────────────────────────────────────────────────────────

export const authorsRouter = {
  public: {
    list: publicProcedure.handler(async () => {
      return await db.query.cmsAuthor.findMany({
        orderBy: [asc(cmsAuthor.name)],
      });
    }),

    get: publicProcedure.input(z.object({ slug: z.string() })).handler(async ({ input }) => {
      return await db.query.cmsAuthor.findFirst({
        where: eq(cmsAuthor.slug, input.slug),
        with: {
          articles: {
            where: and(eq(cmsArticle.status, "published"), eq(cmsArticle.type, "article")),
            orderBy: [desc(cmsArticle.publishedAt)],
            limit: 10,
          },
        },
      });
    }),
  },

  admin: {
    list: adminOrProgramManagerProcedure.handler(async () => {
      return await db.query.cmsAuthor.findMany({
        orderBy: [asc(cmsAuthor.name)],
      });
    }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().optional(),
          bio: z.string().optional(),
          avatarUrl: z.string().optional(),
          role: z.enum(["editor", "admin", "contributor"]).default("contributor"),
          socialLinks: z
            .object({
              instagram: z.string().optional(),
              linkedin: z.string().optional(),
              twitter: z.string().optional(),
              website: z.string().optional(),
            })
            .optional(),
          userId: z.string().optional(), // Link to existing user
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();

        let slug = input.slug;
        if (!slug || slug.trim() === "") {
          slug = slugify(input.name);
        }

        const existing = await db.query.cmsAuthor.findFirst({
          where: eq(cmsAuthor.slug, slug),
          columns: { id: true },
        });
        if (existing) {
          slug = `${slug}-${id.substring(0, 8)}`;
        }

        await db.insert(cmsAuthor).values({
          id,
          name: input.name,
          slug,
          bio: input.bio,
          avatarUrl: input.avatarUrl,
          role: input.role,
          socialLinks: input.socialLinks as any,
          userId: input.userId,
        });

        return { id, slug };
      }),

    update: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          slug: z.string().optional(),
          bio: z.string().optional(),
          avatarUrl: z.string().optional(),
          role: z.enum(["editor", "admin", "contributor"]).optional(),
          socialLinks: z
            .object({
              instagram: z.string().optional(),
              linkedin: z.string().optional(),
              twitter: z.string().optional(),
              website: z.string().optional(),
            })
            .optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...data } = input;

        if (data.slug && data.slug.trim() !== "") {
          const conflict = await db.query.cmsAuthor.findFirst({
            where: and(eq(cmsAuthor.slug, data.slug), ne(cmsAuthor.id, id)),
            columns: { id: true },
          });
          if (conflict) {
            data.slug = `${data.slug}-${id.substring(0, 8)}`;
          }
        }

        await db.update(cmsAuthor).set(data).where(eq(cmsAuthor.id, id));
        return { success: true };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(cmsAuthor).where(eq(cmsAuthor.id, input.id));
      return { success: true };
    }),
  },
};

// ─── Media Router ───────────────────────────────────────────────────────────────

export const mediaRouter = {
  admin: {
    list: adminOrProgramManagerProcedure
      .input(
        z
          .object({
            mimeType: z.string().optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        const conditions: any[] = [];
        if (input?.mimeType) {
          conditions.push(eq(cmsMedia.mimeType, input.mimeType));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const items = await db
          .select()
          .from(cmsMedia)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(cmsMedia.createdAt));

        const [total] = await db.select({ count: count() }).from(cmsMedia).where(whereClause);

        return {
          data: items,
          pagination: {
            total: total?.count ?? 0,
            limit,
            offset,
          },
        };
      }),

    get: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return await db.query.cmsMedia.findFirst({
        where: eq(cmsMedia.id, input.id),
      });
    }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          url: z.string(),
          filename: z.string(),
          mimeType: z.string(),
          size: z.number(),
          width: z.number().optional(),
          height: z.number().optional(),
          alt: z.string().optional(),
          uploadedBy: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();

        await db.insert(cmsMedia).values({
          id,
          url: input.url,
          filename: input.filename,
          mimeType: input.mimeType,
          size: input.size,
          width: input.width,
          height: input.height,
          alt: input.alt,
          uploadedBy: input.uploadedBy,
        });

        return { id };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      // Get the media record first to delete the R2 file
      const media = await db.query.cmsMedia.findFirst({
        where: eq(cmsMedia.id, input.id),
      });

      if (media) {
        // Try to delete from R2 if it's an R2 URL
        try {
          const { deleteFromR2, extractKeyFromUrl } = await import("@mulai-plus/r2/server");
          const key = extractKeyFromUrl(media.url);
          if (key) {
            await deleteFromR2(key);
          }
        } catch (err) {
          console.warn("Failed to delete file from R2:", err);
        }
      }

      await db.delete(cmsMedia).where(eq(cmsMedia.id, input.id));
      return { success: true };
    }),

    bulkDelete: adminOrProgramManagerProcedure
      .input(z.object({ ids: z.array(z.string()) }))
      .handler(async ({ input }) => {
        // Get all media records to delete R2 files
        const mediaRecords = await db.query.cmsMedia.findMany({
          where: inArray(cmsMedia.id, input.ids),
        });

        // Try to delete from R2
        try {
          const { deleteManyFromR2, extractKeyFromUrl } = await import("@mulai-plus/r2/server");
          const keys = mediaRecords.map((m) => extractKeyFromUrl(m.url)).filter((k): k is string => k !== null);
          if (keys.length > 0) {
            await deleteManyFromR2(keys);
          }
        } catch (err) {
          console.warn("Failed to delete some files from R2:", err);
        }

        await db.delete(cmsMedia).where(inArray(cmsMedia.id, input.ids));
        return { success: true };
      }),

    // Upload endpoint - uploads to R2 and creates media record
    upload: adminOrProgramManagerProcedure
      .input(
        z.object({
          filename: z.string(),
          mimeType: z.string(),
          size: z.number(),
          width: z.number().optional(),
          height: z.number().optional(),
          alt: z.string().optional(),
          path: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        // This endpoint is called after the file is uploaded to R2
        // The actual upload is handled by the /api/upload endpoint
        // This just creates the database record
        const id = randomUUID();

        await db.insert(cmsMedia).values({
          id,
          url: "", // Will be updated after R2 upload
          filename: input.filename,
          mimeType: input.mimeType,
          size: input.size,
          width: input.width,
          height: input.height,
          alt: input.alt,
          uploadedBy: context.session?.user?.id,
        });

        return { id };
      }),

    updateUrl: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          url: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        await db.update(cmsMedia).set({ url: input.url }).where(eq(cmsMedia.id, input.id));
        return { success: true };
      }),
  },
};

// ─── Newsletter Router ────────────────────────────────────────────────────────

export const newsletterRouter = {
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        source: z.enum(["article-page", "popup", "footer-form"]).default("article-page"),
      }),
    )
    .handler(async ({ input }) => {
      const id = randomUUID();

      // Check if already subscribed
      const existing = await db.query.newsletterSubscriber.findFirst({
        where: eq(newsletterSubscriber.email, input.email),
      });

      if (existing) {
        if (existing.status === "unsubscribed") {
          // Re-subscribe
          await db
            .update(newsletterSubscriber)
            .set({
              status: "active",
              subscribedAt: new Date(),
              unsubscribedAt: undefined,
              source: input.source,
            })
            .where(eq(newsletterSubscriber.id, existing.id));
          return { success: true, message: "Re-subscribed successfully" };
        }
        return { success: true, message: "Already subscribed" };
      }

      await db.insert(newsletterSubscriber).values({
        id,
        email: input.email,
        source: input.source,
      });

      return { success: true, id };
    }),

  unsubscribe: publicProcedure.input(z.object({ email: z.string().email() })).handler(async ({ input }) => {
    await db
      .update(newsletterSubscriber)
      .set({
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscriber.email, input.email));

    return { success: true };
  }),

  admin: {
    list: adminOrProgramManagerProcedure
      .input(
        z
          .object({
            status: z.enum(["active", "unsubscribed"]).optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        const conditions: any[] = [];
        if (input?.status) {
          conditions.push(eq(newsletterSubscriber.status, input.status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const items = await db
          .select()
          .from(newsletterSubscriber)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(newsletterSubscriber.subscribedAt));

        const [total] = await db.select({ count: count() }).from(newsletterSubscriber).where(whereClause);

        return {
          data: items,
          pagination: {
            total: total?.count ?? 0,
            limit,
            offset,
          },
        };
      }),

    stats: adminOrProgramManagerProcedure.handler(async () => {
      const [total] = await db.select({ count: count() }).from(newsletterSubscriber);
      const [active] = await db
        .select({ count: count() })
        .from(newsletterSubscriber)
        .where(eq(newsletterSubscriber.status, "active"));

      return {
        total: total?.count ?? 0,
        active: active?.count ?? 0,
        unsubscribed: (total?.count ?? 0) - (active?.count ?? 0),
      };
    }),
  },
};
