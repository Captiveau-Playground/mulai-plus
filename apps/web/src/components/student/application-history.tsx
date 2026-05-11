"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, ChevronRight, Clock, GraduationCap, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const STATUS_CONFIG = {
  applied: {
    icon: Clock,
    label: "In Progress",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
    iconColor: "text-blue-500",
  },
  accepted: {
    icon: CheckCircle2,
    label: "Accepted",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    dotClass: "bg-green-500",
    iconColor: "text-green-600",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    dotClass: "bg-red-500",
    iconColor: "text-red-600",
  },
  waitlisted: {
    icon: AlertCircle,
    label: "Waitlisted",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    dotClass: "bg-orange-500",
    iconColor: "text-orange-600",
  },
} as const;

type ApplicationStatus = keyof typeof STATUS_CONFIG;

interface Application {
  id: string;
  status: ApplicationStatus;
  createdAt: string | Date;
  program: { id: string; name: string; slug: string } | null;
  batch: { id: string; name: string } | null;
}

interface ApplicationHistoryProps {
  /** Optional class name override */
  className?: string;
  /** Max items to show (0 = all) */
  limit?: number;
  /** Show compact variant (for dashboard sidebar) */
  compact?: boolean;
}

export function ApplicationHistory({ className, limit = 0, compact = false }: ApplicationHistoryProps) {
  const { data: applications, isLoading } = useQuery(orpc.programs.student.myApplications.queryOptions());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted-custom" />
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return null;
  }

  const items = limit > 0 ? applications.slice(0, limit) : applications;

  if (compact) {
    return (
      <Card className={cn("student-card", className)}>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bricolage font-semibold text-base text-text-main">Applications</h3>
            <Link
              href="/dashboard/student/programs"
              className="font-manrope font-medium text-brand-navy text-xs hover:underline"
            >
              See All ({applications.length})
            </Link>
          </div>
          <div className="space-y-2">
            {items.slice(0, 5).map((app) => {
              const config = STATUS_CONFIG[app.status as ApplicationStatus] || STATUS_CONFIG.applied;
              const Icon = config.icon;
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-gray-200 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        config.badgeClass.split(" ")[0],
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.iconColor)} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-manrope font-medium text-sm text-text-main">
                        {app.program?.name || "Unknown Program"}
                      </p>
                      <p className="truncate font-manrope text-text-muted-custom text-xs">
                        {app.batch?.name || ""} • {format(new Date(app.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-2 shrink-0 rounded-full border px-2.5 py-0.5 font-manrope font-semibold text-[10px] uppercase tracking-wider",
                      config.badgeClass,
                    )}
                  >
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full timeline view
  return (
    <Card className={cn("student-card overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="mb-6">
          <h3 className="font-bold font-bricolage text-lg text-text-main sm:text-xl">Application History</h3>
          <p className="font-manrope text-sm text-text-muted-custom">
            Track your applications across all programs and batches.
          </p>
        </div>

        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-gray-200" />

          {items.map((app, index) => {
            const config = STATUS_CONFIG[app.status as ApplicationStatus] || STATUS_CONFIG.applied;
            const Icon = config.icon;
            const _isLast = index === items.length - 1;

            return (
              <div key={app.id} className="relative flex gap-5 pb-8 last:pb-0">
                {/* Timeline dot */}
                <div className="relative z-10 flex shrink-0">
                  <div
                    className={cn(
                      "flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-white shadow-sm",
                      config.badgeClass.split(" ")[0],
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", config.iconColor)} />
                  </div>
                </div>

                {/* Content card */}
                <div className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" />
                        <div>
                          <p className="font-bricolage font-semibold text-sm text-text-main sm:text-base">
                            {app.program?.name || "Unknown Program"}
                          </p>
                          <p className="font-manrope text-text-muted-custom text-xs">{app.batch?.name || "—"}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 font-manrope text-text-muted-custom text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Applied {format(new Date(app.createdAt), "MMM d, yyyy • HH:mm")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full border px-3 py-1 font-manrope font-semibold text-[11px] uppercase tracking-wider",
                          config.badgeClass,
                        )}
                      >
                        {config.label}
                      </Badge>
                      {app.program?.slug && (
                        <Link href={`/programs/${app.program.slug}`}>
                          <ChevronRight className="h-4 w-4 text-text-muted-custom transition-colors hover:text-brand-navy" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
