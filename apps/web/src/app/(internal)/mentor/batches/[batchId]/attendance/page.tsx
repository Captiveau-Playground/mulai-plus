"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchAttendancePage() {
  const params = useParams();
  const batchId = params.batchId as string;

  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.programActivities.mentor.getBatchAttendance.queryOptions({
      input: { batchId },
      enabled: !!isAuthorized && !!batchId,
    }),
  );

  const updateMutation = useMutation(
    orpc.programActivities.mentor.updateBatchAttendance.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const [updates, setUpdates] = useState<Record<string, { status: "present" | "absent" | "excused"; notes?: string }>>(
    {},
  );

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  const getStatus = (userId: string, week: number) => {
    if (updates[`${userId}-${week}`]) {
      return updates[`${userId}-${week}`].status;
    }
    const existing = data?.attendance.find((a) => a.userId === userId && a.week === week);
    return existing?.status || "";
  };

  const handleSave = async () => {
    const promises = Object.entries(updates).map(async ([key, value]) => {
      const [userId, weekStr] = key.split("-");
      const week = Number.parseInt(weekStr, 10);
      await updateMutation.mutateAsync({
        batchId,
        userId,
        week,
        status: value.status,
        notes: value.notes,
      });
    });

    try {
      await Promise.all(promises);
      toast.success("Attendance updated successfully");
      setUpdates({});
      queryClient.invalidateQueries({
        queryKey: orpc.programActivities.mentor.getBatchAttendance.key({
          input: { batchId },
        }),
      });
    } catch (_error) {
      // Error handled in mutation onError
    }
  };

  const weeks = data?.batch?.durationWeeks ? Array.from({ length: data.batch.durationWeeks }, (_, i) => i + 1) : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={"/mentor/batches" as any} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-semibold text-lg">{data?.batch?.name}</h1>
        </div>
        {Object.keys(updates).length > 0 && (
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes ({Object.keys(updates).length})
          </Button>
        )}
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <Link href={`/mentor/batches/${batchId}/attachments` as any} className="w-full">
            <TabsTrigger value="attachments" className="w-full">
              Resources
            </TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex h-48 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="relative overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 w-[200px] min-w-[200px] bg-background">Student</TableHead>
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
                      No students found in this batch.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.participants.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div className="flex flex-col">
                          <span>{student.name}</span>
                          <span className="text-muted-foreground text-xs">{student.email}</span>
                        </div>
                      </TableCell>
                      {weeks.map((week) => (
                        <TableCell key={week}>
                          <Select
                            value={getStatus(student.id, week)}
                            onValueChange={(val) => {
                              setUpdates((prev) => ({
                                ...prev,
                                [`${student.id}-${week}`]: {
                                  status: val as "present" | "absent" | "excused",
                                },
                              }));
                            }}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-[110px]",
                                getStatus(student.id, week) === "present" &&
                                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                getStatus(student.id, week) === "absent" &&
                                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                getStatus(student.id, week) === "excused" &&
                                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="excused">Excused</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
