"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { orpc } from "@/utils/orpc";

export function BatchMentorsDialog({
  batchId,
  open,
  onOpenChange,
}: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const _queryClient = useQueryClient();
  const { data: allMentors } = useQuery(orpc.lms.mentors.list.queryOptions());
  const { data: batchMentors, isLoading } = useQuery(
    orpc.programs.admin.batches.getMentors.queryOptions({ input: { batchId } }),
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (batchMentors) {
      setSelectedIds(batchMentors.map((m) => m.id));
    }
  }, [batchMentors]);

  const mutation = useMutation(
    orpc.programs.admin.batches.assignMentors.mutationOptions({
      onSuccess: () => {
        toast.success("Mentors updated");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleSave = () => {
    mutation.mutate({ batchId, userIds: selectedIds });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Batch Mentors</DialogTitle>
          <DialogDescription>Select mentors for this batch.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {allMentors?.map((mentor) => (
                  <div key={mentor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={mentor.id}
                      checked={selectedIds.includes(mentor.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds([...selectedIds, mentor.id]);
                        else setSelectedIds(selectedIds.filter((id) => id !== mentor.id));
                      }}
                    />
                    <Label htmlFor={mentor.id} className="flex cursor-pointer flex-col">
                      <span className="font-medium">{mentor.name}</span>
                      <span className="text-muted-foreground text-xs">{mentor.email}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
