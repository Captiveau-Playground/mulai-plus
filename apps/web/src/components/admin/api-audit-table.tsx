"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export function ApiAuditTable() {
  const { data, isLoading } = useQuery(orpc.audit.getApiStats.queryOptions());

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action (Endpoint)</TableHead>
            <TableHead className="text-right">Call Count</TableHead>
            <TableHead>Last Called</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : data?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No API calls recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            data?.map((stat) => (
              <TableRow key={stat.action}>
                <TableCell className="font-mono">{stat.action}</TableCell>
                <TableCell className="text-right font-medium">{stat.count}</TableCell>
                <TableCell>{formatDate(stat.lastCalled)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
