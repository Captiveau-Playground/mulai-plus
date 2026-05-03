"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export function BatchParticipants({ batchId }: { batchId: string }) {
  const { data: students, isLoading } = useQuery({
    ...orpc.programActivities.mentor.getBatchStudents.queryOptions({
      input: { batchId },
    }),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted-custom" />
      </div>
    );
  }

  if (!students?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
          <User className="h-6 w-6 text-gray-400" />
        </div>
        <p className="font-manrope font-medium text-sm text-text-muted-custom">No participants found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {students.map((student) => (
        <Card key={student.id} className="mentor-card mentor-card-hover">
          <CardContent className="flex items-center gap-4 p-5">
            <Avatar className="h-12 w-12 rounded-full shadow-sm ring-2 ring-white">
              <AvatarImage src={student.image || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-brand-navy to-mentor-teal font-bold font-bricolage text-lg text-white">
                {student.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-manrope font-medium text-sm text-text-main">{student.name || "Unknown"}</p>
              {student.email && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-text-muted-custom" />
                  <span className="truncate font-manrope text-text-muted-custom text-xs">{student.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
