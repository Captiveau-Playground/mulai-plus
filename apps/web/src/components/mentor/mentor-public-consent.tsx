"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

/**
 * Kartu persetujuan mentor: izinkan profil (kampus, jurusan, pekerjaan, pencapaian,
 * media sosial) tampil di halaman publik /mentors & landing page.
 */
export function MentorPublicConsent() {
  const qc = useQueryClient();
  const { data } = useQuery({
    ...orpc.programs.myProfile.queryOptions(),
    staleTime: 1000 * 30,
  });
  const me: any = data;

  const mut = useMutation({
    ...orpc.programs.consent.mutationOptions(),
    onSuccess: (res: any) => {
      if (res?.ok) {
        notify.success(
          res.isPublic ? "Profilmu akan tampil di landing page" : "Profilmu disembunyikan dari landing page",
        );
        void qc.invalidateQueries({ queryKey: orpc.programs.myProfile.key() });
      } else {
        notify.error("Gagal mengubah persetujuan");
      }
    },
  });

  const isPublic = !!me?.isPublic;
  const hasProfile = !!me?.hasProfile;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold font-bricolage text-brand-navy text-sm">Tampil di halaman publik MULAI+</p>
          <p className="mt-1 font-manrope text-text-muted-custom text-xs">
            {hasProfile
              ? "Profilmu (kampus, jurusan, bidang pekerjaan, pencapaian karier, dan media sosial) bisa ditampilkan di landing page & halaman mentor. Kamu bisa mencabutnya kapan saja."
              : "Data profilmu belum diisi oleh tim. Setelah diisi, kamu bisa memilih untuk tampil di landing page."}
          </p>
          {hasProfile && (
            <ul className="mt-2 space-y-1 font-manrope text-[11px] text-text-muted-custom">
              {[me?.kampus, me?.jurusan, me?.bidangPekerjaan].filter(Boolean).map((v: string) => (
                <li key={v} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {v}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant={isPublic ? "outline" : "default"}
              disabled={!hasProfile || mut.isPending}
              onClick={() => mut.mutate({ isPublic: !isPublic })}
              data-testid="mentor-consent-toggle"
            >
              {mut.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isPublic ? "Sembunyikan profilku" : "Izinkan tampil"}
            </Button>
            <span className="font-manrope text-[11px] text-text-muted-custom">
              Status: {isPublic ? "Tampil" : "Tidak tampil"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
