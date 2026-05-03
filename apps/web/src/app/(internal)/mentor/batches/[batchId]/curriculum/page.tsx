"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, CheckCircle, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MentorBatchTabs } from "@/components/mentor/mentor-batch-tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchCurriculumPage() {
  const params = useParams();
  const batchId = params.batchId as string;

  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const { data, isLoading } = useQuery({
    ...orpc.programActivities.mentor.getBatchAttendance.queryOptions({
      input: { batchId },
      enabled: !!isAuthorized && !!batchId,
    }),
    staleTime: 1000 * 60 * 5,
  });

  const syllabus = data?.batch?.program?.syllabus?.sort((a: any, b: any) => a.week - b.week) || [];
  const batch = data?.batch;
  const sessions = data?.mySessions || [];

  return (
    <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/mentor/batches" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-bold font-bricolage text-2xl text-brand-navy md:text-3xl">
              {batch?.name || "Loading..."}
            </h1>
            <p className="font-manrope text-sm text-text-muted-custom">{batch?.program?.name}</p>
          </div>
        </div>

        <MentorBatchTabs batchId={batchId} />

        {/* Syllabus Timeline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-text-muted-custom" />
          </div>
        ) : syllabus.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-bold font-bricolage text-brand-navy text-xl">Program Syllabus</h2>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute top-0 bottom-0 left-[23px] w-0.5 bg-gradient-to-b from-mentor-teal to-brand-navy/30" />

              <div className="space-y-6">
                {syllabus.map((item: any, _index: number) => {
                  // Check if there's a session for this week
                  const weekSession = sessions.find((s: any) => s.week === item.week);
                  const hasSession = !!weekSession;

                  return (
                    <div key={item.id} className="relative flex gap-6">
                      {/* Timeline Dot */}
                      <div
                        className={cn(
                          "relative z-10 flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full shadow-md",
                          hasSession ? "bg-mentor-teal" : "bg-gray-200",
                        )}
                      >
                        {hasSession ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <span className="font-bold font-bricolage text-gray-500 text-sm">{item.week}</span>
                        )}
                      </div>

                      {/* Content Card */}
                      <Card className="mentor-card flex-1">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 font-manrope font-medium text-xs",
                                  hasSession ? "bg-mentor-teal/10 text-mentor-teal" : "bg-gray-100 text-gray-500",
                                )}
                              >
                                Week {item.week}
                              </span>
                              {hasSession && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 font-manrope text-green-700 text-xs">
                                  <CheckCircle className="h-3 w-3" />
                                  Scheduled
                                </span>
                              )}
                            </div>
                            <h3 className="mt-2 font-bold font-bricolage text-base text-text-main">{item.title}</h3>
                            {item.outcome && (
                              <p className="mt-1 font-manrope text-sm text-text-muted-custom">{item.outcome}</p>
                            )}
                          </div>

                          {hasSession && (
                            <Link href={`/mentor/sessions?batchId=${batchId}`}>
                              <Button variant="ghost" size="icon" className="shrink-0 text-gray-400">
                                <ChevronRight className="h-5 w-5" />
                              </Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <BookOpen className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-manrope font-medium text-sm text-text-muted-custom">No syllabus available</p>
            <p className="font-manrope text-text-muted-custom text-xs">The program syllabus has not been set up yet.</p>
          </div>
        )}
      </div>
    </PageState>
  );
}
