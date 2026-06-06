"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BatchAttachmentsDialog } from "@/components/admin/programs/batch-attachments";
import { BatchPageHeader } from "@/components/admin/programs/batch-page-header";
import { orpc } from "@/utils/orpc";

export default function BatchAttachmentsPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const { data: batch } = useQuery(orpc.programs.admin.batches.get.queryOptions({ input: { id: batchId } }));

  return (
    <div className="space-y-6 p-4">
      <BatchPageHeader programId={params.id as string} batchId={batchId} batch={batch} subtitle="Attachments" />
      {batch && (
        <BatchAttachmentsDialog
          batch={{ id: batchId, name: batch.name, durationWeeks: batch.durationWeeks }}
          open={true}
          onOpenChange={() => {}}
          embedded
        />
      )}
    </div>
  );
}
