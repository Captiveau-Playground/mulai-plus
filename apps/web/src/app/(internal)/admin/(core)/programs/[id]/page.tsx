"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { ProgramDetail } from "@/components/admin/programs/program-detail";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminProgramDetailPage() {
  const params = useParams();
  const programId = params.id as string;

  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-xl bg-muted/50 p-4">
      <ProgramDetail programId={programId} />
    </div>
  );
}
