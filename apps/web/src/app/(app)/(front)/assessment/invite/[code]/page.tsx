"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, LogIn } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

export default function TestInvitePage() {
  const params = useParams();
  const code = (params.code as string) ?? "";
  const router = useRouter();
  const _searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [_claimCodeErr, setClaimCodeErr] = useState<string | null>(null);
  // (F07/K6) kode akses manual — jalan keluar saat email akun tidak cocok roster
  const [manual, setManual] = useState("");
  const [autoTried, setAutoTried] = useState(false);

  const claimMutation = useMutation({
    ...orpc.tmb.invite.claim.mutationOptions(),
    onSuccess: (d: any) => {
      // klaim mengembalikan objek terstruktur (bukan throw) — lihat `tmb.invite.claim`
      if (!d?.ok) {
        setClaimCodeErr(d?.error ?? "gagal");
        setClaimError(d?.message ?? "Undangan tidak valid");
        return;
      }
      setClaimCodeErr(null);
      setClaimError("");
      setClaimed(true);
      notify.success(`Selamat datang, ${d.studentName}! 🎉`);
      setTimeout(() => router.push("/dashboard/student/assessment"), 1200);
    },
    onError: (e) => {
      setClaimError(e.message || "Undangan tidak valid");
    },
  });

  /** Kirim kode manual (kode akses personal dari sekolah). */
  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const c = manual.trim();
    if (c.length < 4) {
      notify.warn("Kode akses minimal 4 karakter");
      return;
    }
    claimMutation.mutate({ code: c.toUpperCase() });
  };

  // sudah login → auto claim
  useEffect(() => {
    if (session && !claimMutation.isPending && !claimed && !autoTried) {
      setAutoTried(true);
      claimMutation.mutate({ code });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, claimed, code, autoTried, claimMutation.mutate, claimMutation.isPending]);

  if (isPending || (session && claimMutation.isPending && !claimed)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafc]">
        <Loader2 className="h-8 w-8 animate-spin text-mentor-teal" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#eef2ff] to-white px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-xl"
      >
        {claimed ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-brand-orange text-4xl shadow-lg"
            >
              🎉
            </motion.div>
            <h1 className="mt-4 font-bold font-bricolage text-brand-navy text-xl">Undangan Diterima!</h1>
            <p className="mt-2 font-manrope text-gray-500 text-sm">Mengarahkanmu ke dashboard untuk mengikuti test…</p>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-4xl shadow-xl">
              🧭
            </span>
            <h1 className="mt-4 font-bold font-bricolage text-brand-navy text-xl">Kamu Diundang!</h1>
            <p className="mt-2 font-manrope text-gray-500 text-sm leading-relaxed">
              Sekolahmu mengundang kamu mengikuti <b>Test Minat Bakat by MULAI+</b>. Login dulu untuk mengikuti test di
              dashboard-mu.
            </p>

            {claimError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-left" data-testid="claim-error">
                <p className="font-bold font-manrope text-red-600 text-xs">⚠️ Tidak bisa klaim undangan</p>
                <p className="mt-1 font-manrope text-red-700 text-xs leading-relaxed" data-testid="claim-error-msg">
                  {claimError}
                </p>

                {/* (F07/K6) jalan keluar: kode akses personal dari sekolah */}
                <form onSubmit={submitManual} className="mt-3 space-y-2" data-testid="claim-manual-form">
                  <label htmlFor="claim-code" className="block font-manrope font-semibold text-[11px] text-red-700">
                    Punya kode akses dari sekolah? Masukkan di sini:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="claim-code"
                      data-testid="claim-code-input"
                      value={manual}
                      onChange={(e) => setManual(e.target.value.toUpperCase())}
                      placeholder="Contoh: AB3D7K"
                      maxLength={12}
                      className="h-9 font-bold font-mono tracking-widest"
                    />
                    <Button
                      type="submit"
                      data-testid="claim-code-submit"
                      disabled={claimMutation.isPending}
                      className="h-9 shrink-0 rounded-xl bg-brand-navy px-3 font-bold font-manrope text-white text-xs"
                    >
                      {claimMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pakai"}
                    </Button>
                  </div>
                  <p className="font-manrope text-[10px] text-red-500">
                    Kode diberikan guru BK. Jika belum punya, hubungi sekolahmu — email akunmu (
                    {session?.user?.email ?? "-"}) perlu didaftarkan atau diganti dengan kode akses.
                  </p>
                </form>
              </div>
            )}

            <Button
              onClick={async () => {
                const callback = encodeURIComponent(`/assessment/invite/${code}`);
                // kalau sudah login dengan akun yang salah, tawarkan ganti akun
                if (session) {
                  await authClient.signOut();
                  setClaimed(false);
                  setClaimError("");
                  setAutoTried(false);
                }
                router.push(`/login?callbackUrl=${callback}`);
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-6 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
              data-testid="claim-switch-account"
            >
              <LogIn className="h-5 w-5" /> {session && claimError ? "Ganti akun" : "Login / Daftar"}
            </Button>
            <p className="mt-4 font-manrope text-[11px] text-gray-400">
              Hasil akan dikirim ke sekolahmu sebagai bahan bimbingan karier.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
