"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BatchPageHeader } from "@/components/admin/programs/batch-page-header";
import { MentorMenteeAssignDialog } from "@/components/admin/programs/mentor-mentee-assign";
import { orpc } from "@/utils/orpc";

export default function BatchMenteesPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const { data: batch } = useQuery(orpc.programs.admin.batches.get.queryOptions({ input: { id: batchId } }));

  return (
    <div className="space-y-6 p-4">
      <BatchPageHeader programId={params.id as string} batchId={batchId} batch={batch} subtitle="Mentees" />
      {batch && (
        <MentorMenteeAssignDialog
          batch={{ id: batchId, name: batch.name }}
          programId={params.id as string}
          open={true}
          onOpenChange={() => {}}
          embedded
        />
      )}
    </div>
  );
}
