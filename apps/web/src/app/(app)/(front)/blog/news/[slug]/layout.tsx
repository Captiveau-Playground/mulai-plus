import type { Metadata } from "next";
import { client } from "@/lib/client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;

  try {
    const article = await client.cms.articles.public.get({ slug });

    if (!article) return { alternates: { canonical: `/blog/news/${slug}` } };

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
        images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch {
    return { alternates: { canonical: `/blog/news/${slug}` } };
  }
}

export default function NewsSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
