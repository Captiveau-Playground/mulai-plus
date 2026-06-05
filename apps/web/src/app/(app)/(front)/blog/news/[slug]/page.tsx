"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Calendar, ChevronUp, Clock, Facebook, Linkedin, Share2, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";

type ArticleDetail = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  type: "news" | "article";
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  featured: boolean;
  author: { name: string; slug: string; avatarUrl: string | null; bio: string | null } | null;
  category: { name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
  seo: { metaTitle: string | null; metaDescription: string | null; ogImageUrl: string | null } | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ArticleContent({ html }: { html: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html || '<p style="color:#94a3b8;font-style:italic">Konten artikel belum tersedia.</p>';
    }
  }, [html]);
  return (
    <>
      <style>{`.article-content { font-family: var(--font-manrope), Manrope, system-ui, sans-serif; font-size: 1.0625rem; line-height: 1.8; color: #374151; }
.article-content h1,.article-content h2,.article-content h3,.article-content h4 { font-family: var(--font-bricolage), "Bricolage Grotesque", system-ui, sans-serif; font-weight: 700; color: #1a1a2e; margin-top: 2rem; margin-bottom: 0.75rem; line-height: 1.3; }
.article-content h1 { font-size: 1.75rem; } .article-content h2 { font-size: 1.5rem; } .article-content h3 { font-size: 1.25rem; } .article-content h4 { font-size: 1.125rem; }
.article-content p { margin-bottom: 1.25rem; } .article-content a { color: #2563eb; text-decoration: underline; }
.article-content ul { margin-bottom: 1.25rem; padding-left: 1.5rem; list-style: none; }
.article-content ul > li { position: relative; padding-left: 1.25rem; margin-bottom: 0.5rem; }
.article-content ul > li::before { content: ""; position: absolute; left: 0; top: 0.6em; width: 6px; height: 6px; border-radius: 50%; background: #fe9114; }
.article-content ol { margin-bottom: 1.25rem; padding-left: 1.75rem; list-style: none; counter-reset: article-counter; }
.article-content ol > li { position: relative; padding-left: 1.75rem; margin-bottom: 0.5rem; counter-increment: article-counter; }
.article-content ol > li::before { content: counter(article-counter); position: absolute; left: 0; top: 0.1em; width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #1a1f6d; color: #fff; font-size: 0.7rem; font-weight: 600; }
.article-content li { font-family: var(--font-manrope), Manrope, system-ui, sans-serif; }
.article-content blockquote { border-left: 4px solid #fe9114; margin: 1.5rem 0; padding: 0.75rem 1.25rem; background: #fffaf0; border-radius: 0 0.5rem 0.5rem 0; font-style: italic; color: #6b7280; }
.article-content pre { background: #1e293b; color: #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0; font-size: 0.875rem; }
.article-content code { background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875rem; color: #1e293b; }
.article-content pre code { background: none; padding: 0; color: inherit; }
.article-content img { max-width: 100%; height: auto; border-radius: 0.75rem; margin: 1.5rem 0; }
.article-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9375rem; }
.article-content th, .article-content td { border: 1px solid #e5e7eb; padding: 0.625rem 0.875rem; text-align: left; }
.article-content th { background: #f9fafb; font-weight: 600; }
.article-content iframe { max-width: 100%; border-radius: 0.75rem; margin: 1.5rem 0; }
.article-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }`}</style>
      <div ref={ref} className="article-content" />
    </>
  );
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    trackEvent("article_viewed", { article_slug: slug });
  }, [slug]);

  // Track scroll depth milestones
  useEffect(() => {
    const milestones = new Set();
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrolled = window.scrollY / scrollHeight;
      [0.25, 0.5, 0.75, 0.9].forEach((threshold) => {
        if (scrolled >= threshold && !milestones.has(threshold)) {
          milestones.add(threshold);
          trackEvent("article_scroll", { article_slug: slug, depth: `${Math.round(threshold * 100)}%` });
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [slug]);

  const {
    data: article,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["article", "public", "get", slug],
    queryFn: async () => {
      const result = await client.cms.articles.public.get({ slug });
      return result as unknown as ArticleDetail;
    },
    enabled: Boolean(slug),
  });
  const { data: relatedArticles } = useQuery({
    queryKey: ["article", "public", "related", article?.id],
    queryFn: async () => {
      if (!article?.id) return [];
      const result = await client.cms.articles.public.getRelated({ articleId: article.id, limit: 4 });
      return result as any[];
    },
    enabled: Boolean(article?.id),
  });

  if (isLoading)
    return (
      <div className="mx-auto max-w-7xl px-4 py-20">
        <Skeleton className="mb-4 h-10 w-3/4" />
        <Skeleton className="mb-8 h-6 w-1/2" />
        <Skeleton className="mb-8 h-96 w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  if (isError || !article)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <BookOpen className="mb-4 h-16 w-16 text-gray-300" />
        <h1 className="mb-2 font-bold font-bricolage text-2xl text-gray-900">Artikel tidak ditemukan</h1>
        <p className="mb-6 font-manrope text-gray-500 text-sm">Artikel yang kamu cari mungkin sudah dihapus.</p>
        <Button onClick={() => router.push("/blog/articles")} variant="outline" className="rounded-xl">
          <span>←</span> Kembali
        </Button>
      </div>
    );

  const articlePath = article.type === "news" ? "/blog/news" : "/blog/articles";

  return (
    <>
      <script
        id="jsonld-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "@id": `${typeof window !== "undefined" ? window.location.href : baseUrl}/#breadcrumbs`,
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "News",
                item: `${baseUrl}/blog/news`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: article.title,
              },
            ],
          }),
        }}
      />
      <script
        id="jsonld-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.seo?.metaTitle || article.title,
            description: article.seo?.metaDescription || article.excerpt,
            image: article.seo?.ogImageUrl || article.coverImageUrl,
            datePublished: article.publishedAt,
            dateModified: article.publishedAt,
            author: article.author
              ? {
                  "@type": "Person",
                  name: article.author.name,
                }
              : undefined,
            publisher: {
              "@type": "Organization",
              name: "MULAI+",
              logo: {
                "@type": "ImageObject",
                url: "https://mulaiplus.id/letter-icon-logo.svg",
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${typeof window !== "undefined" ? window.location.href : baseUrl}/blog/articles/${article.slug}`,
            },
          }),
        }}
      />
      <article className="min-h-screen bg-white pt-20">
        <nav className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-0">
          <Link href="/blog" className="font-manrope text-gray-400 text-xs hover:text-brand-navy">
            Blog
          </Link>
          <span className="mx-1.5 font-manrope text-gray-300 text-xs">/</span>
          <Link href={articlePath} className="font-manrope text-gray-400 text-xs hover:text-brand-navy">
            {article.type === "news" ? "News" : "Artikel"}
          </Link>
          <span className="mx-1.5 font-manrope text-gray-300 text-xs">/</span>
          <span className="font-manrope text-gray-600 text-xs">{article.title}</span>
        </nav>
        <header className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 lg:px-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="mb-4 font-bold font-bricolage text-3xl text-brand-navy leading-tight sm:text-4xl lg:text-[2.75rem]">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mb-4 font-manrope text-base text-gray-500 leading-relaxed sm:text-lg">{article.excerpt}</p>
            )}
            <div className="mb-5 flex flex-wrap items-center gap-1.5">
              {article.category && (
                <Badge variant="secondary" className="font-manrope font-medium text-[11px]">
                  {article.category.name}
                </Badge>
              )}
              {article.featured && (
                <Badge className="border-0 bg-brand-orange/10 font-manrope font-semibold text-[10px] text-brand-orange">
                  Featured
                </Badge>
              )}
              {article.tags?.length > 0 && (
                <>
                  <span className="font-manrope text-[10px] text-gray-300">|</span>
                  {article.tags.map((t) => (
                    <Badge key={t.tag.id} variant="outline" className="font-manrope text-[9px] text-gray-500">
                      {t.tag.name}
                    </Badge>
                  ))}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 font-manrope text-gray-400 text-sm">
              {article.author && (
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy/10 font-bold text-brand-navy text-xs">
                    {article.author.name.charAt(0)}
                  </div>
                  <div className="font-medium text-gray-700 text-xs">{article.author.name}</div>
                </div>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {article.publishedAt ? formatDate(article.publishedAt) : "Draft"}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {article.readingTimeMinutes || 3} min read
              </span>
            </div>
          </motion.div>
        </header>

        {article.coverImageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-0"
          >
            <div className="relative aspect-[2/1] overflow-hidden rounded-2xl sm:aspect-[21/9]">
              <Image
                src={article.coverImageUrl}
                alt={article.title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          </motion.div>
        )}

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid gap-10 md:grid-cols-[3fr_1fr] lg:grid-cols-[3fr_1fr]"
          >
            <div>
              <ArticleContent html={article.content} />
              <Separator className="my-10" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-manrope font-medium text-gray-400 text-xs">Bagikan</span>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(article.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full border transition-all hover:bg-black/5"
                  >
                    <Twitter className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("share_article", { article_slug: slug, platform: "facebook" })}
                    className="flex h-8 w-8 items-center justify-center rounded-full border transition-all hover:bg-blue-50"
                  >
                    <Facebook className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("share_article", { article_slug: slug, platform: "linkedin" })}
                    className="flex h-8 w-8 items-center justify-center rounded-full border transition-all hover:bg-blue-50"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent("share_article", { article_slug: slug, platform: "copy" });
                      navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.href : "");
                      toast.success("Link copied!");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border transition-all hover:bg-gray-100"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <aside className="hidden space-y-6 md:block">
              <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/90 p-5 text-center">
                <h3 className="font-bold font-bricolage text-base text-white">Dapatkan Info Terbaru</h3>
                <p className="mt-1.5 font-manrope text-white/60 text-xs leading-relaxed">Subscribe newsletter MULAI+</p>
                <Button className="mt-4 w-full rounded-xl bg-brand-orange font-manrope font-semibold text-white text-xs hover:bg-brand-orange/90">
                  Subscribe Gratis
                </Button>
              </div>
              <SidebarPrograms />
              <SidebarLatestArticles currentSlug={article.slug} type={article.type} />
            </aside>
          </motion.div>
        </div>

        {relatedArticles && relatedArticles.length > 0 && (
          <section className="border-gray-100 border-t bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-0">
              <h2 className="mb-8 font-bold font-bricolage text-2xl text-brand-navy">Artikel Terkait</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {relatedArticles.map((ra: any) => (
                  <RelatedArticleCard key={ra.id} article={ra} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
      <ScrollToTop />
    </>
  );
}

function RelatedArticleCard({ article }: { article: any }) {
  return (
    <Link
      href={`/blog/articles/${article.slug}`}
      className="group flex gap-4 rounded-xl border p-3 transition-all hover:border-brand-orange/30 hover:shadow-sm"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
        {article.coverImageUrl ? (
          <Image src={article.coverImageUrl} alt="" fill className="object-cover" sizes="80px" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-5 w-5 text-brand-navy/30" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 font-bold font-bricolage text-brand-navy text-sm leading-snug transition-colors group-hover:text-brand-orange">
          {article.title}
        </h4>
        <p className="mt-1 font-manrope text-[11px] text-gray-400">
          {article.publishedAt && formatDate(article.publishedAt)}
          {article.author && ` · ${article.author.name}`}
        </p>
      </div>
    </Link>
  );
}

function SidebarPrograms() {
  const { data: result } = useQuery(orpc.programs.public.list.queryOptions({ input: { limit: 3 } }));
  const programs = (result?.data ?? []).slice(0, 3);
  if (programs.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/90 shadow-sm">
      <div className="border-white/10 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 font-bold font-bricolage text-sm text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-xs">🎯</span>Program
          Mentoring
        </h3>
      </div>
      <div className="divide-y divide-white/10">
        {programs.map((p: any) => (
          <Link
            key={p.id}
            href={`/programs/${p.slug}`}
            className="group flex items-start gap-3 px-4 py-3 no-underline transition-all hover:bg-white/5"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
              {p.bannerUrl ? (
                <Image src={p.bannerUrl} alt="" fill className="object-cover" sizes="56px" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white/30" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h4 className="line-clamp-2 font-bold font-bricolage text-white/90 text-xs leading-snug group-hover:text-white">
                {p.name}
              </h4>
              {p.description && (
                <p className="mt-0.5 line-clamp-1 font-manrope text-[10px] text-white/50">{p.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/programs"
        className="flex items-center justify-center gap-1 border-white/10 border-t py-2.5 font-manrope font-semibold text-[11px] text-brand-orange no-underline transition-all hover:bg-white/5"
      >
        Lihat semua program<span>→</span>
      </Link>
    </div>
  );
}

function SidebarLatestArticles({ currentSlug, type }: { currentSlug: string; type: string }) {
  const { data } = useQuery({
    ...orpc.cms.articles.public.list.queryOptions({ type: type as any, limit: 5, offset: 0 }),
  });
  const latest = ((data?.data ?? []) as any[])
    .filter((a: any) => a.slug !== currentSlug && a.type === type)
    .slice(0, 3);
  if (latest.length === 0) return null;
  const prefix = type === "news" ? "/blog/news" : "/blog/articles";
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="border-gray-100 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 font-bold font-bricolage text-brand-navy text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-navy/10 text-xs">📰</span>
          {type === "news" ? "News Terbaru" : "Artikel Terbaru"}
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {latest.map((a: any) => (
          <Link key={a.id} href={`${prefix}/${a.slug}`} className="group no-underline">
            <div className="flex gap-3 px-4 py-3 transition-all hover:bg-gray-50/80">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-navy/5 to-brand-orange/5 ring-1 ring-black/[0.04]">
                {a.coverImageUrl ? (
                  <Image
                    src={a.coverImageUrl}
                    alt=""
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="96px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 font-bold font-bricolage text-brand-navy text-xs leading-snug group-hover:text-brand-orange">
                  {a.title}
                </h4>
                <div className="mt-1.5 flex items-center gap-1.5 font-manrope text-[9px] text-gray-300">
                  {a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}
                  <span>·</span>
                  <span>{a.readingTimeMinutes || 3} min</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href={prefix}
        className="flex items-center justify-center gap-1 border-gray-100 border-t py-2.5 font-manrope font-semibold text-[11px] text-brand-orange no-underline transition-all hover:bg-gray-50"
      >
        Lihat semua<span>→</span>
      </Link>
    </div>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-6 bottom-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg transition-all hover:bg-brand-navy/90",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
