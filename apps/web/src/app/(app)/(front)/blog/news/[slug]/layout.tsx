import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/lib/client";
import { SITE } from "@/lib/site-config";

// ISR: revalidate every hour
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;

  const article = await client.cms.articles.public.get({ slug, type: "news" }).catch(() => null);

  if (!article || article.type !== "news") {
    notFound();
  }

  const title = article.seo?.metaTitle || article.title;
  const description = article.seo?.metaDescription || article.excerpt || undefined;
  const ogImage = article.seo?.ogImageUrl || article.coverImageUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/news/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime:
        typeof article.publishedAt === "string"
          ? article.publishedAt
          : article.publishedAt?.toISOString?.() || undefined,
      authors: article.author?.name ? [article.author.name] : undefined,
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630 }] }
        : { images: [{ url: SITE.ogImage, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : { images: [SITE.ogImage] }),
    },
  };
}

export default function NewsSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
