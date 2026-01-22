"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";
import { ProgramApplications } from "./program-applications";
import { type Program, ProgramInfo } from "./program-info";
import { ProgramMentors } from "./program-mentors";
import { ProgramParticipants } from "./program-participants";
import { ProgramSyllabus } from "./program-syllabus";

export function ProgramDetail({ programId }: { programId: string }) {
  const { data: program, isLoading } = useQuery(orpc.programs.admin.get.queryOptions({ input: { id: programId } }));

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Program not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-3xl tracking-tight">{program.name}</h2>
          <p className="text-muted-foreground">{program.description}</p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="mentors">Mentors</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="space-y-4">
          <ProgramInfo program={program as unknown as Program} />
        </TabsContent>
        <TabsContent value="syllabus" className="space-y-4">
          <ProgramSyllabus programId={program.id} initialSyllabus={program.syllabus} />
        </TabsContent>
        <TabsContent value="mentors" className="space-y-4">
          <ProgramMentors programId={program.id} initialMentors={program.mentors} />
        </TabsContent>
        <TabsContent value="applications" className="space-y-4">
          <ProgramApplications programId={program.id} />
        </TabsContent>
        <TabsContent value="participants" className="space-y-4">
          <ProgramParticipants programId={program.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
