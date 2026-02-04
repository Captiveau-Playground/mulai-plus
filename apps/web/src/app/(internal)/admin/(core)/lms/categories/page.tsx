"use client";

import { CategoryList } from "@/components/admin/lms/category-list";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminCategoriesPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
      <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
        <CategoryList />
      </PageState>
    </div>
  );
}
