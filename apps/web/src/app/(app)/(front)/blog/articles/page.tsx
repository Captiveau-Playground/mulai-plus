"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  Hash,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  author: { name: string; slug: string; avatarUrl: string | null } | null;
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

// ─── Skel ────────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

// ─── Featured Hero ────────────────────────────────────────────────────────────

function FeaturedHero({ article }: { article: ArticleItem }) {
  return (
    <Link
      href={`/blog/articles/${article.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-brand-navy shadow-xl transition-all hover:shadow-2xl"
    >
      <div className="relative min-h-[320px] md:min-h-[420px]">
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
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/60 via-transparent to-transparent" />

        <div className="pointer-events-none absolute top-4 right-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="w-full p-6 md:p-10 lg:p-12">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-brand-orange font-manrope font-semibold text-[10px] text-white shadow-sm">
                <Sparkles className="mr-1 h-3 w-3" />
                Featured
              </Badge>
              {article.category && (
                <Badge className="border-0 bg-white/15 font-manrope text-[10px] text-white/90 backdrop-blur-sm">
                  {article.category.name}
                </Badge>
              )}
              {article.tags?.slice(0, 2).map((t) => (
                <Badge
                  key={t.tag.slug}
                  variant="outline"
                  className="border-white/20 font-manrope text-[9px] text-white/60 backdrop-blur-sm"
                >
                  {t.tag.name}
                </Badge>
              ))}
            </div>

            <h2 className="mb-3 line-clamp-2 max-w-2xl font-bold font-bricolage text-2xl text-white leading-tight md:text-3xl lg:text-4xl">
              {article.title}
            </h2>

            {article.excerpt && (
              <p className="mb-4 line-clamp-2 max-w-xl font-manrope text-sm text-white/70 leading-relaxed md:text-base">
                {article.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 font-manrope text-white/50 text-xs">
              {article.author && (
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-bold text-[9px] text-white">
                    {article.author.name.charAt(0)}
                  </span>
                  <span className="text-white/70">{article.author.name.split(" ")[0]}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {article.publishedAt && formatDate(article.publishedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {getReadingTime(article.readingTimeMinutes)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ article, index }: { article: ArticleItem; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md"
    >
      <Link href={`/blog/articles/${article.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-navy/5 to-brand-orange/5">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="h-10 w-10 text-brand-navy/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        <div className="p-4">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {article.type === "news" ? (
              <Badge variant="outline" className="font-manrope text-[9px] uppercase tracking-wider">
                News
              </Badge>
            ) : null}
            {article.category && (
              <Badge variant="secondary" className="font-manrope font-medium text-[9px]">
                {article.category.name}
              </Badge>
            )}
          </div>

          <h3 className="mb-1.5 line-clamp-2 font-bold font-bricolage text-brand-navy text-sm leading-snug transition-colors group-hover:text-brand-orange">
            {article.title}
          </h3>

          {article.excerpt && (
            <p className="mb-3 line-clamp-2 font-manrope text-gray-500 text-xs leading-relaxed">{article.excerpt}</p>
          )}

          <div className="flex items-center gap-2.5 border-gray-100 border-t pt-2.5 font-manrope text-[10px] text-gray-400">
            {article.author && (
              <span className="flex items-center gap-1">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-navy/10 font-bold text-[7px] text-brand-navy">
                  {article.author.name.charAt(0)}
                </div>
                {article.author.name.split(" ")[0]}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {article.publishedAt ? formatDate(article.publishedAt) : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getReadingTime(article.readingTimeMinutes)}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

// ─── Horizontal Card (for sidebar / news list) ────────────────────────────────

function _HorizontalCard({ article }: { article: ArticleItem }) {
  return (
    <Link
      href={`/blog/articles/${article.slug}`}
      className="group flex gap-3 rounded-lg border p-2.5 transition-all hover:border-brand-orange/30 hover:shadow-sm"
    >
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
        {article.coverImageUrl ? (
          <Image src={article.coverImageUrl} alt="" fill className="object-cover" sizes="96px" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-5 w-5 text-brand-navy/30" />
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArticlesPage() {
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | undefined>();
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 12;

  const { data: categories } = useQuery(orpc.cms.categories.public.list.queryOptions());
  const { data, isLoading, isError, refetch } = useQuery({
    ...orpc.cms.articles.public.list.queryOptions({
      type: "article",
      categorySlug,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
  });

  const articles = ((data?.data ?? []) as ArticleItem[]).filter((a) => a.type === "article");
  const _total = data?.pagination?.total ?? 0;
  const totalPages = Math.ceil(articles.length / PAGE_SIZE);

  // Split featured & regular
  const featured = articles.filter((a) => a.featured);
  const rest = articles.filter((a) => !a.featured);
  const heroArticle = featured[0] || rest[0];
  const gridArticles = rest.slice(heroArticle === rest[0] ? 1 : 0);

  // Client-side search filter
  const filtered = search.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.excerpt?.toLowerCase().includes(search.toLowerCase()),
      )
    : articles;

  return (
    <main className="min-h-screen bg-[#f8f9fc]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-navy/95 pt-16 sm:pt-20">
        {/* Background image */}
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/explore/building.webp"
            alt=""
            fill
            className="object-cover object-bottom"
            sizes="100vw"
            priority
          />
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
          <nav className="mb-4 font-manrope text-white/50 text-xs">
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/80">Artikel</span>
          </nav>
          <h1 className="font-bold font-bricolage text-2xl text-white sm:text-3xl">Artikel</h1>
          <p className="mt-1 font-manrope text-sm text-white/50">
            Kumpulan artikel seputar jurusan kuliah, beasiswa, dan persiapan PTN
          </p>
          {/* Search */}
          <div className="mt-6 w-full max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari artikel..."
                className="h-11 border-white/15 bg-white/10 pl-9 font-manrope text-sm text-white backdrop-blur-sm placeholder:text-white/30 focus:border-brand-orange focus:ring-brand-orange/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search results ── */}
      {search.trim() ? (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="mb-6 font-manrope text-gray-400 text-xs">
            Hasil pencarian &ldquo;{search}&rdquo; — {filtered.length} ditemukan
          </p>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Search className="mb-3 h-10 w-10 text-gray-300" />
              <p className="font-bricolage font-semibold text-gray-900">Tidak ditemukan</p>
              <p className="mt-1 font-manrope text-gray-500 text-sm">Coba kata kunci lain.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((a, i) => (
                <ArticleCard key={a.id} article={a} index={i} />
              ))}
            </div>
          )}
        </section>
      ) : isLoading ? (
        /* ── Loading ── */
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Featured skeleton */}
          <Skeleton className="mb-8 h-[300px] w-full rounded-2xl md:h-[400px]" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : isError ? (
        /* ── Error ── */
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
            <p className="mb-1 font-bricolage font-semibold text-gray-900 text-lg">Gagal memuat artikel</p>
            <p className="mb-6 font-manrope text-gray-500 text-sm">Coba refresh halaman.</p>
            <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" />
              Muat Ulang
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* ── Featured Hero ── */}
          {heroArticle && (
            <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
              <FeaturedHero article={heroArticle} />
            </section>
          )}

          {/* ── Main Content: Grid + Sidebar ── */}
          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              {/* Left: Articles Grid */}
              <div>
                {/* Category quick filter chips */}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <Layers className="h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => {
                      setCategorySlug(undefined);
                      setPage(0);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 font-manrope font-medium text-xs transition-all",
                      !categorySlug ? "bg-brand-navy text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-100",
                    )}
                  >
                    Semua
                  </button>
                  {categories?.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategorySlug(cat.slug);
                        setPage(0);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1.5 font-manrope font-medium text-xs transition-all",
                        categorySlug === cat.slug
                          ? "bg-brand-navy text-white"
                          : "bg-white text-gray-600 shadow-sm hover:bg-gray-100",
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Section header */}
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-bold font-bricolage text-brand-navy text-lg">
                    <TrendingUp className="h-5 w-5 text-brand-orange" />
                    {categorySlug
                      ? (categories?.find((c: any) => c.slug === categorySlug)?.name ?? "Artikel")
                      : "Terbaru"}
                  </h2>
                  <span className="font-manrope text-gray-400 text-xs">{articles.length} artikel</span>
                </div>

                {/* Cards */}
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {gridArticles.map((a, i) => (
                    <ArticleCard key={a.id} article={a} index={i} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="rounded-xl font-manrope text-xs"
                    >
                      ← Sebelumnya
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      // Show limited page numbers with current in range
                      const start = Math.max(0, Math.min(page - 3, totalPages - 7));
                      const pageNum = start + i;
                      if (pageNum >= totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "h-8 w-8 rounded-xl p-0 font-manrope text-xs",
                            page === pageNum ? "bg-brand-navy text-white" : "",
                          )}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="rounded-xl font-manrope text-xs"
                    >
                      Selanjutnya →
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Right Sidebar ── */}
              <aside className="space-y-6">
                {/* Categories */}
                {categories && categories.length > 0 && (
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 font-bold font-bricolage text-brand-navy text-sm">
                      <Layers className="h-4 w-4 text-brand-orange" />
                      Kategori
                    </h3>
                    <div className="space-y-1">
                      {categories.map((cat: any) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategorySlug(cat.slug);
                            setPage(0);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 font-manrope text-xs transition-all",
                            categorySlug === cat.slug
                              ? "bg-brand-navy/5 font-medium text-brand-navy"
                              : "text-gray-600 hover:bg-gray-50",
                          )}
                        >
                          <span>{cat.name}</span>
                          {cat.children?.length > 0 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] text-gray-400">
                              {cat.children.length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags Cloud */}
                {articles.length > 0 && (
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 font-bold font-bricolage text-brand-navy text-sm">
                      <Hash className="h-4 w-4 text-brand-orange" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Map(articles.flatMap((a) => a.tags?.map((t) => [t.tag.slug, t.tag]) ?? [])).values(),
                      )
                        .slice(0, 15)
                        .map((tag) => (
                          <span
                            key={tag.slug}
                            className="rounded-full bg-gray-100 px-2.5 py-1 font-manrope text-[10px] text-gray-500 transition-colors hover:bg-brand-navy/10 hover:text-brand-navy"
                          >
                            #{tag.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="border-gray-200/60 border-t bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="rounded-2xl bg-gradient-to-r from-brand-navy to-brand-navy/90 p-8 text-center sm:p-12">
                <h2 className="font-bold font-bricolage text-white text-xl sm:text-2xl">Dapatkan Info Terbaru</h2>
                <p className="mt-2 font-manrope text-sm text-white/60">
                  Subscribe newsletter untuk dapat artikel dan berita terbaru dari MULAI+
                </p>
                <Button className="mt-5 rounded-xl bg-brand-orange px-6 font-manrope font-semibold text-white hover:bg-brand-orange/90">
                  Subscribe Newsletter
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
