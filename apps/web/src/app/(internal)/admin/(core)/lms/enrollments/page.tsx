"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function EnrollmentsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery(
    orpc.lms.admin.enrollments.list.queryOptions({
      input: {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    }),
  );

  const { data: courses } = useQuery(orpc.lms.course.list.queryOptions());

  const { data: users } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          limit: 100,
        },
      });
      return res.data?.users || [];
    },
  });

  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const enrollMutation = useMutation(
    orpc.lms.admin.enrollments.create.mutationOptions({
      onSuccess: () => {
        toast.success("User enrolled successfully");
        setIsDialogOpen(false);
        setSelectedUser("");
        setSelectedCourse("");
        refetch();
      },
      onError: (err) => {
        toast.error(`Failed to enroll: ${err.message}`);
      },
    }),
  );

  const handleEnroll = () => {
    if (!selectedUser || !selectedCourse) {
      toast.error("Please select both user and course");
      return;
    }
    enrollMutation.mutate({
      userId: selectedUser,
      courseId: selectedCourse,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "dropped":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl tracking-tight">Enrollments</h2>
            <p className="text-muted-foreground">Manage student enrollments</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Manual Enrollment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll User to Course</DialogTitle>
                <DialogDescription>
                  Manually enroll a user into a course. This will grant them immediate access.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="user-select">
                    Select User
                  </label>
                  <Select value={selectedUser} onValueChange={(val) => setSelectedUser(val || "")}>
                    <SelectTrigger>
                      {selectedUser ? <SelectValue /> : <span className="text-muted-foreground">Select a user</span>}
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="course-select">
                    Select Course
                  </label>
                  <Select value={selectedCourse} onValueChange={(val) => setSelectedCourse(val || "")}>
                    <SelectTrigger>
                      {selectedCourse ? (
                        <SelectValue />
                      ) : (
                        <span className="text-muted-foreground">Select a course</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEnroll} disabled={enrollMutation.isPending}>
                  {enrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enroll User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Enrolled At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No enrollments found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{enrollment.user?.name || "Unknown"}</span>
                        <span className="text-muted-foreground text-xs">{enrollment.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{enrollment.course?.title}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(enrollment.status)} variant="outline">
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-primary" style={{ width: `${enrollment.progress}%` }} />
                        </div>
                        <span className="text-muted-foreground text-xs">{enrollment.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(enrollment.enrolledAt), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {page} of {Math.ceil((data?.pagination.total || 0) / pageSize)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil((data?.pagination.total || 0) / pageSize) || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
