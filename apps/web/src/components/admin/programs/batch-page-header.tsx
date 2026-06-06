"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <div className="space-y-4">
      <Link
        href={(backUrl || `/admin/programs/${programId}/batches/${batchId}`) as any}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-gray-700")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batch
      </Link>

      {batch && (
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold font-bricolage text-2xl text-brand-navy">{batch.name}</h1>
            <Badge variant={batch.status === "open" ? "default" : "secondary"}>{batch.status}</Badge>
          </div>
          <p className="mt-1 font-manrope text-sm text-text-muted-custom">
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
                <span className="text-text-muted-custom">{subtitle}</span>
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
