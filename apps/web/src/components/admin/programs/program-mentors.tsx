"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { orpc } from "@/utils/orpc";

export function ProgramMentors({
  programId,
  initialMentors,
}: {
  programId: string;
  initialMentors: { userId: string }[];
}) {
  const queryClient = useQueryClient();
  // Fetch all users or just users with mentor role?
  // For now, let's fetch all users and filter? Or ideally we have a list of mentors endpoint.
  // We can use `orpc.lms.mentors.list` if it exists (saw it in search results).
  // Assuming `orpc.lms.mentors.list` returns users who are mentors.
  // Actually, I should probably use `orpc.role.list` to find mentor role id, then list users?
  // Or just list all users for now.

  // Wait, I saw `orpc.lms.mentors.list` in `course-settings.tsx`.
  const { data: allMentors, isLoading } = useQuery(orpc.lms.mentors.list.queryOptions());

  const [selectedMentors, setSelectedMentors] = useState<string[]>(initialMentors.map((m) => m.userId));

  const assignMutation = useMutation(
    orpc.programs.admin.mentors.assign.mutationOptions({
      onSuccess: () => {
        toast.success("Mentors assigned");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.get.key({ input: { id: programId } }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleToggle = (userId: string) => {
    setSelectedMentors((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleSave = () => {
    assignMutation.mutate({
      programId,
      userIds: selectedMentors,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentors</CardTitle>
        <CardDescription>Assign mentors to this program.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-4">
              {allMentors?.map((mentor: { id: string; name: string; email: string }) => (
                <div key={mentor.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={mentor.id}
                    checked={selectedMentors.includes(mentor.id)}
                    onCheckedChange={() => handleToggle(mentor.id)}
                  />
                  <Label htmlFor={mentor.id} className="flex cursor-pointer flex-col">
                    <span className="font-medium">{mentor.name}</span>
                    <span className="text-muted-foreground text-xs">{mentor.email}</span>
                  </Label>
                </div>
              ))}
              {(!allMentors || allMentors.length === 0) && (
                <p className="text-muted-foreground text-sm">No mentors found.</p>
              )}
            </div>
          </ScrollArea>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Assignments
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
