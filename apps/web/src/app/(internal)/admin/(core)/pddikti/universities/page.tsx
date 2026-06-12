"use client";

import { Building2 } from "lucide-react";
import { UniversitiesTable } from "@/components/admin/pddikti/universities-table";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function PddiktiUniversitiesPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-brand-navy" />
              <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">
                Higher Education Data
              </h2>
            </div>
            <p className="font-manrope text-sm text-text-muted-custom">
              Manage universities from PDDikti &amp; SNPMB dataset — 408 major institutions
            </p>
          </div>
        </div>
        <UniversitiesTable />
      </div>
    </PageState>
  );
}
