"use client";

import { ArticleList } from "@/components/admin/cms/article-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ArticlesPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <ArticleList />
      </div>
    </PageState>
  );
}
