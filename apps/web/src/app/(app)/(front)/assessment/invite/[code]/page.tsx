"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, LogIn } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function TestInvitePage() {
  const params = useParams();
  const code = (params.code as string) ?? "";
  const router = useRouter();
  const _searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState("");

  const claimMutation = useMutation({
    ...orpc.tmb.invite.claim.mutationOptions(),
    onSuccess: (d) => {
      setClaimed(true);
      toast.success(`Selamat datang, ${d.studentName}! 🎉`);
      setTimeout(() => router.push("/dashboard/student/assessment"), 1200);
    },
    onError: (e) => {
      setClaimError(e.message || "Undangan tidak valid");
    },
  });

  // sudah login → auto claim
  useEffect(() => {
    if (session && !claimMutation.isPending && !claimed) {
      claimMutation.mutate({ code });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, claimed, code, claimMutation.mutate, claimMutation.isPending]);

  if (isPending || (session && !claimMutation.isSuccess && !claimMutation.isError && !claimed)) {
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
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-left">
                <p className="font-bold font-manrope text-red-600 text-xs">⚠️ Tidak bisa klaim undangan</p>
                <p className="mt-1 font-manrope text-red-700 text-xs leading-relaxed">{claimError}</p>
                <p className="mt-2 font-manrope text-[11px] text-red-500">
                  Pastikan kamu login dengan email yang sama dengan yang didaftarkan sekolah. Hubungi sekolah jika
                  email-mu berbeda.
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                const callback = encodeURIComponent(`/assessment/invite/${code}`);
                router.push(`/login?callbackUrl=${callback}`);
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-6 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <LogIn className="h-5 w-5" /> Login / Daftar
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
