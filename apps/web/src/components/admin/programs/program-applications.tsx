"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Loader2, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export function ProgramApplications({ programId }: { programId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.programs.admin.applications.list.queryOptions({
      input: { programId },
    }),
  );
  const applications = data?.data || [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const updateStatusMutation = useMutation(
    orpc.programs.admin.applications.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status updated");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.applications.list.key({
            input: { programId },
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const bulkUpdateMutation = useMutation(
    orpc.programs.admin.applications.bulkUpdateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Applications updated");
        setSelectedIds([]);
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.applications.list.key({
            input: { programId },
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleStatusUpdate = (id: string, status: "accepted" | "rejected") => {
    updateStatusMutation.mutate({
      id,
      status,
    });
  };

  const handleBulkUpdate = (status: "accepted" | "rejected") => {
    bulkUpdateMutation.mutate({
      ids: selectedIds,
      status,
    });
  };

  return (
    <Card className="mentor-card">
      <CardHeader className="bg-white">
        <div className="flex items-center gap-3">
          <div className="icon-box-light">
            <ClipboardList className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <CardTitle className="font-bricolage text-lg text-text-main">Applications</CardTitle>
            <CardDescription className="font-manrope text-text-muted-custom">
              Review and manage student applications.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-white p-0">
        {selectedIds.length > 0 && (
          <div className="mx-4 mt-4 mb-4 flex items-center gap-2 rounded-xl bg-mentor-teal/5 p-3">
            <span className="font-manrope font-medium text-mentor-teal text-sm">{selectedIds.length} selected</span>
            <div className="flex-1" />
            <Button
              size="sm"
              className="rounded-full bg-green-600 font-manrope text-xs hover:bg-green-700"
              onClick={() => handleBulkUpdate("accepted")}
              disabled={bulkUpdateMutation.isPending}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Accept Selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full font-manrope text-xs"
              onClick={() => handleBulkUpdate("rejected")}
              disabled={bulkUpdateMutation.isPending}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reject Selected
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={applications.length > 0 && selectedIds.length === applications.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(applications.map((app) => app.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-mentor-teal" />
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="h-8 w-8 text-text-muted-custom/50" />
                      <p className="font-manrope text-text-muted-custom">No applications found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(app.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds((prev) => [...prev, app.id]);
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== app.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy/10">
                          <User className="h-4 w-4 text-brand-navy" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-manrope font-medium text-sm text-text-main">{app.user?.name}</span>
                          <span className="font-manrope text-text-muted-custom text-xs">{app.user?.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-manrope text-xs">
                        {app.batchName || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          app.status === "accepted"
                            ? "default"
                            : app.status === "rejected"
                              ? "destructive"
                              : app.status === "waitlisted"
                                ? "secondary"
                                : "outline"
                        }
                        className="font-manrope text-xs capitalize"
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-manrope text-sm text-text-muted-custom">
                      {new Date(app.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Dialog>
                          <DialogTrigger>
                            <Button variant="outline" size="sm" className="rounded-full font-manrope text-xs">
                              View Answers
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Reflective Answers</DialogTitle>
                              <DialogDescription>Submitted by {app.user?.name}</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[400px] space-y-4 overflow-y-auto">
                              <pre className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 font-manrope text-sm text-text-main">
                                {JSON.stringify(app.reflectiveAnswers, null, 2)}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {app.status === "applied" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() => handleStatusUpdate(app.id, "accepted")}
                              disabled={updateStatusMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleStatusUpdate(app.id, "rejected")}
                              disabled={updateStatusMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
