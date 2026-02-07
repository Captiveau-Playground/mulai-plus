"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export default function StudentProgramsPage() {
  const { data: programs, isLoading } = useQuery(orpc.programs.student.myPrograms.queryOptions());

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">My Programs</h1>
        <p className="text-muted-foreground">Manage and view your enrolled programs.</p>
      </div>

      {programs && programs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.id} className="flex flex-col overflow-hidden">
              <div className="relative aspect-video w-full bg-muted">
                {program.bannerUrl ? (
                  <Image src={program.bannerUrl} alt={program.name || "Program Banner"} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No Thumbnail</div>
                )}
              </div>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline">{program.batch.name}</Badge>
                  {/* Status badge could be added here if available */}
                </div>
                <CardTitle className="line-clamp-2">{program.name}</CardTitle>
                <CardDescription className="line-clamp-3">{program.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-muted-foreground text-sm">
                  Joined on {format(new Date(program.joinedAt), "MMM d, yyyy")}
                </div>
              </CardContent>
              {/* <CardFooter>
                <Button className="w-full" asChild>
                  <Link href={`/dashboard/student/programs/${program.id}`}>View Details</Link>
                </Button>
              </CardFooter> */}
            </Card>
          ))}
        </div>
      ) : (
        <div className="fade-in-50 flex min-h-[400px] animate-in flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-lg">No programs found</h3>
          <p className="mt-2 mb-4 text-muted-foreground text-sm">You haven't enrolled in any programs yet.</p>
        </div>
      )}
    </div>
  );
}
