"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

import { AboutUs } from "@/components/front/about-us";
import { CTASection } from "@/components/front/cta-section";
import { FAQSection } from "@/components/front/faq-section";
import { FeaturedPrograms } from "@/components/front/featured-programs";
import { HeroSection } from "@/components/front/hero-section";
import { MeetTheMentor } from "@/components/front/meet-the-mentor";
import { SocialProof } from "@/components/front/social-proof";

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
      <HeroSection />
      <SocialProof />
      <AboutUs />
      <FeaturedPrograms />
      <MeetTheMentor />
      <FAQSection />
      <CTASection />
    </div>
  );
}
