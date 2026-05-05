"use client";

import { MentorList } from "@/components/admin/programs/mentor-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminMentorsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="space-y-6">
          <div>
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Mentors</h2>
            <p className="font-manrope text-text-muted-custom">View all mentors and their mentoring statistics.</p>
          </div>
          <MentorList />
        </div>
      </div>
    </PageState>
  );
}
