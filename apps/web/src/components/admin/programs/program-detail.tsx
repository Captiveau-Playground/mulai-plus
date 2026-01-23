"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";
import { ProgramApplications } from "./program-applications";
import { ProgramBatches } from "./program-batches";
import { ProgramBenefits } from "./program-benefits";
import { ProgramFaqs } from "./program-faqs";
import { type Program, ProgramInfo } from "./program-info";
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

      <Tabs defaultValue="management" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="management">Management</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4">
          <Tabs defaultValue="batches" className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <TabsList>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="batches">Batches</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="info" className="space-y-4">
              <ProgramInfo program={program as unknown as Program} />
            </TabsContent>
            <TabsContent value="batches" className="space-y-4">
              <ProgramBatches programId={program.id} />
            </TabsContent>
            <TabsContent value="applications" className="space-y-4">
              <ProgramApplications programId={program.id} />
            </TabsContent>
            <TabsContent value="participants" className="space-y-4">
              <ProgramParticipants programId={program.id} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Tabs defaultValue="syllabus" className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <TabsList>
                <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
                <TabsTrigger value="benefits">Benefits</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="syllabus" className="space-y-4">
              <ProgramSyllabus programId={program.id} initialSyllabus={program.syllabus} />
            </TabsContent>
            <TabsContent value="benefits" className="space-y-4">
              <ProgramBenefits programId={program.id} />
            </TabsContent>
            <TabsContent value="faqs" className="space-y-4">
              <ProgramFaqs programId={program.id} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
