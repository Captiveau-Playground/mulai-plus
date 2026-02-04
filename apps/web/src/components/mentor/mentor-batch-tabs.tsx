"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MentorBatchTabs({ batchId }: { batchId: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const currentTab = segments[segments.length - 1]; // e.g., 'attendance', 'curriculum', 'attachments', 'participants'

  return (
    <Tabs value={currentTab} className="w-full">
      <TabsList className="grid w-full max-w-[600px] grid-cols-4">
        <Link href={`/mentor/batches/${batchId}/attendance` as any}>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </Link>
        <Link href={`/mentor/batches/${batchId}/participants` as any}>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </Link>
        <Link href={`/mentor/batches/${batchId}/curriculum` as any}>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
        </Link>
        <Link href={`/mentor/batches/${batchId}/attachments` as any}>
          <TabsTrigger value="attachments">Resources</TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  );
}
