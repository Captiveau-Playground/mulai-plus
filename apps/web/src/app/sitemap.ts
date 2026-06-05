import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/programs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog/articles`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

    // Fetch published articles
    const articlesRes = await fetch(`${apiUrl}/rpc/cms.articles.public.list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 500, offset: 0 }),
      next: { revalidate: 3600 },
    });

    if (articlesRes.ok) {
      const articlesData = (await articlesRes.json()) as { data: { slug: string; publishedAt: string | null }[] };
      if (articlesData?.data) {
        const articles = articlesData.data.filter((a) => a.slug);
        dynamicPages.push(
          ...articles.map((a) => ({
            url: `${baseUrl}/blog/articles/${a.slug}`,
            lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
        );
      }
    }

    // Fetch published news
    const newsRes = await fetch(`${apiUrl}/rpc/cms.articles.public.list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "news", limit: 500, offset: 0 }),
      next: { revalidate: 3600 },
    });

    if (newsRes.ok) {
      const newsData = (await newsRes.json()) as { data: { slug: string; publishedAt: string | null }[] };
      if (newsData?.data) {
        const newsItems = newsData.data.filter((a) => a.slug);
        dynamicPages.push(
          ...newsItems.map((a) => ({
            url: `${baseUrl}/blog/news/${a.slug}`,
            lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
        );
      }
    }

    // Fetch published programs
    const programsRes = await fetch(`${apiUrl}/rpc/programs.public.list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 100, offset: 0 }),
      next: { revalidate: 3600 },
    });

    if (programsRes.ok) {
      const programsData = (await programsRes.json()) as { data: { slug: string; updatedAt?: string }[] };
      if (programsData?.data) {
        dynamicPages.push(
          ...programsData.data.map((p) => ({
            url: `${baseUrl}/programs/${p.slug}`,
            lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          })),
        );
      }
    }
  } catch {
    // API not available during build — return static pages only
  }

  return [...staticPages, ...dynamicPages];
}
