import type { MetadataRoute } from "next";

// Revalidate daily — sitemap changes infrequently
export const revalidate = 86400;

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";
const PAGE_SIZE = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/programs`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog/articles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog/news`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/explore`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/explore/universities`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/explore/study-programs`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/explore/passing-grade`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/explore/compare`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const { client } = await import("@/lib/client");

    // ── Articles ────────────────────────────────────────────────────
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await client.cms.articles.public.list({ type: "article", limit: PAGE_SIZE, offset });
        const items = res?.data ?? [];
        const total = res?.pagination?.total ?? 0;
        for (const a of items) {
          const slug = (a as any).slug;
          if (slug)
            dynamicPages.push({ url: `${baseUrl}/blog/articles/${slug}`, changeFrequency: "monthly", priority: 0.6 });
        }
        offset += PAGE_SIZE;
        hasMore = items.length >= PAGE_SIZE && offset < total;
      }
    } catch {}

    // ── News ────────────────────────────────────────────────────────
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await client.cms.articles.public.list({ type: "news", limit: PAGE_SIZE, offset });
        const items = res?.data ?? [];
        const total = res?.pagination?.total ?? 0;
        for (const a of items) {
          const slug = (a as any).slug;
          if (slug)
            dynamicPages.push({ url: `${baseUrl}/blog/news/${slug}`, changeFrequency: "monthly", priority: 0.6 });
        }
        offset += PAGE_SIZE;
        hasMore = items.length >= PAGE_SIZE && offset < total;
      }
    } catch {}

    // ── Programs (mentoring) ────────────────────────────────────────
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await client.programs.public.list({ limit: PAGE_SIZE, offset });
        const items = res?.data ?? [];
        const total = res?.pagination?.total ?? 0;
        for (const p of items) {
          const slug = (p as any).slug;
          if (slug) dynamicPages.push({ url: `${baseUrl}/programs/${slug}`, changeFrequency: "weekly", priority: 0.7 });
        }
        offset += PAGE_SIZE;
        hasMore = items.length >= PAGE_SIZE && offset < total;
      }
    } catch {}

    // ── Universities (335 pages — semua masuk) ─────────────────────
    try {
      const slugs = await (client as any)?.pddikti?.publicGetUniversitySlugs();
      if (Array.isArray(slugs)) {
        for (const u of slugs) {
          const slug = (u as any).slug;
          if (slug)
            dynamicPages.push({
              url: `${baseUrl}/explore/universities/${slug}`,
              changeFrequency: "monthly",
              priority: 0.6,
            });
        }
      }
    } catch {}

    // ── Prodi — DIHAPUS dari sitemap ────────────────────────────────
    // 14.752 halaman prodi menyebabkan crawl budget habis.
    // Google tetap bisa menemukannya via internal link dari halaman universitas.
  } catch {}

  console.log(`[sitemap] Total URLs: ${staticPages.length + dynamicPages.length}`);

  return [...staticPages, ...dynamicPages];
}
