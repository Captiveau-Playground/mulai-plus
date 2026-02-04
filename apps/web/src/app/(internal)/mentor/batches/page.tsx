"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorizePage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function MentorBatchesPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const { data: batches, isLoading } = useQuery(
    orpc.programs.myBatches.queryOptions({
      enabled: !!isAuthorized,
    }),
  );

  return (
    <PageState isLoading={isAuthLoading || isLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Batch Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No batches found
                  </TableCell>
                </TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.program?.name}</TableCell>
                    <TableCell>{batch.name}</TableCell>
                    <TableCell>{format(new Date(batch.startDate), "PPP")}</TableCell>
                    <TableCell>{format(new Date(batch.endDate), "PPP")}</TableCell>
                    <TableCell>
                      <Badge variant={batch.status === "active" ? "default" : "secondary"}>{batch.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/mentor/sessions?batchId=${batch.id}` as any}
                          className={cn(
                            buttonVariants({
                              variant: "outline",
                              size: "sm",
                            }),
                          )}
                        >
                          View Sessions
                        </Link>
                        <Link
                          href={`/mentor/batches/${batch.id}/attendance` as any}
                          className={cn(
                            buttonVariants({
                              variant: "outline",
                              size: "sm",
                            }),
                          )}
                        >
                          Attendance
                        </Link>
                        <Link
                          href={`/mentor/batches/${batch.id}/attachments` as any}
                          className={cn(
                            buttonVariants({
                              variant: "outline",
                              size: "sm",
                            }),
                          )}
                        >
                          Attachments
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageState>
  );
}
