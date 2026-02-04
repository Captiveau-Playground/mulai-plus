"use client";

import { PermissionTable } from "@/components/admin/permission-table";

export default function PermissionsPage() {
  return (
    <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
      <h2 className="mb-4 font-bold text-2xl tracking-tight">Permission Management</h2>
      <PermissionTable />
    </div>
  );
}
