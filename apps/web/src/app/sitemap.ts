import type { MetadataRoute } from "next";

// Revalidate sitemap every hour — no need to regenerate on every request
export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";
const PAGE_SIZE = 1000; // Fetch up to 1000 items per API call

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
  ];

  const dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const { client } = await import("@/lib/client");
    console.log("[sitemap] client imported successfully");

    // ── Articles (with pagination) ──────────────────────────────────
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await client.cms.articles.public.list({
          type: "article",
          limit: PAGE_SIZE,
          offset,
        });
        const items = res?.data ?? [];
        const total = res?.pagination?.total ?? 0;

        for (const a of items) {
          const slug = (a as any).slug;
          if (slug) {
            dynamicPages.push({
              url: `${baseUrl}/blog/articles/${slug}`,
              lastModified: (a as any).publishedAt ? new Date((a as any).publishedAt) : undefined,
              changeFrequency: "monthly",
              priority: 0.6,
            });
          }
        }

        offset += PAGE_SIZE;
        hasMore = items.length >= PAGE_SIZE && offset < total;
      }
      console.log(`[sitemap] articles: ${dynamicPages.filter((p) => p.url.includes("/blog/articles/")).length} URLs`);
    } catch (e) {
      console.error("[sitemap] Failed to fetch articles:", e);
    }

    // ── News (with pagination) ──────────────────────────────────────
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await client.cms.articles.public.list({
          type: "news",
          limit: PAGE_SIZE,
          offset,
        });
        const items = res?.data ?? [];
        const total = res?.pagination?.total ?? 0;

        for (const a of items) {
          const slug = (a as any).slug;
          if (slug) {
            dynamicPages.push({
              url: `${baseUrl}/blog/news/${slug}`,
              lastModified: (a as any).publishedAt ? new Date((a as any).publishedAt) : undefined,
              changeFrequency: "monthly",
              priority: 0.6,
            });
          }
        }

        offset += PAGE_SIZE;
        hasMore = items.length >= PAGE_SIZE && offset < total;
      }
      console.log(`[sitemap] news: ${dynamicPages.filter((p) => p.url.includes("/blog/news/")).length} URLs`);
    } catch (e) {
      console.error("[sitemap] Failed to fetch news:", e);
    }

    // ── Programs (with pagination) ──────────────────────────────────
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await client.programs.public.list({ limit: PAGE_SIZE, offset });
        const items = res?.data ?? [];
        const total = res?.pagination?.total ?? 0;

        for (const p of items) {
          const slug = (p as any).slug;
          if (slug) {
            dynamicPages.push({
              url: `${baseUrl}/programs/${slug}`,
              lastModified: (p as any).updatedAt ? new Date((p as any).updatedAt) : undefined,
              changeFrequency: "weekly",
              priority: 0.7,
            });
          }
        }

        offset += PAGE_SIZE;
        hasMore = items.length >= PAGE_SIZE && offset < total;
      }
      console.log(`[sitemap] programs: ${dynamicPages.filter((p) => p.url.includes("/programs/")).length} URLs`);
    } catch (e) {
      console.error("[sitemap] Failed to fetch programs:", e);
    }

    // ── University slugs ────────────────────────────────────────────
    try {
      const slugs = await (client as any)?.pddikti?.publicGetUniversitySlugs();
      if (Array.isArray(slugs)) {
        for (const u of slugs) {
          const slug = (u as any).slug;
          if (slug) {
            dynamicPages.push({
              url: `${baseUrl}/explore/universities/${slug}`,
              changeFrequency: "monthly",
              priority: 0.6,
            });
          }
        }
      }
      console.log(
        `[sitemap] universities: ${dynamicPages.filter((p) => p.url.includes("/explore/universities/") && !p.url.includes("/prodi/")).length} URLs`,
      );
    } catch (e) {
      console.error("[sitemap] Failed to fetch university slugs:", e);
    }

    // ── Prodi (study programs within universities) ──────────────────
    try {
      const prodiList = await (client as any)?.pddikti?.publicGetAllProdiForSitemap();
      if (Array.isArray(prodiList)) {
        for (const p of prodiList) {
          const { idSms, uniSlug } = p as any;
          if (idSms && uniSlug) {
            dynamicPages.push({
              url: `${baseUrl}/explore/universities/${uniSlug}/prodi/${encodeURIComponent(idSms)}`,
              changeFrequency: "monthly",
              priority: 0.5,
            });
          }
        }
      }
      console.log(`[sitemap] prodi: ${dynamicPages.filter((p) => p.url.includes("/prodi/")).length} URLs`);
    } catch (e) {
      console.warn("[sitemap] Failed to fetch prodi list (expected if server not redeployed):", e.message || e);
    }
  } catch (e) {
    console.error("[sitemap] client import failed:", e);
  }

  console.log(`[sitemap] Total URLs: ${staticPages.length + dynamicPages.length}`);

  return [...staticPages, ...dynamicPages];
}
