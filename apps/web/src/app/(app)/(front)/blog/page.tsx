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
      href={`/blog/articles/${article.slug}`}
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
            <h2 className="mb-3 max-w-2xl font-bold font-bricolage text-2xl text-white leading-tight md:text-3xl">
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

// ─── Mini Card ──
function MiniCard({ article }: { article: ArticleItem }) {
  return (
    <Link
      href={`/blog/articles/${article.slug}`}
      className="group flex gap-3 rounded-xl border p-3 transition-all hover:border-brand-orange/30 hover:shadow-sm"
    >
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-navy/5 to-brand-orange/5">
        {article.coverImageUrl ? (
          <Image src={article.coverImageUrl} alt="" fill className="object-cover" sizes="96px" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-5 w-5 text-gray-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 font-bold font-bricolage text-brand-navy text-xs leading-snug transition-colors group-hover:text-brand-orange">
          {article.title}
        </h4>
        <p className="mt-1 font-manrope text-[10px] text-gray-400">
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
  const { data: categories, isLoading: loadingCats } = useQuery(orpc.cms.categories.public.list.queryOptions());

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
      {/* Hero Section — mirip /programs */}
      <section className="relative bg-[#1A1F6D] py-16 sm:py-20">
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container relative z-10 mx-auto mt-10 max-w-6xl px-4 text-center">
          <h1 className="font-bold font-bricolage text-4xl text-white leading-tight sm:text-5xl lg:text-6xl">
            Blog MULAI+
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-manrope text-base text-white/80 sm:text-lg">
            Tips, panduan, dan info terbaru seputar jurusan kuliah, beasiswa, dan persiapan PTN
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
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
      </section>

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
              {articles.slice(0, 4).map((a) => (
                <MiniCard key={a.id} article={a} />
              ))}
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
              {news.slice(0, 4).map((n) => (
                <MiniCard key={n.id} article={n} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
