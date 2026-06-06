"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

export function BatchAttendanceDialog({
  batch,
  open,
  onOpenChange,
  embedded,
}: {
  batch: { id: string; durationWeeks: number; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}) {
  const { data, isLoading } = useQuery({
    ...orpc.programs.admin.batches.attendance.list.queryOptions({
      input: { batchId: batch.id },
    }),
    staleTime: 1000 * 60 * 1,
  });

  const attendanceQueryClient = useQueryClient();

  const [updates, setUpdates] = useState<
    Record<string, { status: "present" | "absent" | "excused"; notes?: string; progressNote?: string }>
  >({});

  const mutation = useMutation(
    orpc.programs.admin.batches.attendance.update.mutationOptions({
      onSuccess: () => {
        toast.success("Attendance updated");
        const path = orpc.programs.admin.batches.attendance.list.key()[0];
        attendanceQueryClient.invalidateQueries({ queryKey: [path], refetchType: "all" });
        onOpenChange(false);
        setUpdates({});
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleSave = () => {
    const updateList = Object.entries(updates).map(([key, value]) => {
      const [userId, weekStr] = key.split("-");
      return {
        userId,
        week: Number.parseInt(weekStr, 10),
        status: value.status,
        notes: value.notes,
        progressNote: value.progressNote,
      };
    });
    mutation.mutate({ batchId: batch.id, updates: updateList });
  };

  const getStatus = (userId: string, week: number) => {
    if (updates[`${userId}-${week}`]) {
      return updates[`${userId}-${week}`].status;
    }
    const existing = data?.attendance.find((a) => a.userId === userId && a.week === week);
    return existing?.status || "";
  };

  const getProgressNote = (userId: string, week: number) => {
    if (updates[`${userId}-${week}`]?.progressNote !== undefined) {
      return updates[`${userId}-${week}`].progressNote;
    }
    const existing = data?.attendance.find((a) => a.userId === userId && a.week === week);
    return existing?.progressNote || "";
  };

  const weeks = Array.from({ length: batch.durationWeeks }, (_, i) => i + 1);

  const mainContent = isLoading ? (
    <div className="flex h-48 items-center justify-center">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-mentor-teal" />
    </div>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-[200px] min-w-[200px] bg-white">Student</TableHead>
            {weeks.map((week) => (
              <TableHead key={week} className="min-w-[120px]">
                Week {week}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.participants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={weeks.length + 1} className="h-24 text-center">
                No accepted participants found.
              </TableCell>
            </TableRow>
          ) : (
            data?.participants.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 bg-white font-medium">{student.name}</TableCell>
                {weeks.map((week) => (
                  <TableCell key={week}>
                    <div className="flex flex-col gap-1">
                      <Select
                        value={getStatus(student.id, week)}
                        onValueChange={(val) => {
                          setUpdates((prev) => ({
                            ...prev,
                            [`${student.id}-${week}`]: {
                              ...prev[`${student.id}-${week}`],
                              status: val as "present" | "absent" | "excused",
                            },
                          }));
                        }}
                      >
                        <SelectTrigger className="h-8 w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="excused">Excused</SelectItem>
                        </SelectContent>
                      </Select>
                      <Popover>
                        <PopoverTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-[100px] text-muted-foreground text-xs hover:text-primary"
                          >
                            {(() => {
                              const note = getProgressNote(student.id, week);
                              return note ? `📝 ${note.slice(0, 12)}...` : "+ Progress note";
                            })()}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="start">
                          <div className="grid gap-2">
                            <p className="font-medium text-sm">Weekly Progress Note</p>
                            <Textarea
                              placeholder="E.g., Student shows good understanding..."
                              value={getProgressNote(student.id, week)}
                              onChange={(e) => {
                                setUpdates((prev) => ({
                                  ...prev,
                                  [`${student.id}-${week}`]: {
                                    ...prev[`${student.id}-${week}`],
                                    progressNote: e.target.value,
                                  },
                                }));
                              }}
                              rows={3}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
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
        disabled={mutation.isPending}
        className="!rounded-full !bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !border-0"
      >
        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );

  if (embedded)
    return (
      <div className="space-y-4">
        {mainContent}
        {footer}
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Batch Attendance: {batch.name}</DialogTitle>
          <DialogDescription>
            Track weekly attendance for accepted participants ({batch.durationWeeks} weeks).
          </DialogDescription>
        </DialogHeader>
        {mainContent}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
