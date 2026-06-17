"use client";

import { BatchDetailContent } from "@/app/(internal)/admin/(core)/programs/[id]/batches/[batchId]/page";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function PMBatchDetailPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg flex-1 rounded-xl bg-bg-light p-4">
        <BatchDetailContent />
      </div>
    </PageState>
  );
}
