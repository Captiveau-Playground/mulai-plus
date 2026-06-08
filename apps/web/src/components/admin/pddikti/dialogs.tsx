"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orpc } from "@/utils/orpc";
import type { University } from "./universities-table";

const api = orpc as any;

// ─── Create Dialog ──────────────────────────

export function CreateUniversityDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    idSp: "",
    code: "",
    name: "",
    shortName: "",
    type: "",
    status: "",
    province: "",
    regency: "",
    accreditation: "",
  });

  useEffect(() => {
    if (open)
      setForm({
        idSp: "",
        code: "",
        name: "",
        shortName: "",
        type: "",
        status: "",
        province: "",
        regency: "",
        accreditation: "",
      });
  }, [open]);

  const mutation = useMutation({
    mutationFn: (input: any) => api.pddikti.createUniversity(input),
    onSuccess: () => {
      toast.success("University created");
      queryClient.invalidateQueries({ queryKey: ["pddikti"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  const handleSubmit = () => {
    if (!form.idSp || !form.name) {
      toast.error("ID and Name required");
      return;
    }
    mutation.mutate({
      input: {
        idSp: form.idSp,
        code: form.code || undefined,
        name: form.name,
        shortName: form.shortName || undefined,
        type: form.type || undefined,
        status: form.status || undefined,
        province: form.province || undefined,
        regency: form.regency || undefined,
        accreditation: form.accreditation || undefined,
      },
    });
  };

  const f = (field: string) => (val: string | null) => setForm((p) => ({ ...p, [field]: val ?? "" }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add University</DialogTitle>
          <DialogDescription>Create a new university entry.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idSp">ID (id_sp) *</Label>
              <Input
                id="idSp"
                value={form.idSp}
                onChange={(e) => f("idSp")(e.target.value)}
                placeholder="MzgzMjUy..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={form.code} onChange={(e) => f("code")(e.target.value)} placeholder="001001" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => f("name")(e.target.value)}
              placeholder="Universitas Indonesia"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name</Label>
              <Input
                id="shortName"
                value={form.shortName}
                onChange={(e) => f("shortName")(e.target.value)}
                placeholder="UI"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={f("type")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Negeri">Negeri</SelectItem>
                  <SelectItem value="Swasta">Swasta</SelectItem>
                  <SelectItem value="Agama">Agama</SelectItem>
                  <SelectItem value="Kedinasan">Kedinasan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Province</Label>
              <Input value={form.province} onChange={(e) => f("province")(e.target.value)} placeholder="DKI Jakarta" />
            </div>
            <div className="space-y-2">
              <Label>Regency</Label>
              <Input value={form.regency} onChange={(e) => f("regency")(e.target.value)} placeholder="Kota Depok" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Accreditation</Label>
              <Select value={form.accreditation} onValueChange={f("accreditation")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unggul">Unggul</SelectItem>
                  <SelectItem value="Baik Sekali">Baik Sekali</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Terakreditasi">Terakreditasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={f("status")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Alih Bentuk">Alih Bentuk</SelectItem>
                  <SelectItem value="Tutup">Tutup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ─────────────────────────────

export function EditUniversityDialog({
  university,
  open,
  onOpenChange,
  onSuccess,
}: {
  university: University | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    type: "",
    status: "",
    province: "",
    regency: "",
    accreditation: "",
  });

  useEffect(() => {
    if (university)
      setForm({
        name: university.name ?? "",
        shortName: university.shortName ?? "",
        type: university.type ?? "",
        status: university.status ?? "",
        province: university.province ?? "",
        regency: university.regency ?? "",
        accreditation: university.accreditation ?? "",
      });
  }, [university]);

  const mutation = useMutation({
    mutationFn: (input: any) => api.pddikti.updateUniversity(input),
    onSuccess: () => {
      toast.success("University updated");
      queryClient.invalidateQueries({ queryKey: ["pddikti"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  const handleSubmit = () => {
    if (!university) return;
    mutation.mutate({
      input: {
        idSp: university.idSp,
        name: form.name || undefined,
        shortName: form.shortName || undefined,
        type: form.type || undefined,
        status: form.status || undefined,
        province: form.province || undefined,
        regency: form.regency || undefined,
        accreditation: form.accreditation || undefined,
      },
    });
  };

  const f = (field: string) => (val: string | null) => setForm((p) => ({ ...p, [field]: val ?? "" }));
  if (!university) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit University</DialogTitle>
          <DialogDescription>Update details for {university.name}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>ID</Label>
            <Input value={university.idSp} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => f("name")(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Short Name</Label>
              <Input value={form.shortName} onChange={(e) => f("shortName")(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={f("type")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Negeri">Negeri</SelectItem>
                  <SelectItem value="Swasta">Swasta</SelectItem>
                  <SelectItem value="Agama">Agama</SelectItem>
                  <SelectItem value="Kedinasan">Kedinasan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Province</Label>
              <Input value={form.province} onChange={(e) => f("province")(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Regency</Label>
              <Input value={form.regency} onChange={(e) => f("regency")(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Accreditation</Label>
              <Select value={form.accreditation} onValueChange={f("accreditation")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unggul">Unggul</SelectItem>
                  <SelectItem value="Baik Sekali">Baik Sekali</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Terakreditasi">Terakreditasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={f("status")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Alih Bentuk">Alih Bentuk</SelectItem>
                  <SelectItem value="Tutup">Tutup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Dialog ───────────────────────────

export function DeleteUniversityDialog({
  university,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  university: University | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (u: University) => void;
  isLoading: boolean;
}) {
  if (!university) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete University</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{university.name}</strong>? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(university)} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
