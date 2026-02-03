"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Ban,
  CheckCircle,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  VenetianMask,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { DeleteUserDialog, EditUserRoleDialog, UserSessionsDialog } from "@/components/admin/user-actions-dialogs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { authClient } from "@/lib/auth-client";

export type User = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
};

export function UserTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [selectedUserForSessions, setSelectedUserForSessions] = React.useState<string | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = React.useState<string | null>(null);
  const [selectedUserForRoleEdit, setSelectedUserForRoleEdit] = React.useState<User | null>(null);

  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  const handleImpersonateUser = async (userId: string) => {
    toast.promise(
      authClient.admin.impersonateUser({
        userId,
      }),
      {
        loading: "Impersonating user...",
        success: () => {
          router.push("/");
          router.refresh();
          return "Impersonation started";
        },
        error: (err) => `Failed to impersonate user: ${err.message}`,
      },
    );
  };

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit: 100, // Fetch up to 100 users for now
        },
      });
      if (data) {
        setUsers(
          data.users.map((u) => ({
            ...u,
            banned: u.banned ?? false,
            banReason: u.banReason ?? null,
            banExpires: u.banExpires ? new Date(u.banExpires) : null,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          })),
        );
      } else if (error) {
        toast.error(`Failed to fetch users: ${error.message}`);
      }
    } catch (_e) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    toast.promise(
      authClient.admin.setRole({
        userId,
        role: newRole as "user" | "admin", // Adjust types based on your schema
      }),
      {
        loading: "Updating role...",
        success: () => {
          fetchUsers();
          return "Role updated successfully";
        },
        error: (err) => `Failed to update role: ${err.message}`,
      },
    );
  };

  const handleBanUser = async (userId: string) => {
    toast.promise(
      authClient.admin.banUser({
        userId,
        banReason: "Admin action",
      }),
      {
        loading: "Banning user...",
        success: () => {
          fetchUsers();
          return "User banned successfully";
        },
        error: (err) => `Failed to ban user: ${err.message}`,
      },
    );
  };

  const handleUnbanUser = async (userId: string) => {
    toast.promise(
      authClient.admin.unbanUser({
        userId,
      }),
      {
        loading: "Unbanning user...",
        success: () => {
          fetchUsers();
          return "User unbanned successfully";
        },
        error: (err) => `Failed to unban user: ${err.message}`,
      },
    );
  };

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
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
      id: "user",
      accessorFn: (row) => `${row.name} ${row.email}`,
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{user.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">{user.email}</span>
                {user.emailVerified ? (
                  <CheckCircle className="h-3 w-3 text-green-500" aria-label="Verified" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" aria-label="Unverified" />
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Select defaultValue={user.role || "user"} onValueChange={(val) => val && handleRoleChange(user.id, val)}>
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="mentor">Mentor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isBanned = row.original.banned;
        return (
          <Badge
            variant={isBanned ? "destructive" : "outline"}
            className={isBanned ? "" : "border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20"}
          >
            {isBanned ? (
              <>
                <Ban className="mr-1 h-3 w-3" /> Banned
              </>
            ) : (
              <>
                <CheckCircle className="mr-1 h-3 w-3" /> Active
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Joined
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        // Use a simple relative time formatter or fallback to locale date string
        const date = row.original.createdAt;
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let relativeTime: string;
        if (diffInSeconds < 60) relativeTime = "just now";
        else if (diffInSeconds < 3600) relativeTime = `${Math.floor(diffInSeconds / 60)}m ago`;
        else if (diffInSeconds < 86400) relativeTime = `${Math.floor(diffInSeconds / 3600)}h ago`;
        else if (diffInSeconds < 604800) relativeTime = `${Math.floor(diffInSeconds / 86400)}d ago`;
        else relativeTime = date.toLocaleDateString();

        return <div className="lowercase">{relativeTime}</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>Copy User ID</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedUserForSessions(user.id)}>Manage Sessions</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImpersonateUser(user.id)}>
                  <VenetianMask className="mr-2 h-4 w-4" /> Impersonate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedUserForRoleEdit(user)}>Edit Role</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedUserForDelete(user.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {user.banned ? (
                  <DropdownMenuItem onClick={() => handleUnbanUser(user.id)}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Unban User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleBanUser(user.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="mr-2 h-4 w-4" /> Ban User
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter users..."
            value={(table.getColumn("user")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("user")?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "Loading users..." : "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
          selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
      <UserSessionsDialog
        userId={selectedUserForSessions}
        open={!!selectedUserForSessions}
        onOpenChange={(open) => !open && setSelectedUserForSessions(null)}
      />

      <EditUserRoleDialog
        user={selectedUserForRoleEdit}
        open={!!selectedUserForRoleEdit}
        onOpenChange={(open) => !open && setSelectedUserForRoleEdit(null)}
        onSuccess={fetchUsers}
      />

      <DeleteUserDialog
        userId={selectedUserForDelete}
        open={!!selectedUserForDelete}
        onOpenChange={(open) => !open && setSelectedUserForDelete(null)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
