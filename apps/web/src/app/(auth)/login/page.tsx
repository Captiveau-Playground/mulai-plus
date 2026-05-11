"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const { data: session, isPending } = authClient.useSession();
  const [showSignIn, setShowSignIn] = useState(true);

  useEffect(() => {
    if (error) {
      toast.error(`Authentication failed: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    if (!isPending && session?.user) {
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
  }, [session, isPending, router]);

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
    <div className="relative flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#1A1F6D] p-12 lg:flex">
        {/* Logo */}
        <div className="relative z-10">
          <Image src="/light-type-logo.svg" alt="Mulai Plus" width={160} height={48} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <h1 className="font-bold font-bricolage text-5xl text-white leading-tight lg:text-6xl">
            Start where you are.
            <br />
            Grow from here.
          </h1>
          <p className="mt-6 font-manrope text-lg text-white/80 lg:text-xl">
            MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Bersama mentor berpengalaman, temukan masa
            depan yang sesuai dengan impianmu.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex gap-12">
          <div className="text-center">
            <span className="font-bold font-bricolage text-4xl text-white">10+</span>
            <p className="font-manrope text-sm text-white/60">Mentor Aktif</p>
          </div>
          <div className="text-center">
            <span className="font-bold font-bricolage text-4xl text-white">500+</span>
            <p className="font-manrope text-sm text-white/60">Siswa Terbimbing</p>
          </div>
          <div className="text-center">
            <span className="font-bold font-bricolage text-4xl text-white">6</span>
            <p className="font-manrope text-sm text-white/60">Minggu Program</p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full flex-col justify-center bg-bg-light lg:w-1/2">
        <div className="mx-auto w-full max-w-md px-6 py-12 lg:px-8">
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
