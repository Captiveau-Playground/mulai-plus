"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BookOpen, Calendar, FileText, GraduationCap, Mail, User, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { SummaryReportDialog } from "@/components/mentor/summary-report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function MentorMyMenteesPage() {
  const { isAuthorized, isLoading: authLoading } = useAuthorizePage({ mentor_dashboard: ["access"] });

  // Fetch my mentees
  const { data, isLoading } = useQuery({
    ...orpc.programs.myMentees.queryOptions({ input: {} }),
  });

  const mentees = data?.data ?? [];

  // Group by batch
  const groupedByBatch = mentees.reduce(
    (acc, m) => {
      const batchName = m.batchName || "Unknown Batch";
      if (!acc[batchName]) acc[batchName] = [];
      acc[batchName].push(m);
      return acc;
    },
    {} as Record<string, typeof mentees>,
  );

  // Statistics
  const totalMentees = mentees.length;
  const totalBatches = Object.keys(groupedByBatch).length;

  const [reportMentee, setReportMentee] = useState<{
    id: string;
    student: { id: string; name: string | null; email: string | null };
    batchId: string;
    batchName: string;
    durationWeeks?: number;
  } | null>(null);

  return (
    <PageState isLoading={authLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mentor-section-header">My Mentees</h1>
            <p className="mentor-section-subheader">Students assigned to you for mentoring.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="mentor-card">
            <CardContent className="flex items-center gap-4 bg-white p-5">
              <div className="icon-box-mentor shrink-0">
                <Users className="h-5 w-5 text-white md:h-6 md:w-6" />
              </div>
              <div>
                <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Total Mentees</p>
                <p className="font-bold font-bricolage text-3xl text-text-main">{totalMentees}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="mentor-card">
            <CardContent className="flex items-center gap-4 bg-white p-5">
              <div className="icon-box-mentor shrink-0">
                <BookOpen className="h-5 w-5 text-white md:h-6 md:w-6" />
              </div>
              <div>
                <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Active Batches</p>
                <p className="font-bold font-bricolage text-3xl text-text-main">{totalBatches}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="mentor-card">
            <CardContent className="flex items-center gap-4 bg-white p-5">
              <div className="icon-box-mentor shrink-0">
                <GraduationCap className="h-5 w-5 text-white md:h-6 md:w-6" />
              </div>
              <div>
                <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Active Mentees</p>
                <p className="font-bold font-bricolage text-3xl text-text-main">
                  {mentees.filter((m) => m.application?.status === "accepted").length || totalMentees}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="mentor-card overflow-hidden">
                <CardContent className="bg-white p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mentees.length === 0 ? (
          <Card className="mentor-card">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Users className="mb-4 h-12 w-12 text-text-muted-custom/40" />
              <h3 className="font-bold font-bricolage text-text-main text-xl">No Mentees Assigned</h3>
              <p className="mt-2 max-w-md font-manrope text-text-muted-custom">
                You haven&apos;t been assigned any mentees yet. The program manager will assign students to you for each
                batch.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByBatch).map(([batchName, batchMentees]) => (
              <section key={batchName}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mentor-teal/10">
                    <BookOpen className="h-3.5 w-3.5 text-mentor-teal" />
                  </div>
                  <h2 className="font-bold font-bricolage text-lg text-text-main">{batchName}</h2>
                  <Badge variant="secondary" className="font-manrope text-xs">
                    {batchMentees.length} mentees
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {batchMentees.map((mentee) => (
                    <Card key={mentee.id} className="mentor-card group overflow-hidden transition-all hover:shadow-lg">
                      <CardContent className="bg-white p-5">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-navy/10 to-mentor-teal/10">
                            {mentee.student.image ? (
                              <Image
                                src={mentee.student.image}
                                alt={mentee.student.name || ""}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <User className="h-5 w-5 text-brand-navy/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-bold font-bricolage text-base text-text-main">
                              {mentee.student.name || "Unknown"}
                            </h3>
                            <p className="truncate font-manrope text-text-muted-custom text-xs">
                              {mentee.student.email}
                            </p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-4 space-y-2 border-gray-100 border-t pt-3">
                          <div className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-mentor-teal" />
                            <span>
                              Assigned{" "}
                              {mentee.assignedAt
                                ? format(new Date(mentee.assignedAt), "dd MMM yyyy", { locale: id })
                                : "-"}
                            </span>
                          </div>

                          {mentee.student.email && (
                            <div className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-mentor-teal" />
                              <a
                                href={`mailto:${mentee.student.email}`}
                                className="truncate transition-colors hover:text-mentor-teal"
                              >
                                {mentee.student.email}
                              </a>
                            </div>
                          )}

                          <div className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
                            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-mentor-teal" />
                            <span>Registered via program</span>
                          </div>
                        </div>

                        {/* Registration Answers — collapsible */}
                        {(() => {
                          const raw = (mentee as any).registrationAnswers;
                          if (!raw) return null;
                          const answers = typeof raw === "string" ? JSON.parse(raw) : raw;
                          if (!answers || typeof answers !== "object") return null;
                          const entries = Object.entries(answers as Record<string, unknown>);
                          if (entries.length === 0) return null;
                          return (
                            <details className="group mt-3">
                              <summary className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-navy/[0.03] px-3 py-2 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-brand-navy/[0.06] [&::-webkit-details-marker]:hidden">
                                <svg
                                  className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="font-semibold">Registration Info</span>
                                <span className="ml-auto text-[10px] opacity-60">{entries.length} fields</span>
                              </summary>
                              <div className="mt-2 space-y-2 px-1">
                                {entries.map(([key, val]) => (
                                  <div key={key} className="flex flex-col gap-0.5">
                                    <span className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase">
                                      {key.replace(/_/g, " ")}
                                    </span>
                                    <span className="font-manrope text-text-main text-xs leading-relaxed">
                                      {typeof val === "string" ? val : JSON.stringify(val)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          );
                        })()}

                        {/* Quick Actions */}
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-lg border-gray-200 font-manrope text-text-muted-custom text-xs hover:text-text-main"
                            onClick={() => window.open(`mailto:${mentee.student.email}`, "_blank")}
                          >
                            <Mail className="mr-1.5 h-3.5 w-3.5" />
                            Contact
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 rounded-lg bg-gradient-to-r from-brand-navy to-mentor-teal font-manrope text-white text-xs shadow-sm transition-all hover:shadow-md hover:brightness-110"
                            onClick={() =>
                              setReportMentee({
                                id: mentee.id,
                                student: mentee.student,
                                batchId: mentee.batchId,
                                batchName: mentee.batchName,
                                durationWeeks: (mentee as any).durationWeeks || 0,
                              })
                            }
                          >
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            <span className="font-semibold">Summary Report</span>
                            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px]">
                              +
                            </span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {reportMentee && (
        <SummaryReportDialog
          mentee={reportMentee}
          open={!!reportMentee}
          onOpenChange={(open) => !open && setReportMentee(null)}
        />
      )}
    </PageState>
  );
}
