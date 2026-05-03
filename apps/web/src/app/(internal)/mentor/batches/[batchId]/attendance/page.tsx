"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock, Loader2, Save, StickyNote, User, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MentorBatchTabs } from "@/components/mentor/mentor-batch-tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type AttendanceStatus = "present" | "absent" | "excused";

interface UpdateEntry {
  status: AttendanceStatus;
  notes: string;
  progressNote: string;
}

export default function MentorBatchAttendancePage() {
  const params = useParams();
  const batchId = params.batchId as string;

  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    ...orpc.programActivities.mentor.getBatchAttendance.queryOptions({
      input: { batchId },
      enabled: !!isAuthorized && !!batchId,
    }),
    staleTime: 1000 * 60 * 1,
  });

  const updateMutation = useMutation(
    orpc.programActivities.mentor.updateBatchAttendance.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const [weekFilter, setWeekFilter] = useState<string>("1");
  const [updates, setUpdates] = useState<Record<string, UpdateEntry>>({});
  const [saving, setSaving] = useState(false);

  const participants = data?.participants || [];
  const mySessions = data?.mySessions || [];
  const attendance = data?.attendance || [];
  const batch = data?.batch;
  const durationWeeks = batch?.durationWeeks || 1;
  const currentWeek = Number.parseInt(weekFilter, 10);

  const getAttendanceForUser = (userId: string) =>
    attendance.find((a: any) => a.userId === userId && a.week === currentWeek);

  const hasSessionForUser = (userId: string) =>
    mySessions.some((s: any) => s.week === currentWeek && (s.studentId === null || s.studentId === userId));

  const getStatus = (userId: string): AttendanceStatus | null => {
    const key = `${userId}-${currentWeek}`;
    return updates[key]?.status || getAttendanceForUser(userId)?.status || null;
  };

  const getNotes = (userId: string) => {
    const key = `${userId}-${currentWeek}`;
    return updates[key]?.notes ?? getAttendanceForUser(userId)?.notes ?? "";
  };

  const getProgressNote = (userId: string) => {
    const key = `${userId}-${currentWeek}`;
    return updates[key]?.progressNote ?? getAttendanceForUser(userId)?.progressNote ?? "";
  };

  const setUpdate = (userId: string, partial: Partial<UpdateEntry>) => {
    const key = `${userId}-${currentWeek}`;
    setUpdates((prev) => ({
      ...prev,
      [key]: {
        status: partial.status ?? prev[key]?.status ?? getStatus(userId) ?? "present",
        notes: partial.notes ?? prev[key]?.notes ?? getNotes(userId),
        progressNote: partial.progressNote ?? prev[key]?.progressNote ?? getProgressNote(userId),
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const entries = Object.entries(updates).map(([key, value]) => {
      const [userId, weekStr] = key.split("-");
      return { batchId, userId, week: Number.parseInt(weekStr, 10), ...value };
    });

    let succeeded = 0;
    let failed = 0;
    for (const entry of entries) {
      try {
        await updateMutation.mutateAsync(entry);
        succeeded++;
      } catch {
        failed++;
      }
    }

    if (failed === 0) {
      queryClient.invalidateQueries({ queryKey: orpc.programActivities.mentor.getBatchAttendance.key() });
      setUpdates({});
      toast.success(`${succeeded} attendance record${succeeded > 1 ? "s" : ""} saved!`);
    } else if (succeeded > 0) {
      queryClient.invalidateQueries({ queryKey: orpc.programActivities.mentor.getBatchAttendance.key() });
      setUpdates({});
      toast.warning(`${succeeded} saved, ${failed} failed. Retry the failed ones.`);
    } else {
      toast.error("Failed to save. Please try again.");
    }

    setSaving(false);
  };

  const hasUpdates = Object.keys(updates).length > 0;
  const statusCounts = {
    present: participants.filter((p: any) => getStatus(p.id) === "present").length,
    absent: participants.filter((p: any) => getStatus(p.id) === "absent").length,
    excused: participants.filter((p: any) => getStatus(p.id) === "excused").length,
    unchecked: participants.filter((p: any) => !getStatus(p.id)).length,
  };

  const weeks = Array.from({ length: durationWeeks }, (_, i) => i + 1);

  return (
    <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-section flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/mentor/batches" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}>
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

        {/* Week Navigator */}
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="font-manrope font-medium text-sm text-text-main">Week</span>
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {weeks.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeekFilter(String(w))}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-manrope font-medium text-sm transition-all",
                    currentWeek === w
                      ? "bg-brand-navy text-white shadow-sm"
                      : "text-text-muted-custom hover:bg-gray-100 hover:text-text-main",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label="Present" count={statusCounts.present} color="bg-green-500" />
            <StatusPill label="Absent" count={statusCounts.absent} color="bg-red-500" />
            <StatusPill label="Excused" count={statusCounts.excused} color="bg-orange-400" />
            <StatusPill label="?" count={statusCounts.unchecked} color="bg-gray-300" />
          </div>
        </div>

        {/* Attendance Cards */}
        <div className="space-y-3">
          {participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                <User className="h-6 w-6 text-gray-400" />
              </div>
              <p className="font-manrope font-medium text-sm text-text-muted-custom">No participants yet</p>
            </div>
          ) : (
            participants.map((participant: any) => {
              const currentStatus = getStatus(participant.id);
              const hasSession = hasSessionForUser(participant.id);
              return (
                <Card key={participant.id} className="mentor-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                      {/* User Info */}
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy to-mentor-teal text-white">
                          <span className="font-bold font-bricolage text-sm">
                            {participant.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-manrope font-medium text-sm text-text-main">{participant.name}</p>
                          <p className="truncate font-manrope text-text-muted-custom text-xs">{participant.email}</p>
                        </div>
                      </div>

                      {/* Status Select — disabled if no session */}
                      <div className="flex items-center gap-2">
                        {hasSession ? (
                          <Select
                            value={currentStatus || ""}
                            onValueChange={(val) => setUpdate(participant.id, { status: val as AttendanceStatus })}
                          >
                            <SelectTrigger
                              className={cn(
                                "w-[135px] rounded-xl border-2 bg-white font-manrope font-medium text-sm transition-all",
                                currentStatus === "present" && "border-green-300 bg-green-50 text-green-700",
                                currentStatus === "absent" && "border-red-300 bg-red-50 text-red-700",
                                currentStatus === "excused" && "border-orange-300 bg-orange-50 text-orange-700",
                                !currentStatus && "border-gray-200 text-text-muted-custom",
                              )}
                            >
                              {currentStatus ? (
                                <span className="capitalize">{currentStatus}</span>
                              ) : (
                                <span className="text-text-muted-custom">Select</span>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">
                                <span className="flex items-center gap-2">
                                  <Check className="h-3.5 w-3.5 text-green-500" /> Present
                                </span>
                              </SelectItem>
                              <SelectItem value="absent">
                                <span className="flex items-center gap-2">
                                  <X className="h-3.5 w-3.5 text-red-500" /> Absent
                                </span>
                              </SelectItem>
                              <SelectItem value="excused">
                                <span className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-orange-500" /> Excused
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-manrope text-text-muted-custom text-xs">
                            <X className="h-3.5 w-3.5" />
                            No session
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notes — only when session exists AND status is set */}
                    {currentStatus && (
                      <div className="border-gray-100 border-t px-4 pt-3 pb-4 sm:px-5 sm:pb-5">
                        <div className="flex items-start gap-2">
                          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-text-muted-custom" />
                          <input
                            type="text"
                            placeholder="Add a short note..."
                            value={getNotes(participant.id)}
                            onChange={(e) => setUpdate(participant.id, { notes: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-manrope text-sm text-text-main outline-none transition-all placeholder:text-text-muted-custom focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/20"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Sticky Save */}
        {hasUpdates && (
          <div className="sticky bottom-6 z-10 flex justify-center">
            <div className="flex items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-xl ring-1 ring-gray-200">
              <span className="font-manrope text-sm text-text-muted-custom">
                {Object.keys(updates).length} change{Object.keys(updates).length > 1 ? "s" : ""} pending
              </span>
              <Button onClick={handleSaveAll} disabled={saving} className="btn-mentor rounded-xl px-6 py-2.5 shadow-sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageState>
  );
}

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
      <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className="font-manrope font-medium text-text-main text-xs">{count}</span>
      <span className="font-manrope text-text-muted-custom text-xs">{label}</span>
    </div>
  );
}
