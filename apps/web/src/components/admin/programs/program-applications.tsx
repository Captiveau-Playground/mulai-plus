"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
        <CardDescription>Review and manage student applications.</CardDescription>
      </CardHeader>
      <CardContent>
        {selectedIds.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-muted/50 p-2">
            <span className="ml-2 font-medium text-sm">{selectedIds.length} selected</span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleBulkUpdate("accepted")}
              disabled={bulkUpdateMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" /> Accept Selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkUpdate("rejected")}
              disabled={bulkUpdateMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" /> Reject Selected
            </Button>
          </div>
        )}
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
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No applications found.
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
                    <div className="flex flex-col">
                      <span className="font-medium">{app.user?.name}</span>
                      <span className="text-muted-foreground text-xs">{app.user?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{app.batchName || "N/A"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "accepted" ? "default" : app.status === "rejected" ? "destructive" : "secondary"
                      }
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger>
                          <Button variant="outline" size="sm">
                            View Answers
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Reflective Answers</DialogTitle>
                            <DialogDescription>Submitted by {app.user?.name}</DialogDescription>
                          </DialogHeader>
                          <div className="max-h-[300px] space-y-4 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm">
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
                            className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleStatusUpdate(app.id, "accepted")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
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
      </CardContent>
    </Card>
  );
}
