"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BatchPageHeader } from "@/components/admin/programs/batch-page-header";
import { SummaryReportsReview } from "@/components/admin/programs/summary-reports-review";
import { orpc } from "@/utils/orpc";

export default function BatchSummaryReportsPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const { data: batch } = useQuery(orpc.programs.admin.batches.get.queryOptions({ input: { id: batchId } }));

  return (
    <div className="space-y-6">
      <BatchPageHeader programId={params.id as string} batchId={batchId} batch={batch} subtitle="Summary Reports" />
      {batch && (
        <SummaryReportsReview
          batch={{ id: batchId, name: batch.name, programId: params.id as string }}
          open={true}
          onOpenChange={() => {}}
          embedded
        />
      )}
    </div>
  );
}
