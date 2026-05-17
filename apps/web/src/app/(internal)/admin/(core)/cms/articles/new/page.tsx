"use client";

import { ArticleEditor } from "@/components/admin/cms/article-editor";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

interface NewArticlePageProps {
  searchParams: Promise<{ type?: string }>;
}

export default function NewArticlePage({ searchParams }: NewArticlePageProps) {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <NewArticleContent searchParams={searchParams} />
      </div>
    </PageState>
  );
}

async function NewArticleContent({ searchParams }: NewArticlePageProps) {
  const params = await searchParams;
  const defaultType = params.type === "news" ? "news" : "article";

  return <ArticleEditor defaultType={defaultType} />;
}
