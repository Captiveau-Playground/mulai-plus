"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, Video } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MentorSidebar } from "@/components/mentor/mentor-sidebar";
import { SessionUpdateDialog } from "@/components/mentor/sessions/session-update-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

function MentorSessionsContent() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId");
  const { data: sessions, isLoading } = useQuery(
    orpc.programActivities.session.mySessions.queryOptions({
      input: { batchId: batchId || undefined },
      enabled: !!isAuthorized,
    }),
  );
  const [editingSession, setEditingSession] = useState<any>(null);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Program / Batch</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No sessions found
                </TableCell>
              </TableRow>
            ) : (
              sessions?.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="font-medium">Week {session.week}</div>
                    <div className="text-muted-foreground text-xs capitalize">{session.type.replace("_", " ")}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{session.batch?.program?.name}</div>
                    <div className="text-muted-foreground text-xs">{session.batch?.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{format(new Date(session.startsAt), "PPP")}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(session.startsAt), "p")} ({session.durationMinutes} min)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.student ? (
                      <div className="flex items-center gap-2">
                        <span>{session.student.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        session.status === "completed"
                          ? "default"
                          : session.status === "cancelled" || session.status === "missed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {session.meetingLink && (
                        <Button variant="ghost" size="icon">
                          <Link href={session.meetingLink as any} target="_blank">
                            <Video className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setEditingSession(session)}>
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {editingSession && (
        <SessionUpdateDialog
          session={editingSession}
          open={!!editingSession}
          onOpenChange={(open) => !open && setEditingSession(null)}
        />
      )}
    </div>
  );
}

export default function MentorSessionsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <MentorSidebar variant="inset" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <span className="font-semibold">My Sessions</span>
        </header>
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <MentorSessionsContent />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
