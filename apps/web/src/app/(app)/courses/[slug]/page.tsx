"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

import { OrderActions } from "./_components/order-actions";

export default function CourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const courseQuery = orpc.lms.public.courseBySlug.queryOptions({
    input: { slug },
  });
  const { data: course, isLoading } = useQuery({
    ...courseQuery,
    enabled: !!slug,
  });

  const relatedQuery = orpc.lms.public.courses.queryOptions({
    input: course?.categoryId ? { categoryId: course.categoryId } : {},
  });
  const { data: related } = useQuery({
    ...relatedQuery,
    enabled: !!course?.categoryId,
  });

  const relatedCourses = useMemo(
    () => (related || []).filter((c) => c.id !== course?.id).slice(0, 6),
    [related, course?.id],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          Course tidak ditemukan atau belum dipublikasikan.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <section className="mb-6">
        <div className="rounded-xl border bg-card">
          {course.thumbnailUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
              <Image
                src={course.thumbnailUrl}
                alt={course.title}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1024px"
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-t-xl bg-muted" />
          )}
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              {course.category?.name && <Badge variant="outline">{course.category.name}</Badge>}
              <Badge variant="default">Published</Badge>
              {typeof course.price === "number" && (
                <Badge variant="outline">Rp {course.price?.toLocaleString("id-ID")}</Badge>
              )}
            </div>
            <h1 className="mt-3 font-bold text-2xl">{course.title}</h1>
            <p className="mt-2 text-muted-foreground">{course.description || "Belum ada deskripsi"}</p>
            <div className="mt-3 text-muted-foreground text-sm">
              {course.user?.name && (
                <span>
                  Mentor: <span className="font-medium text-foreground">{course.user.name}</span>
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {Array.isArray(course.benefits) &&
                course.benefits.map((b) => (
                  <Badge key={b} variant="secondary">
                    {b}
                  </Badge>
                ))}
              {Array.isArray(course.tags) &&
                course.tags.map((t) => (
                  <Badge key={t.tagId} variant="outline" className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {t.tag?.name}
                  </Badge>
                ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              {typeof course.price === "number" ? (
                (() => {
                  const price = course.price ?? 0;
                  const discountType = (course.discountType as "fixed" | "percentage") ?? "fixed";
                  const discountValue = course.discountValue ?? 0;
                  const discounted =
                    discountType === "percentage"
                      ? Math.max(0, price - Math.floor((price * discountValue) / 100))
                      : Math.max(0, price - discountValue);
                  const hasDiscount = discountValue > 0;
                  return (
                    <>
                      <span className="text-muted-foreground text-sm">Harga:</span>
                      {hasDiscount && (
                        <span className="text-muted-foreground line-through">Rp {price.toLocaleString("id-ID")}</span>
                      )}
                      <span className="font-semibold text-foreground">
                        Rp {(hasDiscount ? discounted : price).toLocaleString("id-ID")}
                      </span>
                      {hasDiscount && (
                        <Badge variant="outline">
                          {discountType === "percentage"
                            ? `${discountValue}%`
                            : `- Rp ${discountValue.toLocaleString("id-ID")}`}
                        </Badge>
                      )}
                    </>
                  );
                })()
              ) : (
                <span className="text-muted-foreground text-sm">Harga tidak tersedia</span>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <OrderActions courseId={course.id} price={course.price || 0} title={course.title} slug={course.slug} />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-xl">Syllabus</h2>
        <div className="space-y-3">
          {course.sections?.length ? (
            course.sections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {section.lessons?.length ? (
                    <ul className="space-y-2">
                      {section.lessons.map((lesson) => (
                        <li key={lesson.id} className="flex items-center justify-between rounded-md border p-2">
                          <span className="line-clamp-1">{lesson.title}</span>
                          <Badge variant="secondary">Lesson</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground text-sm">Belum ada lesson dipublikasikan</div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-lg border p-6 text-center text-muted-foreground">Belum ada section</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-xl">Course Terkait</h2>
        {relatedCourses.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedCourses.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                {c.thumbnailUrl ? (
                  <div className="relative aspect-video w-full bg-muted">
                    <Image
                      src={c.thumbnailUrl}
                      alt={c.title}
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
                  <CardTitle className="line-clamp-1 text-base">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-muted-foreground text-sm">{c.description || "Belum ada deskripsi"}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.category?.name && <Badge variant="outline">{c.category.name}</Badge>}
                    {typeof c.price === "number" && (
                      <Badge variant="outline">Rp {c.price?.toLocaleString("id-ID")}</Badge>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary">
                      <Link href={`/courses/${c.slug}` as any}>Lihat Detail</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border p-6 text-center text-muted-foreground">Tidak ada course terkait</div>
        )}
      </section>
    </div>
  );
}
