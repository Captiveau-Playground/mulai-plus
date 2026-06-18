import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";

function _slugify(name: string, id: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")}-${id.substring(0, 6)}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/programs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog/articles`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/explore/universities`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/explore/study-programs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/explore/passing-grade`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  // Dynamic pages — fetched at runtime via API
  const dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const { client } = await import("@/lib/client");

    // Articles
    try {
      const articles = await client.cms.articles.public.list({ type: "article", limit: 500, offset: 0 });
      if (articles?.data?.length) {
        for (const a of articles.data) {
          if ((a as any).slug) {
            dynamicPages.push({
              url: `${baseUrl}/blog/articles/${(a as any).slug}`,
              lastModified: (a as any).publishedAt ? new Date((a as any).publishedAt) : new Date(),
              changeFrequency: "monthly" as const,
              priority: 0.6,
            });
          }
        }
      }
    } catch {}

    // News
    try {
      const news = await client.cms.articles.public.list({ type: "news", limit: 500, offset: 0 });
      if (news?.data?.length) {
        for (const a of news.data) {
          if ((a as any).slug) {
            dynamicPages.push({
              url: `${baseUrl}/blog/news/${(a as any).slug}`,
              lastModified: (a as any).publishedAt ? new Date((a as any).publishedAt) : new Date(),
              changeFrequency: "monthly" as const,
              priority: 0.6,
            });
          }
        }
      }
    } catch {}

    // Programs
    try {
      const programs = await client.programs.public.list({ limit: 100, offset: 0 });
      if (programs?.data?.length) {
        for (const p of programs.data) {
          dynamicPages.push({
            url: `${baseUrl}/programs/${(p as any).slug}`,
            lastModified: (p as any).updatedAt ? new Date((p as any).updatedAt) : new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          });
        }
      }
    } catch {}

    // University slugs for explore detail pages
    try {
      const slugs = await (client as any)?.pddikti?.publicGetUniversitySlugs();
      if (Array.isArray(slugs)) {
        for (const u of slugs) {
          dynamicPages.push({
            url: `${baseUrl}/explore/universities/${(u as any).slug}`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          });
        }
      }
    } catch {}

    // Program study slugs for explore detail pages
    try {
      const slugs = await (client as any)?.pddikti?.publicGetProgramSlugs();
      if (Array.isArray(slugs)) {
        for (const p of slugs) {
          dynamicPages.push({
            url: `${baseUrl}/explore/study-programs/${(p as any).slug}`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          });
        }
      }
    } catch {}
  } catch {}

  return [...staticPages, ...dynamicPages];
}
