"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  category: { name: string; slug: string } | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ArticleCard({ article, index }: { article: ArticleItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link
        href={`/blog/${article.type === "news" ? "news" : "articles"}/${article.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange/20 hover:shadow-md"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-brand-navy/[0.04]">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 50vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="h-10 w-10 text-brand-navy/15" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {article.category && (
              <Badge variant="secondary" className="font-manrope font-medium text-[9px]">
                {article.category.name}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "font-manrope text-[9px] uppercase tracking-wider",
                article.type === "news" && "border-brand-orange/30 text-brand-orange",
              )}
            >
              {article.type === "news" ? "News" : "Artikel"}
            </Badge>
          </div>
          <h3 className="mb-1.5 line-clamp-2 font-bold font-bricolage text-brand-navy text-sm leading-snug transition-colors group-hover:text-brand-orange">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="mb-3 line-clamp-2 font-manrope text-gray-500 text-xs leading-relaxed">{article.excerpt}</p>
          )}
          <div className="mt-auto flex items-center gap-3 border-gray-100 border-t pt-2.5 font-manrope text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {article.publishedAt ? formatDate(article.publishedAt) : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readingTimeMinutes || 3} min read
            </span>
          </div>
        </div>
        {/* Accent bar */}
        <div
          className={cn(
            "h-0.5 w-0 transition-all duration-300 group-hover:w-full",
            article.type === "news" ? "bg-brand-orange" : "bg-brand-navy",
          )}
        />
      </Link>
    </motion.div>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2.5 p-5">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

export function BlogSection() {
  const { data, isLoading } = useQuery({
    ...orpc.cms.articles.public.list.queryOptions({ limit: 4, offset: 0 }),
  });
  const allArticles = ((data?.data ?? []) as ArticleItem[]).slice(0, 4);

  return (
    <section aria-label="Blog" className="relative bg-white py-16 sm:py-20 lg:py-24">
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {/* Subtle bg decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 h-64 w-64 rounded-full bg-brand-navy/[0.01] blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Badge className="mb-3 inline-flex border-0 bg-brand-orange/10 font-manrope font-semibold text-[10px] text-brand-orange uppercase tracking-wider">
              Blog
            </Badge>
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy sm:text-3xl lg:text-4xl">
              Artikel &amp; Berita Terbaru
            </h2>
            <p className="mt-1 font-manrope text-sm text-text-muted">
              Tips, panduan, dan info seputar kuliah dan beasiswa
            </p>
          </div>
          <Link href="/blog">
            <Button className="group rounded-full bg-brand-navy font-manrope text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90 hover:shadow-md">
              Lihat Semua
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="scrollbar-none flex gap-4 overflow-x-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[75vw] min-w-[260px] shrink-0 md:w-[320px]">
                <CardSkeleton />
              </div>
            ))}
          </div>
        ) : allArticles.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-gray-300" />
            <p className="font-bricolage font-semibold text-base text-gray-900">Belum ada artikel</p>
            <p className="mt-1 font-manrope text-gray-500 text-sm">Artikel terbaru akan muncul di sini.</p>
          </div>
        ) : (
          <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto">
            {allArticles.map((article, i) => (
              <div key={article.id} className="w-[75vw] min-w-[260px] shrink-0 snap-start md:w-[320px]">
                <ArticleCard article={article} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
