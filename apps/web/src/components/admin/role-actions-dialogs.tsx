"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { PermissionAssigner } from "@/components/admin/permission-assigner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

interface CreateRoleDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateRoleDialog({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateRoleDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [id, setId] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [permissions, setPermissions] = React.useState<string[]>([]);

  const queryClient = useQueryClient();

  const { mutate: createRole, isPending } = useMutation(
    orpc.role.create.mutationOptions({
      onSuccess: () => {
        toast.success("Role created successfully");
        queryClient.invalidateQueries({ queryKey: orpc.role.list.key() });
        onOpenChange(false);
        setId("");
        setName("");
        setDescription("");
        setPermissions([]);
      },
      onError: (error) => {
        toast.error(`Failed to create role: ${error.message}`);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRole({
      id: id || name.toLowerCase().replace(/\s+/g, "-"),
      name,
      description,
      permissions,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>Add a new role to the system.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="id" className="text-right">
                ID
              </Label>
              <Input
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={name.toLowerCase().replace(/\s+/g, "-")}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionAssigner assigned={permissions} onChange={setPermissions} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState(role.name);
  const [description, setDescription] = React.useState(role.description || "");
  const [permissions, setPermissions] = React.useState<string[]>(role.permissions);

  React.useEffect(() => {
    setName(role.name);
    setDescription(role.description || "");
    setPermissions(role.permissions);
  }, [role]);

  const queryClient = useQueryClient();

  const { mutate: updateRole, isPending } = useMutation(
    orpc.role.update.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated successfully");
        queryClient.invalidateQueries({ queryKey: orpc.role.list.key() });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(`Failed to update role: ${error.message}`);
      },
    }),
  );

  const { mutate: autoSaveRole } = useMutation(
    orpc.role.update.mutationOptions({
      onSuccess: () => {
        toast.success("Permissions saved");
        queryClient.invalidateQueries({ queryKey: orpc.role.list.key() });
      },
      onError: (error) => {
        toast.error(`Failed to save permissions: ${error.message}`);
      },
    }),
  );

  const handlePermissionChange = (newPermissions: string[]) => {
    setPermissions(newPermissions);
    autoSaveRole({
      id: role.id,
      name,
      description,
      permissions: newPermissions,
    });
  };

  const handleUpdateDetails = () => {
    updateRole({
      id: role.id,
      name,
      description,
      permissions,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>Make changes to the role here. Permissions are saved automatically.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Button size="sm" onClick={handleUpdateDetails} disabled={isPending || name === role.name}>
                Save
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <div className="col-span-3 flex gap-2">
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button
                size="sm"
                onClick={handleUpdateDetails}
                disabled={isPending || description === (role.description || "")}
              >
                Save
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <PermissionAssigner assigned={permissions} onChange={handlePermissionChange} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteRoleDialogProps {
  role: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteRoleDialog({ role, open, onOpenChange }: DeleteRoleDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: deleteRole, isPending } = useMutation(
    orpc.role.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Role deleted successfully");
        queryClient.invalidateQueries({ queryKey: orpc.role.list.key() });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(`Failed to delete role: ${error.message}`);
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the role "{role.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => deleteRole({ id: role.id })} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
