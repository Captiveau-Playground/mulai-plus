"use client";

import { RoleTable } from "@/components/admin/role-table";

export default function RolesPage() {
  return (
    <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
      <h2 className="mb-4 font-bold text-2xl tracking-tight">Role Management</h2>
      <RoleTable />
    </div>
  );
}
