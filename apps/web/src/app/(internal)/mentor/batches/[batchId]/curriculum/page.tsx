"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MentorBatchTabs } from "@/components/mentor/mentor-batch-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const syllabus = data?.batch?.program?.syllabus?.sort((a, b) => a.week - b.week) || [];

  return (
    <PageState isLoading={isAuthLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href={"/mentor/batches" as any} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-semibold text-lg">{data?.batch?.name || "Loading..."}</h1>
        </div>

        <MentorBatchTabs batchId={batchId} />

        <div className="mt-4">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : syllabus.length > 0 ? (
            <div className="space-y-4">
              {syllabus.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                        {item.week}
                      </span>
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  {item.outcome && (
                    <CardContent>
                      <p className="text-muted-foreground">{item.outcome}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
              <p>No curriculum found for this program.</p>
            </div>
          )}
        </div>
      </div>
    </PageState>
  );
}
