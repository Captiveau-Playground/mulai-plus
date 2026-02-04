"use client";

import { useParams } from "next/navigation";
import { ProgramDetail } from "@/components/admin/programs/program-detail";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminProgramDetailPage() {
  const params = useParams();
  const programId = params.id as string;

  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="flex-1 rounded-xl bg-muted/50 p-4">
        <ProgramDetail programId={programId} />
      </div>
    </PageState>
  );
}
