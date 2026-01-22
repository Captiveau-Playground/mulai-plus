"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export function ProgramParticipants({ programId }: { programId: string }) {
  const { data, isLoading } = useQuery(orpc.programs.admin.participants.list.queryOptions({ input: { programId } }));
  const participants = data?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
        <CardDescription>Active participants in the program.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Agreed At</TableHead>
              <TableHead>Joined At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No participants found.
                </TableCell>
              </TableRow>
            ) : (
              participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{participant.user?.name}</span>
                      <span className="text-muted-foreground text-xs">{participant.user?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{participant.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {participant.agreedAt ? new Date(participant.agreedAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>{new Date(participant.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
