"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, PlayCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { orpc } from "@/utils/orpc";

export default function StudentCoursesPage() {
  const { data: courses, isLoading } = useQuery(orpc.payments.myClasses.queryOptions());

  return (
    <PageState isLoading={isLoading}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div>
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">My Courses</h1>
          <p className="mt-2 font-manrope text-base text-text-muted-custom md:text-lg">
            Access your purchased courses and learning materials.
          </p>
        </div>

        {courses && courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="student-card-hover flex flex-col overflow-hidden bg-white">
                <div className="relative aspect-video w-full bg-gradient-to-br from-brand-navy/10 to-brand-navy-light/10">
                  {course.thumbnailUrl ? (
                    <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="h-10 w-10 text-brand-navy/20" />
                    </div>
                  )}
                </div>
                <CardHeader className="bg-white pb-3">
                  <CardTitle className="line-clamp-2 font-bricolage text-lg text-text-main">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-3 font-manrope text-text-muted-custom">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 bg-white">{/* Progress bar could go here later */}</CardContent>
                <CardFooter className="bg-white pt-0">
                  <Link href={`/courses/${course.slug}`} className="w-full">
                    <Button className="btn-brand-navy w-full gap-2 rounded-full">
                      <PlayCircle className="h-4 w-4" />
                      Start Learning
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="student-card">
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center bg-white py-12 text-center sm:min-h-[400px]">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-navy/10">
                <BookOpen className="h-10 w-10 text-brand-navy" />
              </div>
              <h3 className="font-bold font-bricolage text-text-main text-xl">No courses found</h3>
              <p className="mt-2 mb-6 font-manrope text-sm text-text-muted-custom sm:text-base">
                You haven't enrolled in any courses yet.
              </p>
              <Link href="/courses">
                <Button className="btn-brand-red rounded-full">Browse Courses</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </PageState>
  );
}
