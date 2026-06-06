"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type MenteeInfo = {
  id: string;
  student: { id: string; name: string | null; email: string | null };
  batchId: string;
  batchName: string;
  durationWeeks?: number;
};

type ReportItem = {
  title: string;
  description: string;
  order: number;
};

export function SummaryReportDialog({
  mentee,
  open,
  onOpenChange,
}: {
  mentee: MenteeInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch report template for this batch
  const { data: templateItems, isLoading: isLoadingTemplate } = useQuery({
    ...orpc.programs.admin.batchReportTemplate.list.queryOptions({
      input: { batchId: mentee?.batchId ?? "" },
    }),
    enabled: !!mentee?.batchId && open,
  });

  // Load existing report
  const { data: existingReports, refetch: refetchReports } = useQuery({
    ...orpc.programs.mentorSummaryReports.list.queryOptions({
      input: { batchId: mentee?.batchId ?? "" },
    }),
    enabled: !!mentee?.batchId && open,
  });

  // Check attendance status
  const { data: attendanceData } = useQuery({
    ...orpc.programs.admin.batches.attendance.list.queryOptions({
      input: { batchId: mentee?.batchId ?? "" },
    }),
    enabled: !!mentee?.batchId && open,
  });

  // Initialize items from template or existing report
  useEffect(() => {
    if (!open) return;

    if (existingReports?.data) {
      const report = existingReports.data.find((r: any) => r.student.id === mentee?.student.id);
      if (report?.items && report.items.length > 0) {
        // Load existing report data
        setItems(
          report.items.map((i: any) => ({
            title: i.title,
            description: i.description || "",
            order: i.order || 0,
          })),
        );
        setSubmitError(null);
        return;
      }
    }

    if (templateItems && templateItems.length > 0) {
      // Initialize from template
      setItems(
        templateItems.map((t: any) => ({
          title: t.title,
          description: "",
          order: t.order,
        })),
      );
    }
    setSubmitError(null);
  }, [open, existingReports, templateItems, mentee?.student.id]);

  // Calculate attendance for this mentee
  const menteeAttendance =
    attendanceData?.attendance?.filter(
      (a: any) => a.userId === mentee?.student.id && (a.status === "present" || a.status === "excused"),
    ) ?? [];
  const totalWeeks = mentee?.durationWeeks || 0;
  const menteePresentWeeks = menteeAttendance.length;
  const attendanceComplete = totalWeeks > 0 && menteePresentWeeks >= totalWeeks;

  const createMutation = useMutation({
    ...orpc.programs.mentorSummaryReports.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Report saved as draft!");
      queryClient.invalidateQueries({ queryKey: ["summaryReport"] });
      refetchReports();
    },
    onError: (error) => toast.error(error.message || "Failed to save report"),
  });

  const submitMutation = useMutation({
    ...orpc.programs.mentorSummaryReports.submit.mutationOptions(),
    onSuccess: () => {
      toast.success("Report submitted for review!");
      queryClient.invalidateQueries({ queryKey: ["summaryReport"] });
      onOpenChange(false);
    },
    onError: (error) => {
      setSubmitError(error.message || "Failed to submit report");
      toast.error(error.message || "Failed to submit report");
    },
  });

  const handleDescriptionChange = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], description: value };
      return next;
    });
  };

  const validate = (): string | null => {
    if (items.length === 0) return "No report items configured. Please contact admin.";
    const emptyItems = items.filter((i) => !i.description.trim());
    if (emptyItems.length > 0) return "Please fill in descriptions for all items";
    return null;
  };

  const handleSave = () => {
    if (!mentee) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    createMutation.mutate({
      batchId: mentee.batchId,
      studentId: mentee.student.id,
      items: items.map((i) => ({ title: i.title, description: i.description })),
    });
  };

  const handleSubmit = async () => {
    if (!mentee) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (!attendanceComplete) {
      setSubmitError(
        `Attendance incomplete: ${menteePresentWeeks}/${totalWeeks} weeks completed. All ${totalWeeks} sessions must be attended.`,
      );
      toast.error("Cannot submit: attendance not complete");
      return;
    }
    setSubmitError(null);
    const result = await createMutation.mutateAsync({
      batchId: mentee.batchId,
      studentId: mentee.student.id,
      items: items.map((i) => ({ title: i.title, description: i.description })),
    });
    submitMutation.mutate({ id: result.id });
  };

  const isPending = createMutation.isPending || submitMutation.isPending;
  const isLoading = isLoadingTemplate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-2 max-w-full sm:mx-auto sm:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-bricolage text-brand-navy text-lg sm:text-xl">Summary Report</DialogTitle>
          <DialogDescription className="font-manrope text-xs sm:text-sm">
            <span className="font-medium text-text-main">{mentee?.student.name || "Mentee"}</span>
            <span className="mx-1.5 text-text-muted-custom/40">·</span>
            {mentee?.batchName}
            <span className="mx-1.5 text-text-muted-custom/40">·</span>
            {items.length} assessment items
          </DialogDescription>
        </DialogHeader>

        {/* Attendance Status */}
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl px-3.5 py-3 font-manrope text-xs leading-relaxed sm:items-center sm:text-sm",
            attendanceComplete ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
          )}
        >
          {attendanceComplete ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
          )}
          <span>
            {attendanceComplete
              ? `Attendance complete: ${menteePresentWeeks}/${totalWeeks} weeks`
              : `Attendance: ${menteePresentWeeks}/${totalWeeks} weeks — complete all ${totalWeeks} sessions to submit`}
          </span>
        </div>

        {/* Error */}
        {submitError && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3.5 py-3 font-manrope text-red-600 text-xs sm:text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Items — Titles from template, mentor only fills descriptions */}
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="font-manrope text-sm text-text-muted-custom">
              No report template configured for this batch. Please contact admin.
            </p>
          </div>
        ) : (
          <div className="-mx-2 max-h-[55vh] space-y-3 overflow-y-auto px-2 sm:mx-0 sm:space-y-4 sm:px-0">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs sm:p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy font-bold text-[9px] text-white">
                      {i + 1}
                    </span>
                    <span className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider">
                      {item.title || `Item ${i + 1}`}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="font-manrope font-medium text-text-muted-custom text-xs">Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(i, e.target.value)}
                    placeholder="Fill in the assessment description..."
                    className="mt-1 rounded-xl border-gray-200 bg-gray-50 font-manrope text-sm transition-colors focus:bg-white"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl border-gray-200 font-manrope text-sm sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || items.length === 0}
            variant="secondary"
            className="w-full rounded-xl font-manrope text-sm sm:w-auto"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !attendanceComplete || items.length === 0}
            className="w-full rounded-xl bg-mentor-teal font-manrope text-sm text-white shadow-xs hover:bg-mentor-teal-dark disabled:opacity-50 sm:w-auto"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit for Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
