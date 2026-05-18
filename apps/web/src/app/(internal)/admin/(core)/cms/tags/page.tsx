"use client";

import { TagList } from "@/components/admin/cms/tag-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function TagsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <TagList />
      </div>
    </PageState>
  );
}
