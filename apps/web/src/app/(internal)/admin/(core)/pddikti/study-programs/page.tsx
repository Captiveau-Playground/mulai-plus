"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

export default function StudyProgramsPage() {
  const { isAuthorized, isLoading: authLoading } = useAuthorizePage({ admin_dashboard: ["access"] });
  const _queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const pageSize = 20;

  const { data: _data, isLoading } = useQuery({
    ...api.pddikti.listStudyPrograms.queryOptions({
      input: { page: page + 1, pageSize, search: search || undefined, level: level === "all" ? undefined : level },
    }),
    staleTime: 1000 * 60 * 2,
  });
  const { data: _levels } = useQuery(api.pddikti.listProgramLevels.queryOptions());

  const data = _data as any;
  const levels = _levels as string[] | undefined;
  const programs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <PageState isLoading={authLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand-navy" />
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Study Programs</h2>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-[260px]">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-8"
            />
          </div>
          <Select
            value={level}
            onValueChange={(v) => {
              const val = v ?? "all";
              setLevel(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels?.map((l: string) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="ml-auto text-muted-foreground text-xs">{total.toLocaleString()} programs</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Accreditation</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Lecturers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.length ? (
                programs.map((p: any) => (
                  <TableRow key={p.idSms} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{p.code ?? "-"}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {p.level ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {p.accreditation ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{p.totalStudents?.toLocaleString() ?? "-"}</TableCell>
                    <TableCell className="text-right text-xs">{p.totalLecturers ?? "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No programs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Page {page + 1} of {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </PageState>
  );
}
