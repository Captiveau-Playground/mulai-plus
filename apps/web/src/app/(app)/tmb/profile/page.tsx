"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

export default function TmbProfilePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    ...orpc.tmb.profile.get.queryOptions({ input: {} }),
  });

  const [gender, setGender] = useState("");
  const [education, setEducation] = useState("");
  const [school, setSchool] = useState("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    if (data?.profile) {
      setGender(data.profile.gender ?? "");
      setEducation(data.profile.educationLevel ?? "");
      setSchool(data.profile.schoolName ?? "");
      setBirthDate(data.profile.birthDate ?? "");
    }
  }, [data]);

  const saveMutation = useMutation({
    ...orpc.tmb.profile.save.mutationOptions(),
    onSuccess: () => {
      toast.success("Profil disimpan!");
      queryClient.invalidateQueries({ queryKey: orpc.tmb.profile.get.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal menyimpan profil"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold font-bricolage text-gray-900 text-xl">Profil Kamu</h1>
        <p className="mt-1 font-manrope text-gray-500 text-sm">Lengkapi biodata agar rekomendasi lebih akurat.</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <Label className="font-manrope font-semibold text-gray-600 text-xs">Jenis Kelamin</Label>
          <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200 bg-gray-50">
              <SelectValue placeholder="Pilih jenis kelamin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Laki-laki">Laki-laki</SelectItem>
              <SelectItem value="Perempuan">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-manrope font-semibold text-gray-600 text-xs">Tanggal Lahir</Label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-1.5 rounded-xl border-gray-200 bg-gray-50"
          />
        </div>

        <div>
          <Label className="font-manrope font-semibold text-gray-600 text-xs">Status Pendidikan</Label>
          <Select value={education} onValueChange={(v) => setEducation(v ?? "")}>
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200 bg-gray-50">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SMP">SMP</SelectItem>
              <SelectItem value="SMA">SMA</SelectItem>
              <SelectItem value="SMK">SMK</SelectItem>
              <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
              <SelectItem value="Fresh Graduate">Fresh Graduate</SelectItem>
              <SelectItem value="Umum">Umum</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Sekolah / Instansi</Label>
          <Input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="misal: SMAN 1 Bandung"
            className="mt-1.5 rounded-xl border-gray-200 bg-gray-50"
          />
        </div>

        <Button
          onClick={() =>
            saveMutation.mutate({
              gender: gender || undefined,
              birthDate: birthDate || undefined,
              educationLevel: education || undefined,
              schoolName: school || undefined,
            })
          }
          disabled={saveMutation.isPending}
          className="w-full rounded-2xl bg-brand-navy py-6 font-bold font-bricolage text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Simpan Profil"}
        </Button>
      </div>
    </div>
  );
}
