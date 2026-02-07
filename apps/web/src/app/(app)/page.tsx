"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

import { HeroSection } from "@/components/front/hero-section";
import { Navbar } from "@/components/front/navbar";

export default function LandingPage() {
  const [selectedCategoryId, _setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, _setSearchQuery] = useState("");

  const { data: categories, isLoading: isCategoriesLoading } = useQuery(orpc.lms.public.categories.queryOptions());
  const { data: courses, isLoading: isCoursesLoading } = useQuery(
    orpc.lms.public.courses.queryOptions({
      input: selectedCategoryId ? { categoryId: selectedCategoryId } : {},
    }),
  );

  const _filteredCourses = useMemo(() => {
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
    <div className="flex w-full flex-col">
      <Navbar />
      <HeroSection />
      <section className="relative flex min-h-svh w-full flex-1 flex-col justify-between overflow-hidden bg-white">
        <div className="relative z-10 mx-auto mt-20 flex max-w-[1052px] flex-col items-center gap-14 text-center">
          <div className="flex flex-col items-center gap-6">
            <h2 className="font-bold text-4xl text-[#1A1F6D]">Daftar Sekarang</h2>
            <p className="text-[#666] text-lg">Daftar sekarang dan mulai belajar dengan mudah dan nyaman.</p>
          </div>
          <Button className="rounded-full bg-[#1A1F6D] font-bold font-inter text-base text-white hover:bg-[#1A1F6D]/90">
            Daftar Sekarang
          </Button>
        </div>
      </section>
    </div>
  );
}
