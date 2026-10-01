import { MaintenanceGate } from "@/components/dashboard/maintenance-gate";

export default function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid grid-rows-[auto_1fr] overflow-x-hidden">
      <MaintenanceGate>{children}</MaintenanceGate>
    </div>
  );
}
