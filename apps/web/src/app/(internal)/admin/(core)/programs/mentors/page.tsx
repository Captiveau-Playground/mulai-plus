"use client";

import { MentorDataTable } from "@/components/admin/programs/mentor-data-table";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminProgramsMentorsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({ admin_dashboard: ["access"] });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="space-y-6">
          <div>
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Data Mentor</h2>
            <p className="font-manrope text-text-muted-custom">
              Data detail mentor (kampus, jurusan, pekerjaan, pencapaian, media sosial). Tampil di landing page setelah
              mentor menyetujui.
            </p>
          </div>
          <MentorDataTable basePath="/admin/programs/mentors" />
        </div>
      </div>
    </PageState>
  );
}
