import type { Metadata } from "next";
import { client } from "@/lib/client";
import { SITE } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;

  try {
    const article = await client.cms.articles.public.get({ slug });

    if (!article) return { alternates: { canonical: `/blog/articles/${slug}` } };

    const title = article.seo?.metaTitle || article.title;
    const description = article.seo?.metaDescription || article.excerpt || undefined;
    const ogImage = article.seo?.ogImageUrl || article.coverImageUrl || undefined;

    return {
      title,
      description,
      alternates: { canonical: `/blog/articles/${slug}` },
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
  } catch {
    return {
      alternates: { canonical: `/blog/articles/${slug}` },
      openGraph: {
        images: [{ url: SITE.ogImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        images: [SITE.ogImage],
      },
    };
  }
}

export default function ArticleSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
