"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export function BatchParticipants({ batchId }: { batchId: string }) {
  const { data: students, isLoading } = useQuery({
    ...orpc.programActivities.mentor.getBatchStudents.queryOptions({
      input: { batchId },
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
        <CardDescription>Students enrolled in this batch.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : students?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  No participants found.
                </TableCell>
              </TableRow>
            ) : (
              students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={student.image || undefined} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{student.name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{student.email}</span>
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
