"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BatchPageHeader } from "@/components/admin/programs/batch-page-header";
import { BatchTimelineDialog } from "@/components/admin/programs/dialogs/batch-timeline";
import { orpc } from "@/utils/orpc";

export default function BatchTimelinePage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const { data: batch } = useQuery(orpc.programs.admin.batches.get.queryOptions({ input: { id: batchId } }));

  return (
    <div className="min-h-screen bg-bg-light p-4">
      <div className="max-w-full space-y-6">
        <BatchPageHeader programId={params.id as string} batchId={batchId} batch={batch} subtitle="Timeline" />
        {batch && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <BatchTimelineDialog
              batch={{
                name: batch.name,
                startDate: batch.startDate,
                endDate: batch.endDate,
                registrationStartDate: batch.registrationStartDate,
                registrationEndDate: batch.registrationEndDate,
                verificationStartDate: batch.verificationStartDate,
                verificationEndDate: batch.verificationEndDate,
                assessmentStartDate: batch.assessmentStartDate,
                assessmentEndDate: batch.assessmentEndDate,
                announcementDate: batch.announcementDate,
                onboardingDate: batch.onboardingDate,
              }}
              open={true}
              onOpenChange={() => {}}
              embedded
            />
          </div>
        )}
      </div>
    </div>
  );
}
