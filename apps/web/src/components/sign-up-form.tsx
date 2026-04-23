import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const _router = useRouter();
  const { isPending } = authClient.useSession();

  const handleGoogleSignUp = async () => {
    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
      },
      {
        onSuccess: () => {
          toast.success("Sign up successful");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-bold font-bricolage text-4xl text-[#1A1F6D]">Create Account</h1>
        <p className="mt-3 font-manrope text-[#888888] text-lg">
          Join us to start learning. Students can sign up with Google.
        </p>
      </div>

      <div className="space-y-5">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#E0E0E9] bg-white px-6 py-4 font-manrope font-semibold text-[#333333] transition-all hover:border-[#1A1F6D] hover:bg-[#1A1F6D] hover:text-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-label="Google logo">
            <title>Google logo</title>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="font-manrope text-[#888888]">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-semibold text-[#1A1F6D] hover:text-[#FE9114] hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
