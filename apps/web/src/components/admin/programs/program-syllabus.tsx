"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

export function ProgramSyllabus({
  programId,
  initialSyllabus,
}: {
  programId: string;
  initialSyllabus: {
    id?: string;
    week: number;
    title: string;
    outcome?: string | null;
  }[];
}) {
  const [syllabus, setSyllabus] = useState<
    {
      id?: string;
      week: number;
      title: string;
      outcome?: string | null;
    }[]
  >(initialSyllabus || []);
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    orpc.programs.admin.syllabus.update.mutationOptions({
      onSuccess: () => {
        toast.success("Syllabus saved");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.get.key({ input: { id: programId } }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleAddWeek = () => {
    setSyllabus([
      ...syllabus,
      {
        week: syllabus.length + 1,
        title: "",
        outcome: "",
      },
    ]);
  };

  const handleRemoveWeek = (index: number) => {
    const newSyllabus = [...syllabus];
    newSyllabus.splice(index, 1);
    // Re-index weeks
    newSyllabus.forEach((item, idx) => {
      item.week = idx + 1;
    });
    setSyllabus(newSyllabus);
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newSyllabus = [...syllabus];
    newSyllabus[index] = { ...newSyllabus[index], [field]: value };
    setSyllabus(newSyllabus);
  };

  const handleSave = () => {
    updateMutation.mutate({
      programId,
      items: syllabus.map((item) => ({
        id: item.id, // Include ID if it exists (for updates)
        week: item.week,
        title: item.title,
        outcome: item.outcome || undefined,
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Syllabus</CardTitle>
        <CardDescription>Manage the weekly syllabus for this program.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {syllabus.map((item, index) => (
          <div key={index} className="flex items-start gap-4 rounded-lg border p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              {item.week}
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  value={item.title}
                  onChange={(e) => handleChange(index, "title", e.target.value)}
                  placeholder="Week Title"
                />
              </div>
              <div className="grid gap-2">
                <Label>Outcome</Label>
                <Input
                  value={item.outcome || ""}
                  onChange={(e) => handleChange(index, "outcome", e.target.value)}
                  placeholder="Learning Outcome"
                />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleRemoveWeek(index)}>
              <Trash className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}

        <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={handleAddWeek}>
            <Plus className="mr-2 h-4 w-4" /> Add Week
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Syllabus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
