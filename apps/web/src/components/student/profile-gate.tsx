"use client";

import { env } from "@mulai-plus/env/web";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mapLevel, SchoolSuggestions, useSchoolSearch } from "@/components/student/school-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

const API = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

const SOCIALS = [
  { key: "instagram", label: "Instagram", ph: "@username" },
  { key: "tiktok", label: "TikTok", ph: "@username" },
  { key: "threads", label: "Threads", ph: "@username" },
  { key: "linkedin", label: "LinkedIn", ph: "linkedin.com/in/…" },
] as const;

export function useProfileGate() {
  const [loading, setLoading] = useState(true);
  const [schoolLevel, setSchoolLevel] = useState<{ school?: string; level?: string } | null>(null);
  const userProfile = useQuery(orpc.user.getProfile.queryOptions());
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`${API}/ai/context`, { credentials: "include" });
        const d = await r.json();
        if (cancel) return;
        setSchoolLevel(d?.profile ?? null);
      } catch {
        /* scheme */
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return useMemo(() => {
    const schoolOk = !!(schoolLevel?.school && String(schoolLevel.school).trim());
    const levelOk = !!(schoolLevel?.level && String(schoolLevel.level).trim());
    const sm = userProfile.data?.socialMedia ?? {};
    const socialOk = !!sm.instagram || !!sm.tiktok || !!sm.threads || !!sm.linkedin;
    const missingReq = !schoolOk || !levelOk;
    return {
      loading,
      ready: !loading && !missingReq && socialOk,
      missingReq,
      socialMissing: !socialOk,
      schoolLevel,
      userProfile: userProfile.data ?? null,
      refresh: () => {
        setTick((t) => t + 1);
        void userProfile.refetch();
      },
    };
  }, [loading, schoolLevel, userProfile.data, userProfile.refetch]);
}

export default function ProfileGate() {
  const gate = useProfileGate();
  const sch = useSchoolSearch();

  const [school, setSchool] = useState("");
  const [level, setLevel] = useState("");
  const [social, setSocial] = useState<Record<string, string>>({});
  useEffect(() => {
    if (gate.userProfile || gate.schoolLevel) {
      setSchool(gate.schoolLevel?.school || gate.userProfile?.school || "");
      setLevel(gate.schoolLevel?.level || gate.userProfile?.educationLevel || "");
      const sm = gate.userProfile?.socialMedia ?? {};
      setSocial({
        instagram: sm.instagram || "",
        tiktok: sm.tiktok || "",
        threads: sm.threads || "",
        linkedin: sm.linkedin || "",
      });
    }
  }, [gate.userProfile, gate.schoolLevel]);

  const updateProfile = useMutation(
    orpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        notify.success("Profil tersimpan — lanjut ke langkah berikutnya 🎉");
        gate.refresh();
        setTimeout(() => window.location.reload(), 600);
      },
      onError: (e: any) => notify.error(e?.message || "Gagal menyimpan"),
    }),
  );

  const phase = gate.missingReq ? "a" : gate.socialMissing ? "b" : null;
  if (gate.loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand-orange" />
      </div>
    );
  }

  const saveA = () => {
    if (!school.trim() || !level) {
      notify.error("Isi sekolah & jenjang dulu yaa");
      return;
    }
    updateProfile.mutate({ school: school.trim(), educationLevel: level } as any);
  };

  const saveB = () => {
    const hasAny = SOCIALS.some((s) => (social[s.key] || "").trim());
    if (!hasAny) {
      notify.error("Minimal isi 1 sosial media");
      return;
    }
    updateProfile.mutate({ socialMedia: social } as any);
  };

  const heading =
    phase === "a"
      ? {
          title: "Langkah 1 dari 2 — Sekolah & Jenjang",
          desc: "Data ini dipakai Tes Minat & Bakat dan Mul.ai untuk rekomendasi yang akurat.",
        }
      : {
          title: "Langkah 2 dari 2 — Sosial Media",
          desc: "Wajib minimal 1 platform (untuk konseling & komunitas MULAI+).",
        };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-orange/10">
          <CircleAlert className="size-7 text-brand-orange" />
        </div>
        <h2 className="mt-4 font-bold font-bricolage text-2xl text-brand-navy">{heading.title}</h2>
        <p className="mt-2 font-manrope text-muted-foreground text-sm leading-relaxed">{heading.desc}</p>

        {phase === "a" ? (
          <>
            <div className="mt-6 space-y-3 text-left">
              <div>
                <label htmlFor="pg-school" className="mb-1 block font-manrope font-medium text-text-main text-xs">
                  Sekolah / Instansi <span className="text-brand-orange">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="pg-school"
                    value={school}
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
                      sch.setQ(item.nama);
                      sch.setOpen(false);
                    }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pg-level" className="mb-1 block font-manrope font-medium text-text-main text-xs">
                  Jenjang saat ini <span className="text-brand-orange">*</span>
                </label>
                <Select
                  value={level}
                  onValueChange={(v) => {
                    if (v != null) setLevel(v);
                  }}
                >
                  <SelectTrigger id="pg-level" className="bg-card">
                    <SelectValue placeholder="Pilih jenjang (otomatis dari sekolah bila dipilih)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMP">SMP/MTS</SelectItem>
                    <SelectItem value="SMA">SMA/MA</SelectItem>
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
                onClick={() => void saveA()}
                disabled={updateProfile.isPending}
                className="bg-brand-navy px-5 text-white hover:bg-brand-navy-light"
              >
                {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Simpan & Lanjut →"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 space-y-2.5 text-left">
              {SOCIALS.map((s) => (
                <div key={s.key}>
                  <label
                    htmlFor={`pg-sm-${s.key}`}
                    className="mb-1 block font-manrope font-medium text-text-main text-xs"
                  >
                    {s.label}
                  </label>
                  <Input
                    id={`pg-sm-${s.key}`}
                    value={social[s.key] || ""}
                    placeholder={s.ph}
                    onChange={(e) => setSocial((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    className="bg-card font-manrope"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-2">
              <Link
                href="/dashboard/student/settings"
                className="font-manrope text-muted-foreground text-xs underline underline-offset-2 hover:text-brand-navy"
              >
                Buka Pengaturan lengkap →
              </Link>
              <Button
                onClick={() => void saveB()}
                disabled={updateProfile.isPending}
                className="bg-brand-navy px-5 text-white hover:bg-brand-navy-light"
              >
                {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Selesai 🎉"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
