"use client";

import { MentorList } from "@/components/admin/programs/mentor-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ProgramManagerMentorsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-2xl tracking-tight">Mentors</h2>
            <p className="text-muted-foreground">View all mentors and their mentoring statistics.</p>
          </div>
          <MentorList />
        </div>
      </div>
    </PageState>
  );
}
