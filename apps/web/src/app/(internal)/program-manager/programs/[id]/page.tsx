"use client";

import { useParams } from "next/navigation";
import { ProgramDetail } from "@/components/admin/programs/program-detail";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ProgramManagerProgramDetailPage() {
  const params = useParams();
  const programId = params.id as string;

  const { isAuthorized, isLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="flex-1 rounded-xl bg-muted/50 p-4">
        <ProgramDetail programId={programId} />
      </div>
    </PageState>
  );
}
