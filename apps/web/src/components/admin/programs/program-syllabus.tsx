"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookText, ChevronDown, Loader2, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type SyllabusItem = {
  id?: string;
  week: number;
  title: string;
  outcome?: string | null;
  tujuan?: string | null;
  kegiatanUtama?: string | null;
  fokusUtama?: string | null;
  output?: string | null;
};

export function ProgramSyllabus({
  programId,
  initialSyllabus,
}: {
  programId: string;
  initialSyllabus: SyllabusItem[];
}) {
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>(initialSyllabus || []);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
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
        id: item.id,
        week: item.week,
        title: item.title,
        outcome: item.outcome || undefined,
        tujuan: item.tujuan || undefined,
        kegiatanUtama: item.kegiatanUtama || undefined,
        fokusUtama: item.fokusUtama || undefined,
        output: item.output || undefined,
      })),
    });
  };

  const toggleDetail = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="mentor-card">
      <CardHeader className="bg-white">
        <div className="flex items-center gap-3">
          <div className="icon-box-light">
            <BookText className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <CardTitle className="font-bricolage text-lg text-text-main">Syllabus</CardTitle>
            <CardDescription className="font-manrope text-text-muted-custom">
              Manage the weekly syllabus for this program.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 bg-white">
        {syllabus.map((item, index) => (
          <div key={index} className="rounded-xl border border-gray-200/80 bg-white shadow-sm">
            {/* Always visible: week number + title + outcome */}
            <div className="flex items-start gap-4 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mentor-teal font-bold text-sm text-white">
                {item.week}
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid gap-1.5">
                  <Label>Title</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => handleChange(index, "title", e.target.value)}
                    placeholder="Week Title"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Outcome</Label>
                  <Input
                    value={item.outcome || ""}
                    onChange={(e) => handleChange(index, "outcome", e.target.value)}
                    placeholder="Learning Outcome"
                  />
                </div>

                {/* Collapsible Detail Section */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleDetail(index)}
                    className="flex cursor-pointer items-center gap-2 font-medium text-mentor-teal text-sm hover:text-mentor-teal/80"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        expandedIndex === index && "rotate-180",
                      )}
                    />
                    Detail
                  </button>

                  {expandedIndex === index && (
                    <div className="mt-3 space-y-3 border-gray-100 border-t pt-3">
                      <div className="grid gap-1.5">
                        <Label>Tujuan</Label>
                        <Textarea
                          value={item.tujuan || ""}
                          onChange={(e) => handleChange(index, "tujuan", e.target.value)}
                          placeholder="Tujuan pembelajaran minggu ini"
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Kegiatan Utama</Label>
                        <Textarea
                          value={item.kegiatanUtama || ""}
                          onChange={(e) => handleChange(index, "kegiatanUtama", e.target.value)}
                          placeholder="1. ...\n2. ...\n3. ..."
                          rows={4}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Fokus Utama</Label>
                        <Textarea
                          value={item.fokusUtama || ""}
                          onChange={(e) => handleChange(index, "fokusUtama", e.target.value)}
                          placeholder="1. ...\n2. ...\n3. ..."
                          rows={4}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Output</Label>
                        <Textarea
                          value={item.output || ""}
                          onChange={(e) => handleChange(index, "output", e.target.value)}
                          placeholder="Output yang dihasilkan"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveWeek(index)} className="mt-1 shrink-0">
                <Trash className="h-4 w-4 text-brand-red" />
              </Button>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="rounded-full" onClick={handleAddWeek}>
            <Plus className="mr-2 h-4 w-4" /> Add Week
          </Button>
          <Button
            className="!bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !rounded-full !border-0"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Syllabus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
