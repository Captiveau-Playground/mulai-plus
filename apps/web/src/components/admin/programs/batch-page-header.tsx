"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { authClient, isAdmin } from "@/lib/auth-client";

interface BatchData {
  name: string;
  status: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  durationWeeks?: number;
  quota?: number;
}

export function BatchPageHeader({
  programId,
  batchId,
  batch,
  subtitle,
  backUrl,
}: {
  programId: string;
  batchId: string;
  batch?: BatchData | null;
  subtitle?: string;
  backUrl?: string;
}) {
  const { data: session } = authClient.useSession();

  return (
    <div className="space-y-4">
      <Link
        href={
          (backUrl ||
            (isAdmin(session)
              ? `/admin/programs/${programId}/batches/${batchId}`
              : `/program-manager/programs/${programId}/batches/${batchId}`)) as any
        }
        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 font-manrope font-medium text-text-main text-xs transition-all hover:bg-mentor-teal/10 hover:text-mentor-teal"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Batch
      </Link>

      {batch && (
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">{batch.name}</h1>
            <Badge variant={batch.status === "open" ? "default" : "secondary"}>{batch.status}</Badge>
          </div>
          <p className="mt-1 font-manrope text-text-muted-custom">
            {batch.startDate && new Date(batch.startDate).toLocaleDateString()} —{" "}
            {batch.endDate && new Date(batch.endDate).toLocaleDateString()}
            {batch.durationWeeks ? (
              <>
                <span className="mx-2">·</span>
                {batch.durationWeeks} weeks
              </>
            ) : (
              ""
            )}
            {batch.quota ? (
              <>
                <span className="mx-2">·</span>Quota: {batch.quota}
              </>
            ) : (
              ""
            )}
            {subtitle ? (
              <>
                <span className="mx-2">·</span>
                <span className="font-medium text-text-main">{subtitle}</span>
              </>
            ) : (
              ""
            )}
          </p>
        </div>
      )}
    </div>
  );
}
