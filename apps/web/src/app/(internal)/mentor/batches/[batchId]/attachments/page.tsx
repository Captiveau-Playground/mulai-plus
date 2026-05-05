"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MentorBatchAttachments } from "@/components/mentor/batch-attachments";
import { MentorBatchTabs } from "@/components/mentor/mentor-batch-tabs";
import { buttonVariants } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchAttachmentsPage() {
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

  const batch = data?.batch;

  return (
    <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/mentor/batches"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0 text-gray-700")}
          >
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

        <div className="mentor-section">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-text-muted-custom" />
            </div>
          ) : batch ? (
            <MentorBatchAttachments batch={{ id: batch.id, name: batch.name, durationWeeks: batch.durationWeeks }} />
          ) : null}
        </div>
      </div>
    </PageState>
  );
}
