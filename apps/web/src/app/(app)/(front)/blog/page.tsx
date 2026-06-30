"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

type ArticleItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  type: "news" | "article";
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  featured: boolean;
  author: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  tags: { tag: { name: string; slug: string } }[];
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getReadingTime(minutes: number | null) {
  if (!minutes) return "3 min read";
  return `${minutes} min read`;
}

// ─── Hero Featured ──
function HeroFeatured({ article }: { article: ArticleItem }) {
  return (
    <Link
      href={`/blog/${article.type === "news" ? "news" : "articles"}/${article.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-brand-navy shadow-xl"
    >
      <div className="relative min-h-[300px] md:min-h-[400px]">
        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="100vw"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-navy to-brand-navy/80">
            <BookOpen className="h-20 w-20 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/40 to-transparent" />
        <div className="pointer-events-none absolute top-4 right-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-end p-6 md:p-10 lg:p-12">
          <div className="w-full">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-brand-orange font-manrope font-semibold text-[10px] text-white">
                Featured
              </Badge>
              {article.category && (
                <Badge className="border-0 bg-white/15 font-manrope text-[10px] text-white/90 backdrop-blur-sm">
                  {article.category.name}
                </Badge>
              )}
            </div>
            <h2 className="mb-3 line-clamp-2 max-w-2xl font-bold font-bricolage text-2xl text-white leading-tight md:text-3xl">
              {article.title}
            </h2>
            {article.excerpt && (
              <p className="mb-4 line-clamp-2 max-w-xl font-manrope text-sm text-white/70">{article.excerpt}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 font-manrope text-white/50 text-xs">
              {article.author && <span className="text-white/70">{article.author.name}</span>}
              <span>{article.publishedAt && formatDate(article.publishedAt)}</span>
              <span>{getReadingTime(article.readingTimeMinutes)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Blog Card ──
function BlogCard({ article }: { article: ArticleItem }) {
  return (
    <Link
      href={`/blog/${article.type === "news" ? "news" : "articles"}/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-navy/5 to-brand-orange/5">
        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-8 w-8 text-gray-200" />
          </div>
        )}
        {article.category && (
          <span className="absolute top-2.5 left-2.5 rounded-lg bg-white/90 px-2 py-0.5 font-manrope font-semibold text-[9px] text-brand-navy shadow-sm backdrop-blur-sm">
            {article.category.name}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 font-bold font-bricolage text-brand-navy text-sm leading-snug transition-colors group-hover:text-brand-orange">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="line-clamp-2 font-manrope text-gray-400 text-xs leading-relaxed">{article.excerpt}</p>
        )}
        <p className="font-manrope text-[10px] text-gray-300">
          {article.publishedAt && formatDate(article.publishedAt)}
        </p>
      </div>
    </Link>
  );
}

// ─── Page ──
export default function BlogPage() {
  const { data: dataArticles, isLoading: loadingArticles } = useQuery({
    ...orpc.cms.articles.public.list.queryOptions({ type: "article", limit: 6 }),
  });
  const { data: dataNews, isLoading: loadingNews } = useQuery({
    ...orpc.cms.articles.public.list.queryOptions({ type: "news", limit: 4 }),
  });
  const { isLoading: loadingCats } = useQuery(orpc.cms.categories.public.list.queryOptions());

  const articles = ((dataArticles?.data ?? []) as ArticleItem[]).filter((a) => a.type === "article");
  const news = ((dataNews?.data ?? []) as ArticleItem[]).filter((a) => a.type === "news");
  const featured = articles.find((a) => a.featured) || articles[0];

  const isLoading = loadingArticles || loadingNews || loadingCats;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f8f9fc]">
        <section className="relative bg-[#1A1F6D] py-16 sm:py-20">
          <div className="container relative z-10 mx-auto mt-10 max-w-6xl px-4 text-center">
            <Skeleton className="mx-auto h-4 w-32 rounded-full bg-white/20" />
            <Skeleton className="mx-auto mt-4 h-12 w-96 rounded-lg bg-white/20" />
            <Skeleton className="mx-auto mt-3 h-5 w-72 rounded-lg bg-white/20" />
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="mb-10 h-[320px] w-full rounded-2xl bg-gray-200 md:h-[400px]" />
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fc]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-navy/95 pt-16 sm:pt-20">
        {/* Background image */}
        <div className="pointer-events-none absolute inset-0">
          <Image src="/explore/street.webp" alt="" fill className="object-cover object-bottom" sizes="100vw" priority />
          <div className="absolute inset-0 bg-brand-navy/70" />
          <div className="absolute inset-0 bg-brand-navy/30" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-12 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange to-brand-red shadow-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold font-bricolage text-2xl text-white sm:text-3xl">Blog MULAI+</h1>
              <p className="mt-1 font-manrope text-sm text-white/50">
                Tips, panduan, dan info terbaru seputar jurusan kuliah, beasiswa, dan persiapan PTN
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Link href="/blog/articles">
              <Button className="rounded-xl bg-brand-orange px-6 font-manrope font-semibold text-sm text-white hover:bg-brand-orange/90">
                Artikel
              </Button>
            </Link>
            <Link href="/blog/news">
              <Button className="rounded-xl border-2 border-white/30 bg-transparent px-6 font-manrope font-semibold text-sm text-white hover:bg-white/10">
                News
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Featured */}
        {featured && (
          <section className="mb-10">
            <HeroFeatured article={featured} />
          </section>
        )}

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Latest Articles */}
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold font-bricolage text-brand-navy text-lg">Artikel Terbaru</h2>
              <Link href="/blog/articles" className="font-manrope font-medium text-brand-orange text-xs">
                Lihat semua →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.length > 0 ? (
                articles.slice(0, 4).map((a) => <BlogCard key={a.id} article={a} />)
              ) : (
                <p className="col-span-2 py-8 text-center font-manrope text-gray-400 text-sm">Belum ada artikel.</p>
              )}
            </div>
          </section>

          {/* Latest News */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold font-bricolage text-brand-navy text-lg">News</h2>
              <Link href="/blog/news" className="font-manrope font-medium text-brand-orange text-xs">
                Lihat semua →
              </Link>
            </div>
            <div className="space-y-3">
              {news.length > 0 ? (
                news.slice(0, 4).map((n) => <BlogCard key={n.id} article={n} />)
              ) : (
                <p className="py-8 text-center font-manrope text-gray-400 text-sm">Belum ada news.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
