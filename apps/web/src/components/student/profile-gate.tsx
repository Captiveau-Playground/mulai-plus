"use client";

import { env } from "@mulai-plus/env/web";
import { useMutation } from "@tanstack/react-query";
import { CircleAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { mapLevel, SchoolSuggestions, useSchoolSearch } from "@/components/student/school-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

const API = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

export const REQUIRED_PROFILE = ["school", "educationLevel"] as const;

export function useProfileGate() {
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ school?: string; educationLevel?: string } | null>(null);
  const [_tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`${API}/ai/context`, { credentials: "include" });
        const d = await r.json();
        if (cancel) return;
        const p = d?.profile ?? null;
        setProfile(p);
        const m = REQUIRED_PROFILE.filter((k) => !(p?.[k] && String(p[k]).trim()));
        setMissing(m);
        setLoading(false);
      } catch {
        if (!cancel) setLoading(false); // fail-open: jangan blokir kalau service bermasalah
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return { loading, ready: !loading && missing.length === 0, missing, profile, refresh };
}

export default function ProfileGate() {
  const { profile, refresh } = useProfileGate();
  const sch = useSchoolSearch();
  const [school, setSchool] = useState("");
  const [level, setLevel] = useState("");
  const updateProfile = useMutation(
    orpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        notify.success("Profil berhasil dilengkapi — sekarang kamu lanjut 🎉");
        refresh();
      },
      onError: (e: any) => notify.error(e?.message || "Gagal menyimpan"),
    }),
  );

  const save = () => {
    if (!school.trim() || !level) {
      notify.error("Isi sekolah & jenjang dulu yaa");
      return;
    }
    updateProfile.mutate({ school: school.trim(), educationLevel: level } as any);
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-orange/10">
          <CircleAlert className="size-7 text-brand-orange" />
        </div>
        <h2 className="mt-4 font-bold font-bricolage text-2xl text-brand-navy">Lengkapi profil dulu, yaa</h2>
        <p className="mt-2 font-manrope text-muted-foreground text-sm leading-relaxed">
          Tes Minat &amp; Bakat dan Asisten AI (Mul.ai) memakai data sekolah &amp; jenjang kamu untuk hasil &amp;
          rekomendasi yang akurat. Cuma butuh 1 menit.
        </p>

        {profile?.school ? (
          <p className="mt-3 font-manrope text-emerald-600 text-xs">✓ Sekolah terisi: {profile.school}</p>
        ) : null}

        <div className="mt-6 space-y-3 text-left">
          <div>
            <label htmlFor="pg-school" className="mb-1 block font-manrope font-medium text-text-main text-xs">
              Sekolah / Instansi
            </label>
            <div className="relative">
              <Input
                id="pg-school"
                value={sch.q}
                placeholder="ketik nama sekolah (min. 3 huruf)"
                onChange={(e) => {
                  setSchool(e.target.value);
                  sch.setQ(e.target.value);
                  sch.setOpen(true);
                }}
                onFocus={() => sch.setOpen(true)}
                onBlur={() => setTimeout(() => sch.setOpen(false), 200)}
                className="bg-card font-manrope"
              />
              <SchoolSuggestions
                search={sch}
                onPick={(item) => {
                  setSchool(item.nama);
                  setLevel(mapLevel(item.jenjang));
                  sch.setQ("");
                  sch.setOpen(false);
                }}
              />
            </div>
            <p className="mt-1 font-manrope text-[10px] text-muted-foreground">
              Ada saran otomatis nama sekolah di halaman Pengaturan.
            </p>
          </div>
          <div>
            <label htmlFor="pg-level" className="mb-1 block font-manrope font-medium text-text-main text-xs">
              Jenjang saat ini
            </label>
            <Select
              value={level}
              onValueChange={(v) => {
                if (v != null) setLevel(v);
              }}
            >
              <SelectTrigger id="pg-level" className="bg-card">
                <SelectValue placeholder="Pilih jenjang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMA">SMA</SelectItem>
                <SelectItem value="SMK">SMK</SelectItem>
                <SelectItem value="Universitas">Universitas</SelectItem>
                <SelectItem value="Fresh Graduate">Fresh Graduate</SelectItem>
                <SelectItem value="Umum">Umum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Link
            href="/dashboard/student/settings"
            className="font-manrope text-muted-foreground text-xs underline underline-offset-2 hover:text-brand-navy"
          >
            Buka Pengaturan lengkap →
          </Link>
          <Button
            onClick={() => void save()}
            disabled={updateProfile.isPending}
            className="bg-brand-navy px-5 text-white hover:bg-brand-navy-light"
          >
            {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Simpan & Lanjut"}
          </Button>
        </div>
      </div>
    </div>
  );
}
