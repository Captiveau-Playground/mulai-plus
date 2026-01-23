"use client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Loader2, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  published: boolean;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  price?: number | null;
};

export default function Home() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: categories, isLoading: isCategoriesLoading } = useQuery(orpc.lms.public.categories.queryOptions());
  const { data: courses, isLoading: isCoursesLoading } = useQuery(
    orpc.lms.public.courses.queryOptions({
      input: selectedCategoryId ? { categoryId: selectedCategoryId } : {},
    }),
  );

  const filteredCourses = useMemo(() => {
    const list = (courses || []) as Course[];
    const byCategory = selectedCategoryId ? list.filter((c) => c.categoryId === selectedCategoryId) : list;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.slug?.toLowerCase().includes(q) ?? false) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    );
  }, [courses, selectedCategoryId, searchQuery]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-bold text-3xl">Belajar lebih fokus dengan katalog terkurasi</h1>
              <p className="mt-1 text-muted-foreground">
                Jelajahi kategori, temukan course yang tepat, dan lanjutkan dari Student Dashboard.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                render={
                  <Link href={"/dashboard/student"} aria-label="Buka Student Dashboard">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Buka Dashboard
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategoryId === null ? "default" : "secondary"}
              className={cn("cursor-pointer")}
              onClick={() => setSelectedCategoryId(null)}
            >
              Semua
            </Badge>
            {isCategoriesLoading ? (
              <span className="text-muted-foreground text-sm">Memuat kategori...</span>
            ) : (categories as Category[])?.length ? (
              (categories as Category[]).map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategoryId === cat.id ? "default" : "secondary"}
                  className={cn("cursor-pointer")}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  aria-pressed={selectedCategoryId === cat.id}
                >
                  {cat.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">Tidak ada kategori</span>
            )}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari course..."
              aria-label="Cari course"
              className="pl-8"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-xl">Semua Course</h2>
          <span className="text-muted-foreground text-sm">{filteredCourses.length} course</span>
        </div>

        {isCoursesLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-muted-foreground">Tidak ada course yang cocok.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                {course.thumbnailUrl ? (
                  <div className="relative aspect-video w-full bg-muted">
                    <Image
                      src={course.thumbnailUrl}
                      alt={course.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted" />
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-base">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-muted-foreground text-sm">
                    {course.description || "Belum ada deskripsi"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {course.category?.name && <Badge variant="outline">{course.category.name}</Badge>}
                    <Badge variant={course.published ? "default" : "secondary"}>
                      {course.published ? "Published" : "Draft"}
                    </Badge>
                    {typeof course.price === "number" && (
                      <Badge variant="outline">Rp {course.price.toLocaleString("id-ID")}</Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    render={
                      /* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */
                      <Link href={`/courses/${course.slug}` as any} aria-label={`Lihat detail ${course.title}`}>
                        Lihat Detail
                      </Link>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    render={
                      /* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */
                      <Link href={"/dashboard/student" as any} aria-label={`Mulai belajar ${course.title}`}>
                        Mulai Belajar
                      </Link>
                    }
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
