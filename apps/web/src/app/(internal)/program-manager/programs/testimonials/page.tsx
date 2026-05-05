"use client";

import { TestimonialList } from "@/components/admin/testimonials/testimonial-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ProgramManagerTestimonialsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <TestimonialList />
      </div>
    </PageState>
  );
}
