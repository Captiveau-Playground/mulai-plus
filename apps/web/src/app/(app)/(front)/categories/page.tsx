"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery(orpc.lms.public.categories.queryOptions());

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 font-bold text-2xl">Categories</h1>
      {isLoading ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">Memuat kategori...</div>
      ) : !categories?.length ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">Tidak ada kategori</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader>
                <CardTitle className="line-clamp-1 text-base">{cat.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="line-clamp-2 text-muted-foreground text-sm">{cat.description || "Belum ada deskripsi"}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{cat.slug}</Badge>
                  {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
                  <Link href={"/courses" as any} className="text-sm underline">
                    Lihat Course
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
