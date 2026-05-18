"use client";

import { useSearchParams } from "next/navigation";
import { ArticleEditor } from "@/components/admin/cms/article-editor";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function NewArticlePage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") === "news" ? "news" : "article";

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <ArticleEditor defaultType={defaultType} />
      </div>
    </PageState>
  );
}
