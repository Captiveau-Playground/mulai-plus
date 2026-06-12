"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, MessageSquare, Star, User } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

interface FeedbackItem {
  id: string;
  answer: string;
  createdAt: string;
  question: { id: string; question: string; questionType: string; likertOptions?: string[] | null };
  fromUser: { id: string; name: string; email: string; image?: string | null };
  campaign: {
    template: { name: string; type: string };
    batch: { id: string; name: string };
  };
}

function FeedbackCard({ feedback, onClick }: { feedback: FeedbackItem; onClick: () => void }) {
  const isLikert = feedback.question.questionType === "likert";
  const likertValue = isLikert ? Number.parseInt(feedback.answer, 10) : null;
  const likertLabels = feedback.question.likertOptions || [];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-xl border border-gray-200/80 bg-white p-4 text-left shadow-sm transition-all hover:border-mentor-teal/30 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mentor-teal/10 ring-2 ring-white">
          {feedback.fromUser.image ? (
            <Image src={feedback.fromUser.image} alt="" fill className="object-cover" sizes="40px" />
          ) : (
            <User className="h-5 w-5 text-mentor-teal/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-bold font-bricolage text-sm text-text-main">{feedback.fromUser.name}</p>
            <span className="shrink-0 font-manrope text-[10px] text-text-muted-custom">
              {format(new Date(feedback.createdAt), "dd MMM yyyy", { locale: id })}
            </span>
          </div>
          <p className="mt-0.5 truncate font-manrope text-text-muted-custom text-xs">
            {feedback.campaign.batch.name} · {feedback.campaign.template.name}
          </p>
          <p className="mt-2 line-clamp-2 font-manrope text-sm text-text-main leading-relaxed">
            <span className="font-medium text-mentor-teal">{feedback.question.question}</span>
          </p>
          <div className="mt-1.5">
            {isLikert && likertValue ? (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < likertValue ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200",
                    )}
                  />
                ))}
                <span className="ml-1.5 font-manrope font-medium text-amber-600 text-xs">
                  {likertValue} — {likertLabels[likertValue - 1] || ""}
                </span>
              </div>
            ) : (
              <p className="line-clamp-2 font-manrope text-text-muted-custom text-xs leading-relaxed">
                {feedback.answer}
              </p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
}: {
  feedback: FeedbackItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!feedback) return null;

  const isLikert = feedback.question.questionType === "likert";
  const likertValue = isLikert ? Number.parseInt(feedback.answer, 10) : null;
  const likertLabels = feedback.question.likertOptions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mentor-teal/10">
              {feedback.fromUser.image ? (
                <Image src={feedback.fromUser.image} alt="" fill className="object-cover" sizes="48px" />
              ) : (
                <User className="h-6 w-6 text-mentor-teal/60" />
              )}
            </div>
            <div>
              <DialogTitle className="font-bricolage text-brand-navy text-lg">{feedback.fromUser.name}</DialogTitle>
              <DialogDescription className="font-manrope text-xs">
                {feedback.campaign.batch.name} · {feedback.campaign.template.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-manrope font-semibold text-sm text-text-main">{feedback.question.question}</p>
            {isLikert && likertValue ? (
              <div className="mt-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-5 w-5",
                        i < likertValue ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 font-manrope text-amber-600 text-sm">
                  {likertValue}/5 — {likertLabels[likertValue - 1] || ""}
                </p>
              </div>
            ) : (
              <div className="mt-2 rounded-xl bg-gray-50 p-4">
                <p className="font-manrope text-sm text-text-main leading-relaxed">{feedback.answer}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MentorFeedbackPage() {
  const { isAuthorized, isLoading: authLoading } = useAuthorizePage({ mentor_dashboard: ["access"] });
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

  const { data: feedbacks, isLoading } = useQuery({
    ...orpc.feedback.response.myReceived.queryOptions({ input: {} }),
    enabled: isAuthorized === true,
  });

  if (authLoading) {
    return (
      <PageState>
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      </PageState>
    );
  }

  if (!isAuthorized) {
    return <PageState isAuthorized={false} />;
  }

  return (
    <PageState>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">
            Feedback dari Mentee
          </h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Lihat feedback yang diberikan oleh mentee kamu.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !feedbacks || feedbacks.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mentor-teal/10">
              <MessageSquare className="h-8 w-8 text-mentor-teal/50" />
            </div>
            <h3 className="font-bold font-bricolage text-lg text-text-main">Belum Ada Feedback</h3>
            <p className="mt-1 font-manrope text-sm text-text-muted-custom">
              Mentee kamu belum memberikan feedback. Feedback akan muncul di sini setelah mentee mengisi.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {feedbacks.map((fb: FeedbackItem) => (
              <FeedbackCard key={fb.id} feedback={fb} onClick={() => setSelectedFeedback(fb)} />
            ))}
          </div>
        )}
      </div>

      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={!!selectedFeedback}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedback(null);
        }}
      />
    </PageState>
  );
}
