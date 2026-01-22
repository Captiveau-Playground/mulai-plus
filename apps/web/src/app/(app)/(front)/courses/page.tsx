"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export default function CoursesPage() {
  const { data: courses, isLoading } = useQuery(orpc.lms.public.courses.queryOptions({ input: {} }));

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 font-bold text-2xl">Courses</h1>
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !courses?.length ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">Tidak ada course</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <div className="relative aspect-video w-full bg-muted">
                {course.thumbnailUrl && (
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                )}
              </div>
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
                  render={<Link href={`/courses/${course.slug}` as Route}>Lihat Detail</Link>}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
