"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ChevronRight, FileText, Loader2, MessageSquare, ThumbsUp, User, XCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const statusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  draft: { label: "Draft", bg: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-400" },
  submitted: { label: "Pending Review", bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  approved: { label: "Approved", bg: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  revision: { label: "Needs Revision", bg: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-manrope font-medium text-[11px]",
        cfg.bg,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function ReviewPreview({ report }: { report: any }) {
  if (!report) return null;
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-navy/[0.04] via-brand-navy/[0.02] to-mentor-teal/[0.04] p-5">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 ring-white">
          {report.student?.image ? (
            <Image src={report.student.image} alt="" fill className="object-cover" sizes="56px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-navy/10 to-mentor-teal/10">
              <User className="h-6 w-6 text-brand-navy/40" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-bold font-bricolage text-lg text-text-main">
              {report.student?.name || "Unknown"}
            </h3>
            <StatusBadge status={report.status} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-manrope text-text-muted-custom text-xs">
              Mentor: <span className="font-medium text-text-main">{report.mentor?.name}</span>
            </span>
            <span className="hidden text-text-muted-custom/40 sm:inline">·</span>
            <span className="font-manrope text-text-muted-custom text-xs">{report.batch?.name}</span>
            <span className="hidden text-text-muted-custom/40 sm:inline">·</span>
            <span className="font-manrope text-text-muted-custom text-xs">{report.items?.length || 0} items</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <h4 className="font-bold font-bricolage text-sm text-text-main">Assessment Results</h4>
        <div className="grid gap-3">
          {report.items?.map((item: any, i: number) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs transition-all hover:border-gray-200 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-[10px] text-white shadow-xs">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold font-bricolage text-sm text-text-main">{item.title}</p>
                  <p className="mt-0.5 font-manrope text-text-muted-custom text-xs leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="grid gap-3 sm:grid-cols-2">
        {report.mentorNotes && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
            <p className="font-manrope font-semibold text-[10px] text-text-muted-custom uppercase tracking-wider">
              Mentor Notes
            </p>
            <p className="mt-1 font-manrope text-text-main text-xs leading-relaxed">{report.mentorNotes}</p>
          </div>
        )}
        {report.reviewNotes && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
            <p className="font-manrope font-semibold text-[10px] text-amber-700 uppercase tracking-wider">
              Review Notes
            </p>
            <p className="mt-1 font-manrope text-amber-800 text-xs leading-relaxed">{report.reviewNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportRow({ report, onReview }: { report: Report; onReview: () => void }) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs ring-2 ring-white">
        {report.student?.image ? (
          <Image src={report.student.image} alt="" fill className="object-cover" sizes="44px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-navy/[0.06] to-mentor-teal/[0.06]">
            <User className="h-5 w-5 text-brand-navy/30" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-bold font-bricolage text-sm text-text-main">
            {report.student?.name || "Unknown"}
          </p>
          <StatusBadge status={report.status} />
        </div>
        <p className="mt-0.5 truncate font-manrope text-text-muted-custom text-xs">Mentor: {report.mentor?.name}</p>
      </div>
      {report.status === "submitted" && (
        <Button
          size="sm"
          onClick={onReview}
          className="shrink-0 rounded-lg bg-brand-navy font-manrope text-white text-xs shadow-xs transition-all hover:bg-brand-navy/90 hover:shadow-sm"
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Review
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function SummaryReportsReview({
  batch,
  open,
  onOpenChange,
}: {
  batch: { id: string; name: string; programId: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data, isLoading } = useQuery({
    ...orpc.programs.admin.summaryReports.list.queryOptions({
      input: { batchId: batch?.id ?? "" },
    }),
    enabled: !!batch?.id && open,
  });

  const reports = data?.data ?? [];
  const pending = reports.filter((r) => r.status === "submitted");
  const reviewing = reports.find((r) => r.id === reviewingId);

  const reviewMutation = useMutation({
    ...orpc.programs.admin.summaryReports.review.mutationOptions(),
    onSuccess: () => {
      toast.success("Review submitted!");
      queryClient.invalidateQueries({ queryKey: ["summaryReport"] });
      setReviewingId(null);
      setReviewNotes("");
    },
    onError: (error) => toast.error(error.message || "Failed to submit review"),
  });

  return (
    <>
      {/* List Dialog */}
      <Dialog open={open && !reviewingId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy text-xl">Summary Reports</DialogTitle>
            <DialogDescription className="font-manrope">
              {batch?.name} · {pending.length} pending, {reports.length} total
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
                <MessageSquare className="h-6 w-6 text-gray-300" />
              </div>
              <p className="font-bold font-bricolage text-base text-gray-900">No Reports Yet</p>
              <p className="mt-1 max-w-xs font-manrope text-gray-500 text-sm">
                Mentors haven&apos;t submitted any summary reports for this batch.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="mb-4 bg-gray-100 p-1">
                <TabsTrigger
                  value="pending"
                  className="rounded-lg font-manrope text-xs data-[state=active]:bg-white data-[state=active]:text-brand-navy data-[state=active]:shadow-xs"
                >
                  Pending Review
                  {pending.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-bold font-manrope text-[9px] text-white">
                      {pending.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="rounded-lg font-manrope text-xs data-[state=active]:bg-white data-[state=active]:text-brand-navy data-[state=active]:shadow-xs"
                >
                  All Reports ({reports.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="max-h-96">
                <TabsContent value="pending" className="m-0 space-y-2.5">
                  {pending.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <CheckCircle className="mb-2 h-8 w-8 text-green-400" />
                      <p className="font-manrope text-gray-500 text-sm">All caught up! No pending reviews.</p>
                    </div>
                  ) : (
                    pending.map((report) => (
                      <ReportRow
                        key={report.id}
                        report={report}
                        onReview={() => {
                          setReviewingId(report.id);
                          setReviewNotes("");
                        }}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="all" className="m-0 space-y-2.5">
                  {reports.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      onReview={() => {
                        setReviewingId(report.id);
                        setReviewNotes("");
                      }}
                    />
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={!!reviewingId}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingId(null);
            setReviewNotes("");
          }
        }}
      >
        <DialogContent className="max-w-2xl sm:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-bricolage text-brand-navy text-xl">Review Report</DialogTitle>
                <DialogDescription className="font-manrope">
                  {reviewing?.student?.name} · {reviewing?.batch?.name}
                </DialogDescription>
              </div>
              {reviewing && <StatusBadge status={reviewing.status} />}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <ReviewPreview report={reviewing} />
          </ScrollArea>

          <Separator />

          <div>
            <label
              htmlFor="reviewNotes"
              className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider"
            >
              Review Notes
            </label>
            <Textarea
              id="reviewNotes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add feedback for the mentor (revision) or approval notes..."
              className="mt-1.5 rounded-xl border-gray-200 bg-white font-manrope text-sm placeholder:text-gray-300"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setReviewingId(null)}
              className="rounded-xl border-gray-200 font-manrope text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!reviewingId) return;
                reviewMutation.mutate({ id: reviewingId, action: "revision", notes: reviewNotes });
              }}
              disabled={reviewMutation.isPending}
              className="rounded-xl border-red-200 font-manrope text-red-600 text-sm hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              {reviewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Request Revision
            </Button>
            <Button
              onClick={() => {
                if (!reviewingId) return;
                reviewMutation.mutate({ id: reviewingId, action: "approved", notes: reviewNotes });
              }}
              disabled={reviewMutation.isPending}
              className="rounded-xl bg-green-600 font-manrope text-sm text-white shadow-xs hover:bg-green-700 hover:shadow-sm"
            >
              {reviewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="mr-2 h-4 w-4" />
              )}
              Approve Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
