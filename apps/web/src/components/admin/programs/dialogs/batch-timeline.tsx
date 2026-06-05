"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const timelineEvents = (batch: {
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  verificationStartDate?: Date | string | null;
  verificationEndDate?: Date | string | null;
  assessmentStartDate?: Date | string | null;
  assessmentEndDate?: Date | string | null;
  announcementDate?: Date | string | null;
  onboardingDate?: Date | string | null;
}) => [
  { label: "Registration Opens", date: batch.registrationStartDate, color: "bg-blue-500" },
  { label: "Registration Closes", date: batch.registrationEndDate, color: "bg-blue-500" },
  ...(batch.verificationStartDate
    ? [{ label: "Verification Starts", date: batch.verificationStartDate, color: "bg-purple-500" }]
    : []),
  ...(batch.verificationEndDate
    ? [{ label: "Verification Ends", date: batch.verificationEndDate, color: "bg-purple-500" }]
    : []),
  ...(batch.assessmentStartDate
    ? [{ label: "Assessment Starts", date: batch.assessmentStartDate, color: "bg-amber-500" }]
    : []),
  ...(batch.assessmentEndDate
    ? [{ label: "Assessment Ends", date: batch.assessmentEndDate, color: "bg-amber-500" }]
    : []),
  ...(batch.announcementDate ? [{ label: "Announcement", date: batch.announcementDate, color: "bg-green-500" }] : []),
  { label: "Program Starts", date: batch.startDate, color: "bg-teal-500" },
  { label: "Program Ends", date: batch.endDate, color: "bg-teal-500" },
  ...(batch.onboardingDate ? [{ label: "Onboarding", date: batch.onboardingDate, color: "bg-indigo-500" }] : []),
];

export function BatchTimelineDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: {
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    registrationStartDate: Date | string;
    registrationEndDate: Date | string;
    verificationStartDate?: Date | string | null;
    verificationEndDate?: Date | string | null;
    assessmentStartDate?: Date | string | null;
    assessmentEndDate?: Date | string | null;
    announcementDate?: Date | string | null;
    onboardingDate?: Date | string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!batch) return null;

  const events = timelineEvents(batch)
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Batch Timeline — {batch.name}</DialogTitle>
          <DialogDescription>Key dates and events for this batch.</DialogDescription>
        </DialogHeader>
        <div className="relative ml-4 space-y-6 border-muted border-l py-4 pl-6">
          {events.map((event, index) => (
            <div key={index} className="relative">
              <span
                className={`absolute -left-[31px] flex h-4 w-4 rounded-full ${event.color} ring-4 ring-background`}
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{event.label}</span>
                <span className="text-muted-foreground text-sm">
                  {format(new Date(event.date as string), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
