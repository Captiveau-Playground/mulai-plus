import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
    const res = await fetch(`${apiUrl}/rpc/cms.articles.public.get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ slug }]),
      next: { revalidate: 300 },
    });

    if (!res.ok) return { alternates: { canonical: `/blog/articles/${slug}` } };

    const article = (await res.json()) as {
      title: string;
      excerpt: string | null;
      publishedAt: string | null;
      coverImageUrl: string | null;
      author: { name: string } | null;
      seo: { metaTitle: string | null; metaDescription: string | null; ogImageUrl: string | null } | null;
    };

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
        publishedTime: article.publishedAt || undefined,
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
    return { alternates: { canonical: `/blog/articles/${slug}` } };
  }
}

export default function ArticleSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
