import type { MetadataRoute } from "next";
import { client } from "@/lib/client";

export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";

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
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explore/universities`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/explore/study-programs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/explore/passing-grade`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  let dynamicPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch published articles
    const articlesData = await client.cms.articles.public.list({
      type: "article",
      limit: 500,
      offset: 0,
    });
    if (articlesData?.data) {
      // biome-ignore lint/suspicious/noExplicitAny: article shape from API
      const articles = articlesData.data.filter((a: any) => a.slug);
      dynamicPages = [
        ...dynamicPages,
        // biome-ignore lint/suspicious/noExplicitAny: article shape from API
        ...articles.map((a: any) => ({
          url: `${baseUrl}/blog/articles/${a.slug}`,
          lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ];
    }

    // Fetch published news
    const newsData = await client.cms.articles.public.list({
      type: "news",
      limit: 500,
      offset: 0,
    });
    if (newsData?.data) {
      // biome-ignore lint/suspicious/noExplicitAny: news shape from API
      const newsItems = newsData.data.filter((a: any) => a.slug);
      dynamicPages = [
        ...dynamicPages,
        // biome-ignore lint/suspicious/noExplicitAny: news shape from API
        ...newsItems.map((a: any) => ({
          url: `${baseUrl}/blog/news/${a.slug}`,
          lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ];
    }

    // Fetch published programs
    const programsData = await client.programs.public.list({
      limit: 100,
      offset: 0,
    });
    if (programsData?.data) {
      dynamicPages = [
        ...dynamicPages,
        // biome-ignore lint/suspicious/noExplicitAny: program shape from API
        ...programsData.data.map((p: any) => ({
          url: `${baseUrl}/programs/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
      ];
    }

    // Fetch university slugs for explore detail pages
    const uniSlugsData = await // biome-ignore lint/suspicious/noExplicitAny: pddikti not on client type
    (client as any)?.pddikti?.publicGetUniversitySlugs();
    if (Array.isArray(uniSlugsData)) {
      dynamicPages = [
        ...dynamicPages,
        // biome-ignore lint/suspicious/noExplicitAny: slug shape from API
        ...uniSlugsData.map((u: any) => ({
          url: `${baseUrl}/explore/universities/${u.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ];
    }

    // Fetch program slugs for explore detail pages
    const progSlugsData = await // biome-ignore lint/suspicious/noExplicitAny: pddikti not on client type
    (client as any)?.pddikti?.publicGetProgramSlugs();
    if (Array.isArray(progSlugsData)) {
      dynamicPages = [
        ...dynamicPages,
        // biome-ignore lint/suspicious/noExplicitAny: slug shape from API
        ...progSlugsData.map((p: any) => ({
          url: `${baseUrl}/explore/study-programs/${p.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ];
    }
  } catch (_e) {
    // API not available — return static pages only
  }

  return [...staticPages, ...dynamicPages];
}
