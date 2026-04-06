"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BatchParticipants } from "@/components/mentor/batch-participants";
import { MentorBatchTabs } from "@/components/mentor/mentor-batch-tabs";
import { buttonVariants } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchParticipantsPage() {
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
          ) : (
            <BatchParticipants batchId={batchId} />
          )}
        </div>
      </div>
    </PageState>
  );
}
