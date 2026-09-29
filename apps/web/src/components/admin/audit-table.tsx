"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  Search,
  X,
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export function AuditTable() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "action" | "resource">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const pageSize = 20;

  const hasFilters = filterAction || filterResource || dateFrom || dateTo;

  const { data, isLoading } = useQuery(
    orpc.audit.list.queryOptions({
      input: {
        limit: pageSize,
        offset: page * pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
        action: filterAction || undefined,
        resource: filterResource || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
    }),
  );

  const clearFilters = () => {
    setFilterAction("");
    setFilterResource("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const handleSort = (field: "createdAt" | "action" | "resource") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ field }: { field: "createdAt" | "action" | "resource" }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Collect unique actions and resources from the current data for filter dropdowns
  const uniqueActions = [...new Set(data?.items?.map((item) => item.action) || [])];
  const uniqueResources = [...new Set(data?.items?.map((item) => item.resource) || [])];

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action, resource, user..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 text-xs">
              <X className="mr-1 h-3 w-3" />
              Clear Filters
            </Button>
          )}
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterAction}
          onValueChange={(v) => {
            if (v) setFilterAction(v === "all" ? "" : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-9 w-[160px] rounded-lg border-gray-200 bg-white text-xs">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterResource}
          onValueChange={(v) => {
            if (v) setFilterResource(v === "all" ? "" : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-9 w-[160px] rounded-lg border-gray-200 bg-white text-xs">
            <SelectValue placeholder="All Resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            {uniqueResources.map((resource) => (
              <SelectItem key={resource} value={resource}>
                {resource}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="h-9 w-[200px] rounded-lg border-gray-200 text-xs"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <Input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="h-9 w-[200px] rounded-lg border-gray-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
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
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-mentor-teal" />
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Search className="h-5 w-5 text-gray-300" />
                    <p className="font-manrope text-sm text-text-muted-custom">No audit logs found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap font-manrope text-xs">{formatDate(log.createdAt)}</TableCell>
                  <TableCell>
                    {log.user ? (
                      <div className="flex flex-col">
                        <span className="font-manrope font-medium text-sm text-text-main">{log.user.name}</span>
                        <span className="font-manrope text-text-muted-custom text-xs">{log.user.email}</span>
                      </div>
                    ) : (
                      <span className="font-manrope text-text-muted-custom text-xs">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 font-manrope font-medium text-blue-700 text-xs ring-1 ring-blue-700/10 ring-inset">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-manrope text-sm text-text-main">{log.resource}</TableCell>
                  <TableCell className="font-manrope text-text-muted-custom text-xs">{log.ipAddress || "-"}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
                        <DialogHeader>
                          <DialogTitle className="font-bricolage text-brand-navy">Log Details</DialogTitle>
                          <DialogDescription className="font-manrope">
                            Full details for <span className="font-medium font-mono">{log.action}</span> on{" "}
                            {formatDate(log.createdAt)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-4">
                          <div className="rounded-xl bg-gray-50 p-4">
                            <pre className="whitespace-pre-wrap font-mono text-text-main text-xs">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                          {log.userAgent && (
                            <div>
                              <h4 className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                                User Agent
                              </h4>
                              <p className="mt-1 font-manrope text-sm text-text-muted-custom">{log.userAgent}</p>
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

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-manrope text-sm text-text-muted-custom">
          Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data?.total || 0)} of {data?.total} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg font-manrope text-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || (page + 1) * pageSize >= data.total}
            className="rounded-lg font-manrope text-xs"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
