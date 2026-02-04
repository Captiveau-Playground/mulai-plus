"use client";

import { useParams } from "next/navigation";
import { CourseContent } from "@/components/admin/lms/course-content";
import { CourseSettings } from "@/components/admin/lms/course-settings";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminCourseContentPage() {
  const params = useParams();
  const courseId = params.id as string;

  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-muted/50 p-4">
          <CourseSettings courseId={courseId} />
        </div>
        <div className="rounded-xl bg-muted/50 p-4">
          <CourseContent courseId={courseId} />
        </div>
      </div>
    </PageState>
  );
}
