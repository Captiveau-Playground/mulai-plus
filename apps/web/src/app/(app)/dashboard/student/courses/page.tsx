"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, PlayCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentCoursesPage() {
  const { data: courses, isLoading } = useQuery(orpc.payments.myClasses.queryOptions());

  return (
    <PageState isLoading={isLoading}>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">Access your purchased courses and learning materials.</p>
        </div>

        {courses && courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-video w-full bg-muted">
                  {course.thumbnailUrl ? (
                    <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <BookOpen className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">{/* Progress bar could go here later */}</CardContent>
                <CardFooter>
                  <Link href={`/courses/${course.slug}`} className={cn(buttonVariants(), "w-full gap-2")}>
                    <PlayCircle className="h-4 w-4" />
                    Start Learning
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="fade-in-50 flex min-h-[400px] animate-in flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">No courses found</h3>
            <p className="mt-2 mb-4 text-muted-foreground text-sm">You haven't enrolled in any courses yet.</p>
            <Link href="/courses" className={buttonVariants()}>
              Browse Courses
            </Link>
          </div>
        )}
      </div>
    </PageState>
  );
}
