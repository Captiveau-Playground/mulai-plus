"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, User, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export function BatchMentorsDialog({
  batchId,
  open,
  onOpenChange,
  embedded,
}: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: allMentors, isLoading: loadingMentors } = useQuery(orpc.lms.mentors.list.queryOptions());
  const { data: batchMentorsData, isLoading } = useQuery(
    orpc.programs.admin.batches.getMentors.queryOptions({ input: { batchId } }),
  );
  const batchMentors = (batchMentorsData as any[]) || [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (batchMentors) {
      setSelectedIds(batchMentors.map((m) => m.id));
    }
  }, [batchMentors]);

  const mutation = useMutation(
    orpc.programs.admin.batches.assignMentors.mutationOptions({
      onSuccess: () => {
        toast.success("Mentors updated");
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
        if (!embedded) onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const toggleMentor = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const filteredMentors = (allMentors as any[])?.filter(
    (m) =>
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const content = (
    <div className="space-y-4">
      <Input
        placeholder="Search mentors..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-xl border-gray-200"
      />
      {isLoading || loadingMentors ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredMentors?.map((mentor) => {
            const isSelected = selectedIds.includes(mentor.id);
            return (
              <button
                key={mentor.id}
                type="button"
                onClick={() => toggleMentor(mentor.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                  isSelected
                    ? "border-mentor-teal bg-mentor-teal/5 ring-1 ring-mentor-teal/20"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy/10 to-mentor-teal/10">
                  <User className="h-5 w-5 text-brand-navy/40" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-manrope font-medium text-sm text-text-main">{mentor.name || "Unnamed"}</p>
                  <p className="truncate font-manrope text-text-muted-custom text-xs">{mentor.email}</p>
                </div>
                {isSelected ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-mentor-teal" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-gray-200" />
                )}
              </button>
            );
          })}
          {filteredMentors?.length === 0 && (
            <div className="col-span-2 flex flex-col items-center py-10 text-center">
              <User className="mb-2 h-8 w-8 text-gray-300" />
              <p className="font-manrope text-sm text-text-muted-custom">No mentors found</p>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between border-gray-100 border-t pt-4">
        <p className="font-manrope text-text-muted-custom text-xs">
          {selectedIds.length} mentor{selectedIds.length !== 1 ? "s" : ""} selected
        </p>
        <div className="flex gap-2">
          {!embedded && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full border-gray-200">
              Cancel
            </Button>
          )}
          <Button
            onClick={() => mutation.mutate({ batchId, userIds: selectedIds })}
            disabled={mutation.isPending}
            className="!rounded-full !bg-mentor-teal !text-white hover:!bg-mentor-teal-dark !border-0"
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );

  if (embedded) return <div className="space-y-4">{content}</div>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Batch Mentors</DialogTitle>
          <DialogDescription>Select mentors to assign to this batch.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
