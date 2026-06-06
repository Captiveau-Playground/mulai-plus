"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

type TemplateItem = {
  id?: string;
  title: string;
  order: number;
};

export function BatchReportTemplateDialog({
  batch,
  open,
  onOpenChange,
  embedded,
}: {
  batch: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: templateItems, isLoading } = useQuery({
    ...orpc.programs.admin.batchReportTemplate.list.queryOptions({
      input: { batchId: batch?.id ?? "" },
    }),
    enabled: !!batch?.id && (embedded || open),
  });

  if (!initialized && templateItems && (embedded || open)) {
    if (templateItems.length > 0) {
      setItems(templateItems.map((i: any) => ({ id: i.id, title: i.title, order: i.order })));
    } else {
      setItems([
        { title: "", order: 1 },
        { title: "", order: 2 },
        { title: "", order: 3 },
        { title: "", order: 4 },
        { title: "", order: 5 },
      ]);
    }
    setInitialized(true);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setInitialized(false);
      setItems([]);
    }
    onOpenChange(open);
  };

  const updateMutation = useMutation({
    ...orpc.programs.admin.batchReportTemplate.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Report template saved!");
      queryClient.invalidateQueries({
        queryKey: orpc.programs.admin.batchReportTemplate.list.key({
          input: { batchId: batch?.id ?? "" },
        }),
      });
      if (!embedded) handleOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Failed to save template"),
  });

  const handleChange = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], title: value };
      return next;
    });
  };

  const handleAdd = () => {
    setItems((prev) => [...prev, { title: "", order: prev.length + 1 }]);
  };

  const handleRemove = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((item, i) => ({ ...item, order: i + 1 }));
    });
  };

  const handleSave = () => {
    if (!batch) return;
    const validItems = items.filter((i) => i.title.trim());
    if (validItems.length === 0) {
      toast.error("At least one item with a title is required");
      return;
    }
    updateMutation.mutate({
      batchId: batch.id,
      items: validItems.map((item, i) => ({
        id: item.id,
        title: item.title,
        order: i + 1,
      })),
    });
  };

  const content = (
    <>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-white text-xs">
                {i + 1}
              </span>
              <div className="flex-1">
                <Label className="font-manrope font-medium text-text-muted-custom text-xs">Title</Label>
                <Input
                  value={item.title}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="e.g. Percaya Diri, Komunikasi, dll"
                  className="mt-1 rounded-xl border-gray-200 font-manrope text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(i)}
                className="mt-5 shrink-0"
                disabled={items.length <= 1}
              >
                <Trash className="h-4 w-4 text-brand-red" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAdd} className="rounded-full text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
          </Button>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        {!embedded && (
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-xl border-gray-200 font-manrope text-sm"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="rounded-xl bg-brand-navy font-manrope text-sm text-white shadow-xs hover:bg-brand-navy/90"
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Template
        </Button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-bricolage text-brand-navy text-xl">Report Template</DialogTitle>
          <DialogDescription className="font-manrope">
            {batch?.name} — Set the assessment titles that mentors will fill descriptions for.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
