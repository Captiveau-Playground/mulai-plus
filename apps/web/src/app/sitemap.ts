import { and, db, eq, isNull, schema } from "@mulai-plus/db";
import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site-config";

const baseUrl = SITE.url;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/programs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/news`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    // ── Published articles ──
    const articles = await db
      .select({
        slug: schema.cmsArticle.slug,
        updatedAt: schema.cmsArticle.updatedAt,
      })
      .from(schema.cmsArticle)
      .where(
        and(
          eq(schema.cmsArticle.status, "published"),
          eq(schema.cmsArticle.type, "article"),
          isNull(schema.cmsArticle.deletedAt),
        ),
      )
      .limit(1000);

    // ── Published news ──
    const newsItems = await db
      .select({
        slug: schema.cmsArticle.slug,
        updatedAt: schema.cmsArticle.updatedAt,
      })
      .from(schema.cmsArticle)
      .where(
        and(
          eq(schema.cmsArticle.status, "published"),
          eq(schema.cmsArticle.type, "news"),
          isNull(schema.cmsArticle.deletedAt),
        ),
      )
      .limit(1000);

    // ── Active programs ──
    const programs = await db
      .select({
        slug: schema.program.slug,
        updatedAt: schema.program.updatedAt,
      })
      .from(schema.program)
      .where(isNull(schema.program.deletedAt))
      .limit(500);

    // ── Published courses ──
    const courses = await db
      .select({ slug: schema.course.slug, updatedAt: schema.course.updatedAt })
      .from(schema.course)
      .where(eq(schema.course.published, true))
      .limit(500);

    const dynamicPages: MetadataRoute.Sitemap = [
      ...articles.map((a) => ({
        url: `${baseUrl}/blog/articles/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...newsItems.map((n) => ({
        url: `${baseUrl}/blog/news/${n.slug}`,
        lastModified: n.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...programs.map((p) => ({
        url: `${baseUrl}/programs/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...courses.map((c) => ({
        url: `${baseUrl}/courses/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];

    return [...staticPages, ...dynamicPages];
  } catch (error) {
    console.error("Sitemap: Failed to fetch dynamic routes, returning static pages", error);
    return staticPages;
  }
}
