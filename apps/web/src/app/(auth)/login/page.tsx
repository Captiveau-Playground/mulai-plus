"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Loader from "@/components/loader";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");
  const { data: session, isPending } = authClient.useSession();
  const [showSignIn, setShowSignIn] = useState(true);

  useEffect(() => {
    if (error) {
      notify.error(`Authentication failed: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    if (!isPending && session?.user) {
      // Priority: callbackUrl from URL > role-based
      // localStorage redirect ditangani oleh RedirectHandler di root layout
      if (callbackUrl) {
        window.location.href = decodeURIComponent(callbackUrl);
        return;
      }

      const role = session.user.role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "mentor") {
        router.push("/mentor");
      } else if (role === "program_manager") {
        router.push("/program-manager/programs");
      } else {
        router.push("/dashboard/student");
      }
    }
  }, [session, isPending, router, callbackUrl]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light">
        <Loader />
      </div>
    );
  }

  if (session?.user) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg-light">
      {/* Left Side - Branding (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-navy p-12 lg:flex">
        {/* pola grid halus */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* orbs */}
        <motion.div
          className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-brand-orange/20 blur-3xl"
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute bottom-24 -left-16 h-64 w-64 rounded-full bg-[#7b5cff]/20 blur-3xl"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />

        {/* Logo */}
        <Link href="/" className="relative z-10 inline-block">
          <Image src="/light-type-logo.svg" alt="Mulai Plus" width={160} height={48} className="cursor-pointer" />
        </Link>

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/40 bg-brand-orange/15 px-3.5 py-1.5 font-manrope font-medium text-[11px] text-brand-orange tracking-wide">
            <Sparkles className="size-3.5" /> Bimbingan Kuliah Indonesia
          </span>
          <h1 className="mt-5 font-bold font-bricolage text-4xl text-white leading-tight lg:text-[54px]">
            Temukan jurusan yang <span className="text-brand-orange">sangat kamu</span> suka.
          </h1>
          <p className="mt-5 font-manrope text-base text-white/75 lg:text-lg">
            Muncul dari tes minat-bakat kamu hingga mentoring 1-on-1 — MULAI+ bantu memilih universitas & jurusan tanpa
            tebak-tebakan.
          </p>

          {/* Maskot + bubble */}
          <div className="mt-8 flex items-center gap-4">
            <motion.div
              className="h-40 w-40 shrink-0 overflow-hidden rounded-[2rem] bg-white/10 shadow-2xl backdrop-blur-sm"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Image
                src="/maskot/masko-hi.webp"
                alt="Maskot MULAI+"
                width={176}
                height={176}
                className="h-full w-full object-cover"
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 font-manrope text-sm text-white/90 backdrop-blur-sm"
            >
              Hai! 👋 Siap mulai perjalanan kuliahmu?
            </motion.p>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex items-center gap-6">
          {[
            ["10+", "Mentor Aktif"],
            ["500+", "Siswa Terbimbing"],
            ["10k+", "Prodi Didata"],
            ["38", "Provinsi"],
          ].map(([v, l], i) => (
            <div key={l} className={i > 0 ? "border-white/10 border-l pl-6" : ""}>
              <span className="font-bold font-bricolage text-2xl text-white">{v}</span>
              <p className="mt-0.5 font-manrope text-[11px] text-white/55">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full flex-col justify-center bg-bg-light lg:w-1/2">
        <div className="mx-auto w-full max-w-md px-6 py-12 lg:px-8">
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} callbackUrl={callbackUrl ?? undefined} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} callbackUrl={callbackUrl ?? undefined} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-light">
          <Loader />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
