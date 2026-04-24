"use client";

import { ProgramList } from "@/components/admin/programs/program-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ProgramManagerProgramsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <ProgramList />
      </div>
    </PageState>
  );
}
