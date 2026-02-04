"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { MentorBatchAttachments } from "@/components/mentor/batch-attachments";
import { buttonVariants } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchAttachmentsPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const _pathname = usePathname();

  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const { data, isLoading } = useQuery(
    orpc.programActivities.mentor.getBatchAttendance.queryOptions({
      input: { batchId },
      enabled: !!isAuthorized && !!batchId,
    }),
  );

  return (
    <PageState isLoading={isAuthLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href={"/mentor/batches" as any} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-semibold text-lg">{data?.batch?.name}</h1>
        </div>

        <Tabs defaultValue="attachments" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <Link href={`/mentor/batches/${batchId}/attendance` as any}>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </Link>
            <TabsTrigger value="attachments">Resources</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            data?.batch && <MentorBatchAttachments batch={data.batch} />
          )}
        </div>
      </div>
    </PageState>
  );
}
