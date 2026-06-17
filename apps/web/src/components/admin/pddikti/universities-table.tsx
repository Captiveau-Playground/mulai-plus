"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  BadgeCheck,
  Banknote,
  Building2,
  ChevronDown,
  Globe,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";
import { CreateUniversityDialog, DeleteUniversityDialog, EditUniversityDialog } from "./dialogs";

const api = orpc as any;

export type University = {
  idSp: string;
  code: string | null;
  name: string;
  shortName: string | null;
  type: string | null;
  status: string | null;
  province: string | null;
  regency: string | null;
  accreditation: string | null;
  totalPrograms: number | null;
  tuitionRange: string | null;
};

const accreditationColors: Record<string, string> = {
  Unggul: "border-green-500/20 bg-green-500/10 text-green-600",
  "Baik Sekali": "border-blue-500/20 bg-blue-500/10 text-blue-600",
  Baik: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
  Terakreditasi: "border-gray-500/20 bg-gray-500/10 text-gray-600",
};

export function UniversitiesTable() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  const [filters, setFilters] = useState<{
    type?: string;
    province?: string;
    accreditation?: string;
    status?: string;
    search?: string;
  }>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editUniversity, setEditUniversity] = useState<University | null>(null);
  const [deleteUniversity, setDeleteUniversity] = useState<University | null>(null);

  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder = sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  const {
    data: _data,
    isLoading,
    isFetching,
  } = useQuery({
    ...api.pddikti.listUniversities.queryOptions({
      input: {
        page: pageIndex + 1,
        pageSize,
        search: filters.search || undefined,
        type: filters.type || undefined,
        province: filters.province || undefined,
        accreditation: filters.accreditation || undefined,
        status: filters.status || undefined,
        sort: sortField,
        order: sortOrder,
      },
    }),
    staleTime: 1000 * 60 * 2,
  });

  const { data: _provinces } = useQuery(api.pddikti.listProvinces.queryOptions());
  const { data: _types } = useQuery(api.pddikti.listTypes.queryOptions());
  const { data: _accreditations } = useQuery(api.pddikti.listAccreditations.queryOptions());
  const { data: _statuses } = useQuery(api.pddikti.listStatuses.queryOptions());

  const data = _data as any;
  const provinces = _provinces as string[] | undefined;
  const types = _types as string[] | undefined;
  const accreditations = _accreditations as string[] | undefined;
  const statuses = _statuses as any;

  const universities = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string }) => api.pddikti.deleteUniversity({ input }),
    onSuccess: () => {
      toast.success("University deleted");
      queryClient.invalidateQueries({ queryKey: ["pddikti"] });
      setDeleteUniversity(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const handleDelete = useCallback(
    (uni: University) => {
      deleteMutation.mutate({ id: uni.idSp });
    },
    [deleteMutation],
  );

  const columns: ColumnDef<University>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            University <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const uni = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy">
                {uni.type === "Negeri" ? (
                  <Building2 className="h-4 w-4 text-blue-500" />
                ) : uni.type === "Agama" ? (
                  <Globe className="h-4 w-4 text-green-500" />
                ) : (
                  <Building2 className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/pddikti/universities/${uni.idSp}` as any)}
                  className="text-left font-medium text-sm hover:text-brand-navy hover:underline"
                >
                  {uni.name}
                </button>
                <div className="flex items-center gap-1.5">
                  {uni.shortName && <span className="text-muted-foreground text-xs">{uni.shortName}</span>}
                  {uni.code && <span className="text-muted-foreground text-xs">· {uni.code}</span>}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Type <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const type = row.original.type;
          return (
            <Badge
              variant="outline"
              className={
                type === "Negeri"
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
                  : type === "Agama"
                    ? "border-green-500/20 bg-green-500/10 text-green-600"
                    : "border-orange-500/20 bg-orange-500/10 text-orange-600"
              }
            >
              {type ?? "-"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "province",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            <MapPin className="mr-1 h-3.5 w-3.5" />
            Province <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="text-xs">{row.original.province ?? "-"}</span>,
      },
      {
        accessorKey: "accreditation",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            <Trophy className="mr-1 h-3.5 w-3.5" />
            Accreditation <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const acc = row.original.accreditation ?? "-";
          return (
            <Badge
              variant="outline"
              className={accreditationColors[acc] ?? "border-gray-500/20 bg-gray-500/10 text-gray-600"}
            >
              {acc}
            </Badge>
          );
        },
      },
      {
        accessorKey: "totalPrograms",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Programs <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-center font-medium text-xs">{row.original.totalPrograms ?? "-"}</div>,
      },
      {
        accessorKey: "tuitionRange",
        header: "Tuition",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs">
            <Banknote className="h-3 w-3 text-muted-foreground" />
            <span>{row.original.tuitionRange ?? "-"}</span>
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const uni = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push(`/admin/pddikti/universities/${uni.idSp}` as any)}>
                    <BadgeCheck className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditUniversity(uni)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteUniversity(uni)} className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: universities,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination: { pageIndex, pageSize } },
    manualPagination: true,
    pageCount: totalPages,
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const ns = updater({ pageIndex, pageSize });
        setPageIndex(ns.pageIndex);
      }
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full max-w-[260px]">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search universities..."
              value={filters.search ?? ""}
              onChange={(e) => {
                setFilters((p) => ({ ...p, search: e.target.value }));
                setPageIndex(0);
              }}
              className="w-full pl-8"
            />
          </div>
          <Select
            value={filters.type ?? "all"}
            onValueChange={(v) => {
              const val = v ?? "all";
              setFilters((p) => ({ ...p, type: val === "all" ? undefined : val }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-9 w-[140px] rounded-lg">
              <SelectValue placeholder="All Types" />
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
          <Select
            value={filters.accreditation ?? "all"}
            onValueChange={(v) => {
              const val = v ?? "all";
              setFilters((p) => ({ ...p, accreditation: val === "all" ? undefined : val }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-9 w-[150px] rounded-lg">
              <SelectValue placeholder="Accreditation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accreditations</SelectItem>
              {accreditations?.map((a: string) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.province ?? "all"}
            onValueChange={(v) => {
              const val = v ?? "all";
              setFilters((p) => ({ ...p, province: val === "all" ? undefined : val }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-9 w-[160px] rounded-lg">
              <SelectValue placeholder="Province" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {provinces?.map((p: string) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isLoading || isFetching) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} className="btn-mentor rounded-full">
            <Plus className="mr-2 h-4 w-4" /> Add University
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id === "totalPrograms" ? "Programs" : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/pddikti/universities/${row.original.idSp}` as any)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => cell.column.id === "select" && e.stopPropagation()}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-muted-foreground text-sm">Loading universities...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Building2 className="h-8 w-8" />
                      <span className="text-sm">No universities found.</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of {total} row(s) selected.
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Page {pageIndex + 1} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              disabled={pageIndex >= totalPages - 1}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(totalPages - 1)}
              disabled={pageIndex >= totalPages - 1}
            >
              Last
            </Button>
          </div>
        </div>
      </div>

      <CreateUniversityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["pddikti"] })}
      />
      <EditUniversityDialog
        university={editUniversity}
        open={!!editUniversity}
        onOpenChange={(o) => !o && setEditUniversity(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["pddikti"] })}
      />
      <DeleteUniversityDialog
        university={deleteUniversity}
        open={!!deleteUniversity}
        onOpenChange={(o) => !o && setDeleteUniversity(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
