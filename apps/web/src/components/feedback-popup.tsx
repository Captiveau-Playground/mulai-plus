"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { orpc } from "@/utils/orpc";

interface ActiveFeedback {
  id: string;
  type: string;
  templateName: string;
  batchName: string;
  questions: { id: string; question: string; order: number; questionType?: string; likertOptions?: string[] | null }[];
}

export function useFeedbackPopups() {
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data: activeFeedbacks, refetch } = useQuery({
    ...orpc.feedback.response.myActive.queryOptions({ input: {} }),
    refetchInterval: 60_000, // Check every minute
  });

  // Auto-show first active feedback
  const toShow = useMemo(() => {
    if (!activeFeedbacks || activeFeedbacks.length === 0) return null;
    return activeFeedbacks.find((f: any) => !dismissedIds.has(f.id)) || null;
  }, [activeFeedbacks, dismissedIds]);

  useEffect(() => {
    if (toShow && !openCampaignId) {
      setOpenCampaignId(toShow.id);
    }
  }, [toShow, openCampaignId]);

  const handleDismiss = (campaignId: string) => {
    setDismissedIds((prev) => new Set(prev).add(campaignId));
    setOpenCampaignId(null);
  };

  const handleComplete = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    setOpenCampaignId(null);
    refetch();
  };

  return {
    openCampaignId,
    activeFeedback: activeFeedbacks?.find((f: any) => f.id === openCampaignId) || null,
    setOpenCampaignId,
    handleDismiss,
    handleComplete,
  };
}

export function FeedbackPopup({
  feedback,
  open,
  onOpenChange,
  onComplete,
}: {
  feedback: ActiveFeedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (campaignId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Reset answers when feedback changes
  useEffect(() => {
    if (feedback) {
      const initial: Record<string, string> = {};
      feedback.questions.forEach((q) => {
        initial[q.id] = "";
      });
      setAnswers(initial);
    }
  }, [feedback?.id, feedback.questions.forEach, feedback]);

  const submitMutation = useMutation({
    ...orpc.feedback.response.submit.mutationOptions(),
    onSuccess: () => {
      toast.success("Feedback submitted! Thank you.");
      queryClient.invalidateQueries({ queryKey: orpc.feedback.response.myActive.key() });
      if (feedback) onComplete(feedback.id);
    },
    onError: (err) => toast.error(err.message || "Failed to submit feedback"),
  });

  const handleSubmit = () => {
    if (!feedback) return;

    const allAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    if (allAnswers.some((a) => !a.answer.trim())) {
      toast.error("Please answer all questions");
      return;
    }

    submitMutation.mutate({
      campaignId: feedback.id,
      answers: allAnswers,
    });
  };

  if (!feedback) return null;

  const typeLabels: Record<string, string> = {
    mentee_to_mentor: "Feedback untuk Mentor",
    mentee_to_platform: "Feedback untuk MulaiPlus",
    mentor_to_platform: "Feedback untuk MulaiPlus",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mentor-teal/10">
              <MessageSquare className="h-5 w-5 text-mentor-teal" />
            </div>
            <div>
              <DialogTitle className="font-bricolage text-brand-navy text-lg">
                {typeLabels[feedback.type] || feedback.templateName}
              </DialogTitle>
              <DialogDescription className="font-manrope text-xs">{feedback.batchName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-manrope text-sm text-text-muted-custom">
            We'd love to hear your feedback! Please answer the following questions.
          </p>
          {feedback.questions.map((q, i) => (
            <div key={q.id}>
              <Label className="font-manrope font-medium text-sm text-text-main">
                {i + 1}. {q.question}
              </Label>
              <div className="mt-1.5">
                {q.questionType === "likert" && q.likertOptions ? (
                  <div className="space-y-1.5">
                    {q.likertOptions.map((opt: string, oi: number) => (
                      <label
                        key={oi}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                          answers[q.id] === String(oi + 1)
                            ? "border-mentor-teal bg-mentor-teal/5"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={String(oi + 1)}
                          checked={answers[q.id] === String(oi + 1)}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          className="h-4 w-4 text-mentor-teal"
                        />
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mentor-teal/10 font-bold font-manrope text-mentor-teal text-xs">
                            {oi + 1}
                          </span>
                          <span className="font-manrope text-sm text-text-main">{opt}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Your answer..."
                    className="rounded-xl border-gray-200 font-manrope text-sm"
                    rows={3}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-gray-200 font-manrope text-sm"
          >
            <X className="mr-1.5 h-4 w-4" />
            Later
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="rounded-xl bg-mentor-teal font-manrope text-sm text-white hover:bg-mentor-teal-dark"
          >
            {submitMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
