"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MentorBatchTabs } from "@/components/mentor/mentor-batch-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchParticipantsPage() {
  const params = useParams();
  const batchId = params.batchId as string;

  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const { data, isLoading } = useQuery({
    ...orpc.programActivities.mentor.getBatchAttendance.queryOptions({
      input: { batchId },
      enabled: !!isAuthorized && !!batchId,
    }),
    staleTime: 1000 * 60 * 5,
  });

  const participants = data?.participants || [];
  const batch = data?.batch;

  return (
    <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/mentor/batches"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0 text-gray-700")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-bold font-bricolage text-2xl text-brand-navy md:text-3xl">
              {batch?.name || "Loading..."}
            </h1>
            <p className="font-manrope text-sm text-text-muted-custom">{batch?.program?.name}</p>
          </div>
        </div>

        <MentorBatchTabs batchId={batchId} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStatCard label="Total" value={participants.length} color="bg-brand-navy" />
          <MiniStatCard label="Active" value={participants.length} color="bg-mentor-teal" />
          <MiniStatCard label="Dropped" value={0} color="bg-brand-orange" />
          <MiniStatCard label="Completed" value={0} color="bg-brand-navy-light" />
        </div>

        {/* Participants Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-text-muted-custom" />
          </div>
        ) : participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-manrope font-medium text-sm text-text-muted-custom">No participants yet</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {participants.map((participant: any) => (
              <Card key={participant.id} className="mentor-card mentor-card-hover">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy to-mentor-teal">
                    <span className="font-bold font-bricolage text-lg text-white">
                      {participant.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-manrope font-medium text-sm text-text-main">
                      {participant.name || "Unknown"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-text-muted-custom" />
                      <span className="truncate font-manrope text-text-muted-custom text-xs">
                        {participant.email || "—"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageState>
  );
}

function MiniStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="border-0 bg-white shadow-md">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12", color)}>
          <span className="font-bold font-bricolage text-white">{value}</span>
        </div>
        <div>
          <p className="font-inter font-medium text-text-muted-custom text-xs sm:text-sm">{label}</p>
          <p className="font-bold font-bricolage text-text-main text-xl sm:text-2xl">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
