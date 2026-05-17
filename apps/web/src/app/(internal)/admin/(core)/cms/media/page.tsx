"use client";

import { MediaLibrary } from "@/components/admin/cms/media-library";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function MediaPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <MediaLibrary />
      </div>
    </PageState>
  );
}
