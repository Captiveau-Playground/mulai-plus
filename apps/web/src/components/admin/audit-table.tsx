"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export function AuditTable() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "action" | "resource">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const pageSize = 20;

  const { data, isLoading } = useQuery(
    orpc.audit.list.queryOptions({
      input: {
        limit: pageSize,
        offset: page * pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
      },
    }),
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const handleSort = (field: "createdAt" | "action" | "resource") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // Default to desc for new sort
    }
  };

  const SortIcon = ({ field }: { field: "createdAt" | "action" | "resource" }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action, resource, user..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0); // Reset page on search
            }}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdAt")}>
                <div className="flex items-center">
                  Time
                  <SortIcon field="createdAt" />
                </div>
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("action")}>
                <div className="flex items-center">
                  Action
                  <SortIcon field="action" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("resource")}>
                <div className="flex items-center">
                  Resource
                  <SortIcon field="resource" />
                </div>
              </TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                  <TableCell>
                    {log.user ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{log.user.name}</span>
                        <span className="text-muted-foreground text-xs">{log.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System/Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 text-xs ring-1 ring-blue-700/10 ring-inset dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>{log.resource}</TableCell>
                  <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] min-w-7xl overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Log Details</DialogTitle>
                          <DialogDescription>
                            Full details for action <span className="font-medium font-mono">{log.action}</span> on{" "}
                            {formatDate(log.createdAt)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="rounded-md bg-muted p-4">
                            <pre className="whitespace-pre-wrap font-mono text-xs">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                          {log.userAgent && (
                            <div className="mt-4 space-y-2">
                              <h4 className="font-medium text-sm">User Agent</h4>
                              <p className="text-muted-foreground text-sm">{log.userAgent}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-muted-foreground text-sm">
          Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data?.total || 0)} of {data?.total} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || (page + 1) * pageSize >= data.total}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
