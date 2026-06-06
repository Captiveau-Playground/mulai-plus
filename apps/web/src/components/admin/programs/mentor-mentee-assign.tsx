"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, User, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

type Batch = { id: string; name: string };

export function MentorMenteeAssignDialog({
  batch,
  programId,
  open,
  onOpenChange,
  embedded,
}: {
  batch: Batch | null;
  programId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});

  // Fetch participants (mentees) for this batch
  const { data: participantsData, isLoading: loadingParticipants } = useQuery({
    ...orpc.programs.admin.participants.list.queryOptions({
      input: { programId, status: "all" },
    }),
    enabled: !!batch?.id,
  });

  // Fetch mentors for this batch
  const { data: mentorsData, isLoading: loadingMentors } = useQuery({
    ...orpc.programs.admin.batches.getMentors.queryOptions({
      input: { batchId: batch?.id ?? "" },
    }),
    enabled: !!batch?.id,
  });

  // Fetch existing assignments
  const { data: existingData, isLoading: loadingExisting } = useQuery({
    ...orpc.programs.admin.mentorMentee.list.queryOptions({
      input: { batchId: batch?.id ?? "" },
    }),
    enabled: !!batch?.id,
  });

  // Initialize assignments from existing data
  useState(() => {
    if (existingData?.data) {
      const initial: Record<string, string> = {};
      for (const a of existingData.data) {
        initial[a.student.id] = a.mentor.id;
      }
      setAssignments(initial);
    }
  });

  const assignMutation = useMutation({
    ...orpc.programs.admin.mentorMentee.assign.mutationOptions(),
    onSuccess: () => {
      toast.success("Mentor assignments saved!");
      queryClient.invalidateQueries({ queryKey: ["mentorMentee"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save assignments");
    },
  });

  // Filter participants to only those in this batch
  const participants = (participantsData?.data ?? []).filter((p) => p.batchName === batch?.name);
  const mentors = mentorsData ?? [];

  const handleSave = () => {
    if (!batch) return;

    const entries = Object.entries(assignments).filter(([, mentorId]) => mentorId) as [string, string][];
    const payload = entries.map(([studentId, mentorId]) => ({ studentId, mentorId }));

    assignMutation.mutate({ batchId: batch.id, assignments: payload });
  };

  const unassignedCount = participants.filter((p) => (p.user?.id ? !assignments[p.user.id] : true)).length;

  const mainContent =
    loadingParticipants || loadingMentors || loadingExisting ? (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    ) : participants.length === 0 ? (
      <div className="flex flex-col items-center py-10 text-center">
        <Users className="mb-2 h-8 w-8 text-text-muted-custom/50" />
        <p className="font-manrope text-text-muted-custom">No participants in this batch.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-manrope text-text-muted-custom text-xs">
            {participants.length} participants
            {unassignedCount > 0 && <span className="ml-1 text-brand-red">({unassignedCount} unassigned)</span>}
          </span>
          {mentors.length === 0 && (
            <span className="font-manrope font-medium text-brand-red text-xs">
              No mentors assigned to this batch yet
            </span>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Mentee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-64">Assigned Mentor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p, idx) => {
              const studentId = p.user?.id;
              const currentMentorId = studentId ? assignments[studentId] || "" : "";

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-manrope text-text-muted-custom text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy/10">
                        <User className="h-4 w-4 text-brand-navy" />
                      </div>
                      <div>
                        <p className="font-manrope font-medium text-sm text-text-main">{p.user?.name}</p>
                        <p className="font-manrope text-text-muted-custom text-xs">{p.user?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === "active" ? "default" : "outline"}
                      className="font-manrope text-[10px] capitalize"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Select
                        value={currentMentorId}
                        onValueChange={(val) => {
                          setAssignments((prev) => ({ ...prev, [studentId!]: val }) as Record<string, string | null>);
                        }}
                        disabled={!studentId}
                      >
                        <SelectTrigger className="h-9 w-full font-manrope text-xs">
                          {currentMentorId ? (
                            <span className="font-medium text-xs">
                              {mentors?.find((m) => m.id === currentMentorId)?.name ||
                                mentors?.find((m) => m.id === currentMentorId)?.email ||
                                currentMentorId}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select mentor...</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {mentors.length === 0 ? (
                            <SelectItem value="__none__" disabled>
                              No mentors available
                            </SelectItem>
                          ) : (
                            mentors.map((m) => (
                              <SelectItem key={m.id} value={m.id} className="font-manrope text-xs">
                                {m.name || m.email}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {currentMentorId && (
                        <button
                          type="button"
                          onClick={() => {
                            setAssignments((prev) => {
                              const next = { ...prev };
                              delete next[studentId!];
                              return next;
                            });
                          }}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted-custom transition-colors hover:bg-red-50 hover:text-brand-red"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );

  const footer = (
    <div className="flex justify-end gap-2 border-gray-100 border-t pt-4">
      {!embedded && (
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full border-gray-200">
          Cancel
        </Button>
      )}
      <Button
        onClick={handleSave}
        disabled={assignMutation.isPending || participants.length === 0}
        className="!rounded-full !bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !border-0"
      >
        {assignMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" /> Save Assignments
          </>
        )}
      </Button>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {mainContent}
        {footer}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-bricolage text-brand-navy">Assign Mentors — {batch?.name}</DialogTitle>
          <DialogDescription>Assign each mentee to a mentor. One mentor can handle multiple mentees.</DialogDescription>
        </DialogHeader>
        {mainContent}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
