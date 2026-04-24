"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MentorDetail } from "@/components/admin/programs/mentor-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminMentorDetailPage() {
  const params = useParams();
  const mentorId = params.mentorId as string;

  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <div className="mb-6">
          <Link
            href="/admin/programs/mentors"
            className="mb-4 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
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
