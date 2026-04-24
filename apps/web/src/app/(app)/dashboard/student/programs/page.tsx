"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Award, BookOpen, Calendar, GraduationCap } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentProgramsPage() {
  const { data: programs, isLoading } = useQuery(orpc.programs.student.myPrograms.queryOptions());

  return (
    <PageState isLoading={isLoading}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">My Programs</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Manage and track your enrolled mentoring programs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5">
              <div className="icon-box-navy">
                <GraduationCap className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">{programs?.length || 0}</p>
                <p className="font-manrope text-sm text-text-muted-custom">Active Programs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5">
              <div className="icon-box-red">
                <Calendar className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">
                  {programs?.reduce((acc, p) => acc + (p.batch?.durationWeeks || 0), 0) || 0}
                </p>
                <p className="font-manrope text-sm text-text-muted-custom">Total Weeks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="student-card">
            <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5">
              <div className="icon-box-orange">
                <Award className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">
                  {programs?.filter((p) => p.batch?.status === "completed").length || 0}
                </p>
                <p className="font-manrope text-sm text-text-muted-custom">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Programs Grid */}
        {programs && programs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => {
              const isActive = program.batch?.status === "running";
              const isCompleted = program.batch?.status === "completed";
              const startDate = program.batch?.startDate ? new Date(program.batch.startDate) : null;
              const endDate = program.batch?.endDate ? new Date(program.batch.endDate) : null;

              return (
                <Card
                  key={program.id}
                  className="group overflow-hidden border-0 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Banner */}
                  <div className="relative aspect-video w-full bg-gradient-to-br from-brand-navy to-brand-navy-light">
                    {program.bannerUrl ? (
                      <Image
                        src={program.bannerUrl}
                        alt={program.name || "Program Banner"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <GraduationCap className="h-16 w-16 text-white/30" />
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <Badge
                        className={cn(
                          "rounded-full px-3 py-1 font-inter font-semibold text-xs",
                          isActive && "bg-green-500 text-white",
                          isCompleted && "bg-brand-navy-light text-white",
                          !isActive && !isCompleted && "bg-brand-orange text-white",
                        )}
                      >
                        {isActive ? "Active" : isCompleted ? "Completed" : "Upcoming"}
                      </Badge>
                    </div>
                    {/* Batch Name */}
                    <div className="absolute right-4 bottom-4 left-4">
                      <h3 className="font-bold font-bricolage text-lg text-white sm:text-xl">{program.batch?.name}</h3>
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="bg-white p-5">
                    <h3 className="mb-2 line-clamp-1 font-bold font-bricolage text-lg text-text-main">
                      {program.name}
                    </h3>
                    <p className="mb-4 line-clamp-2 font-manrope text-sm text-text-muted-custom">
                      {program.description}
                    </p>

                    {/* Meta Info */}
                    <div className="mb-4 space-y-2">
                      {startDate && (
                        <div className="flex items-center gap-2 font-manrope text-sm text-text-muted-custom">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(startDate, "MMM d, yyyy")} - {endDate ? format(endDate, "MMM d, yyyy") : "TBD"}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 font-manrope text-sm text-text-muted-custom">
                        <BookOpen className="h-4 w-4" />
                        <span>{program.batch?.durationWeeks || 0} weeks program</span>
                      </div>
                    </div>

                    {/* Joined Date */}
                    <div className="flex items-center justify-between">
                      <span className="font-manrope text-text-muted-custom text-xs">
                        Joined {format(new Date(program.joinedAt), "MMM d, yyyy")}
                      </span>
                      <Link
                        href={`/dashboard/student/programs/${program.id}`}
                        as={`/dashboard/student/programs/${program.id}` as Route}
                      >
                        <Button size="sm" className="btn-brand-navy rounded-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="student-card">
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center bg-white py-12 text-center sm:min-h-[400px]">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-navy/10">
                <GraduationCap className="h-10 w-10 text-brand-navy" />
              </div>
              <h3 className="font-bold font-bricolage text-text-main text-xl">No programs yet</h3>
              <p className="mt-2 mb-6 font-manrope text-sm text-text-muted-custom sm:text-base">
                You haven't enrolled in any mentoring programs.
              </p>
              <Link href={"/programs" as Route}>
                <Button className="btn-brand-red rounded-full">Browse Programs</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </PageState>
  );
}
