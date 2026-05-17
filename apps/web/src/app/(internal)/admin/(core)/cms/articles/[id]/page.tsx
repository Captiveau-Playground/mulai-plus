"use client";

import { ArticleEditor } from "@/components/admin/cms/article-editor";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

interface EditArticlePageProps {
  params: Promise<{ id: string }>;
}

export default function EditArticlePage({ params }: EditArticlePageProps) {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <EditArticleContent params={params} />
      </div>
    </PageState>
  );
}

async function EditArticleContent({ params }: EditArticlePageProps) {
  const { id } = await params;

  return <ArticleEditor articleId={id} />;
}
