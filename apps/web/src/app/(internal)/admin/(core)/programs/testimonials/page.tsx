"use client";

import { TestimonialList } from "@/components/admin/testimonials/testimonial-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function TestimonialsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <TestimonialList />
      </div>
    </PageState>
  );
}
