"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MentorDetail } from "@/components/admin/programs/mentor-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ProgramManagerMentorDetailPage() {
  const params = useParams();
  const mentorId = params.mentorId as string;

  const { isAuthorized, isLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="mb-6">
          <Link
            href="/program-manager/programs/mentors"
            className="mb-4 inline-flex items-center gap-2 font-manrope text-sm text-text-muted-custom transition-colors hover:text-text-main"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Mentors
          </Link>
        </div>
        <MentorDetail mentorId={mentorId} />
      </div>
    </PageState>
  );
}
