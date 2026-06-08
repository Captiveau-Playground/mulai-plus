"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Search } from "lucide-react";
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

export default function SnpmbUniversitiesPage() {
  const { isAuthorized, isLoading: authLoading } = useAuthorizePage({ admin_dashboard: ["access"] });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const pageSize = 20;

  const { data: _data, isLoading } = useQuery({
    ...api.pddikti.listSnpmbUniversities.queryOptions({
      input: { page: page + 1, pageSize, search: search || undefined, type: type === "all" ? undefined : type },
    }),
    staleTime: 1000 * 60 * 2,
  });
  const { data: _types } = useQuery(api.pddikti.listSnpmbTypes.queryOptions());

  const data = _data as any;
  const types = _types as string[] | undefined;
  const unis = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <PageState isLoading={authLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-6 w-6 text-brand-navy" />
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">SNPMB Universities</h2>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-[260px]">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-8"
            />
          </div>
          <Select
            value={type}
            onValueChange={(v) => {
              const val = v ?? "all";
              setType(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types?.map((t: string) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="ml-auto text-muted-foreground text-xs">{total} universities</span>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID PTN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>PTN BH</TableHead>
                <TableHead>Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unis.length ? (
                unis.map((u: any) => (
                  <TableRow key={u.idPtn} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{u.idPtn}</TableCell>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {u.type ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{u.province ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={u.isPtnbh ? "default" : "outline"} className="text-[10px]">
                        {u.isPtnbh ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {u.website ? (
                        <a
                          href={u.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {u.website}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No SNPMB universities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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
