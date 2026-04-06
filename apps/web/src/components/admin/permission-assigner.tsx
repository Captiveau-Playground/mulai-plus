"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { ScrollArea } from "@/components/ui/scroll-area";
import { orpc } from "@/utils/orpc";

interface PermissionAssignerProps {
  assigned: string[];
  onChange: (assigned: string[]) => void;
}

export function PermissionAssigner({ assigned, onChange }: PermissionAssignerProps) {
  const { data: allPermissions } = useQuery(orpc.permission.list.queryOptions());

  // Local state for the lists
  const [items, setItems] = React.useState<{
    available: string[];
    assigned: string[];
  }>({
    available: [],
    assigned: [],
  });

  const initialized = React.useRef(false);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with props and data
  React.useEffect(() => {
    if (!allPermissions) return;

    const assignedSet = new Set(assigned);
    const available = allPermissions
      .filter((p) => !assignedSet.has(p.id))
      .map((p) => p.id)
      .sort(); // Sort alphabetically for better grouping

    const assignedSorted = [...assigned].sort(); // Sort assigned as well

    // Only update if changes are detected to avoid infinite loops
    setItems((prev) => {
      const isAssignedSame =
        prev.assigned.length === assignedSorted.length &&
        prev.assigned.every((val, index) => val === assignedSorted[index]);

      const isAvailableSame =
        prev.available.length === available.length && prev.available.every((val, index) => val === available[index]);

      if (isAssignedSame && isAvailableSame) {
        // Mark as initialized even if no change needed (e.g. both empty)
        if (!initialized.current) initialized.current = true;
        return prev;
      }

      // Mark as initialized after update
      if (!initialized.current) initialized.current = true;

      return {
        available,
        assigned: assignedSorted,
      };
    });
  }, [allPermissions, assigned]);

  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which container the items are in
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || (over.id as "available" | "assigned");

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      // Remove from active container
      const newActiveItems = activeItems.filter((item) => item !== activeId);

      // Add to over container and sort immediately to maintain grouping
      const newOverItems = [...overItems, activeId].sort();

      return {
        ...prev,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || (overId as "available" | "assigned");

    if (activeContainer && overContainer && activeContainer === overContainer) {
      // Reordering within the same list is disabled to enforce sorted order
      // We just ensure it's sorted just in case
      setItems((prev) => ({
        ...prev,
        [activeContainer]: [...prev[activeContainer]].sort(),
      }));
    }

    setActiveId(null);
  };

  // Sync changes to parent
  React.useEffect(() => {
    // Wait for initialization from props
    if (!initialized.current) return;

    // Only trigger onChange if dragging is finished and data is different
    // Use JSON stringify for simple deep comparison to avoid reference issues
    if (!activeId && JSON.stringify(items.assigned) !== JSON.stringify(assigned)) {
      onChange(items.assigned);
    }
  }, [items.assigned, activeId, onChange, assigned]);

  const findContainer = (id: string) => {
    if (id in items) {
      return id as "available" | "assigned";
    }
    return Object.keys(items).find((key) => items[key as "available" | "assigned"].includes(id)) as
      | "available"
      | "assigned"
      | undefined;
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="grid h-fit grid-cols-1 gap-4 md:grid-cols-2">
        <DroppableContainer id="available" title="Available Permissions" items={items.available} />
        <DroppableContainer id="assigned" title="Assigned Permissions" items={items.assigned} />
      </div>
      {mounted && createPortal(<DragOverlay>{activeId ? <Item id={activeId} /> : null}</DragOverlay>, document.body)}
    </DndContext>
  );
}

function DroppableContainer({ id, title, items }: { id: "available" | "assigned"; title: string; items: string[] }) {
  const { setNodeRef } = useSortable({
    id,
    data: {
      type: "container",
      children: items,
    },
  });

  return (
    <div className="flex h-full flex-col rounded-md border bg-muted/50">
      <div className="rounded-t-md border-b bg-background p-2 font-semibold text-sm">
        {title} <span className="text-muted-foreground text-xs">({items.length})</span>
      </div>
      <ScrollArea className="flex-1 p-2">
        <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="flex min-h-[100px] flex-col gap-2">
            {Object.entries(
              items.reduce(
                (acc, item) => {
                  // Group by prefix (e.g., "user" from "user.create")
                  // Supports separators: . : -
                  const prefix = item.split(/[.:-]/)[0] || "other";
                  if (!acc[prefix]) acc[prefix] = [];
                  acc[prefix].push(item);
                  return acc;
                },
                {} as Record<string, string[]>,
              ),
            ).map(([group, groupItems]) => (
              <div key={group} className="flex flex-col gap-2">
                <div className="px-1 pt-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {group}
                </div>
                {groupItems.map((item) => (
                  <SortableItem key={item} id={item} />
                ))}
              </div>
            ))}
            {items.length === 0 && (
              <div className="flex h-full items-center justify-center p-4 text-muted-foreground text-sm">No items</div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Item id={id} />
    </div>
  );
}

function Item({ id }: { id: string }) {
  return (
    <div className="flex cursor-grab items-center gap-2 rounded-md border bg-card p-2 text-sm shadow-sm hover:border-primary active:cursor-grabbing">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate">{id}</span>
    </div>
  );
}
