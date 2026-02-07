"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

interface RecentApplication {
  id: string;
  programId: string;
  status: string;
  createdAt: string | Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  program: {
    name: string;
  } | null;
}

export function RecentApplicationsWidget() {
  const { data: applications, isLoading } = useQuery({
    ...orpc.programs.admin.applications.recent.queryOptions({
      input: { limit: 5 },
    }),
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  if (isLoading) {
    return (
      <Card className="col-span-3 lg:col-span-1">
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>Latest mentoring program applications.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-3 lg:col-span-1">
      <CardHeader>
        <CardTitle>Recent Applications</CardTitle>
        <CardDescription>Latest mentoring program applications.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Applied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No applications found.
                </TableCell>
              </TableRow>
            ) : (
              applications?.map((app: RecentApplication) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={app.user?.image || undefined} alt={app.user?.name || "User"} />
                        <AvatarFallback>{app.user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-none">{app.user?.name}</span>
                        <span className="text-muted-foreground text-xs">{app.user?.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{app.program?.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "accepted" ? "default" : app.status === "rejected" ? "destructive" : "secondary"
                      }
                      className="capitalize"
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDistanceToNow(new Date(app.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
