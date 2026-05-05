"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export function ProgramParticipants({ programId }: { programId: string }) {
  const { data, isLoading } = useQuery(
    orpc.programs.admin.participants.list.queryOptions({
      input: { programId },
    }),
  );
  const participants = data?.data || [];

  return (
    <Card className="mentor-card">
      <CardHeader className="bg-white">
        <div className="flex items-center gap-3">
          <div className="icon-box-light">
            <Users className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <CardTitle className="font-bricolage text-lg text-text-main">Participants</CardTitle>
            <CardDescription className="font-manrope text-text-muted-custom">
              Active participants in the program.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-white p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agreed At</TableHead>
                <TableHead>Joined At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-mentor-teal" />
                  </TableCell>
                </TableRow>
              ) : participants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-text-muted-custom/50" />
                      <p className="font-manrope text-text-muted-custom">No participants found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy/10">
                          <User className="h-4 w-4 text-brand-navy" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-manrope font-medium text-sm text-text-main">
                            {participant.user?.name}
                          </span>
                          <span className="font-manrope text-text-muted-custom text-xs">{participant.user?.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-manrope text-xs">
                        {participant.batchName || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          participant.status === "active"
                            ? "default"
                            : participant.status === "completed"
                              ? "secondary"
                              : "outline"
                        }
                        className="font-manrope text-xs capitalize"
                      >
                        {participant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-manrope text-sm text-text-muted-custom">
                      {participant.agreedAt
                        ? new Date(participant.agreedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="font-manrope text-sm text-text-muted-custom">
                      {new Date(participant.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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
