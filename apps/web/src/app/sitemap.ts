import type { MetadataRoute } from "next";
import { client } from "@/lib/client";

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
    const articlesData = await client.cms.articles.public.list({ type: "article", limit: 500, offset: 0 });
    if (articlesData?.data?.length) {
      dynamicPages.push(
        ...articlesData.data
          .filter((a: any) => a.slug)
          .map((a: any) => ({
            url: `${baseUrl}/blog/articles/${a.slug}`,
            lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
      );
    }

    // Fetch published news
    const newsData = await client.cms.articles.public.list({ type: "news", limit: 500, offset: 0 });
    if (newsData?.data?.length) {
      dynamicPages.push(
        ...newsData.data
          .filter((a: any) => a.slug)
          .map((a: any) => ({
            url: `${baseUrl}/blog/news/${a.slug}`,
            lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
      );
    }

    // Fetch published programs
    const programsData = await client.programs.public.list({ limit: 100, offset: 0 });
    if (programsData?.data?.length) {
      dynamicPages.push(
        ...programsData.data.map((p: any) => ({
          url: `${baseUrl}/programs/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
      );
    }

    // Fetch university slugs from DB (dynamic import to avoid build-time env validation)
    const { db, eq } = await import("@mulai-plus/db");
    const { universities, studyPrograms } = await import("@mulai-plus/db/schema/pddikti");

    const uniData = await db
      .select({ idSp: universities.idSp, name: universities.name })
      .from(universities)
      .where(eq(universities.status, "Aktif"));

    dynamicPages = [
      ...dynamicPages,
      ...uniData.map((u) => ({
        url: `${baseUrl}/explore/universities/${u.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")}-${u.idSp.substring(0, 6)}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];

    // Fetch program slugs from DB directly
    const progData = await db
      .select({ idSms: studyPrograms.idSms, name: studyPrograms.name })
      .from(studyPrograms)
      .where(eq(studyPrograms.status, "Aktif"));

    dynamicPages = [
      ...dynamicPages,
      ...progData.map((p) => ({
        url: `${baseUrl}/explore/study-programs/${p.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")}-${p.idSms.substring(0, 6)}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch (_e) {
    console.error("Failed to fetch sitemap data:", _e);
  }

  return [...staticPages, ...dynamicPages];
}
