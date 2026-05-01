import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const router = useRouter();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: async () => {
            const session = await authClient.getSession();
            const role = session.data?.user.role;

            if (role === "admin") {
              router.push("/admin");
            } else if (role === "mentor") {
              router.push("/mentor");
            } else if (role === "program_manager") {
              router.push("/program-manager");
            } else {
              router.push("/dashboard/student");
            }
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
      },
      {
        onSuccess: () => {
          toast.success("Sign in successful");
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
        <h1 className="font-bold font-bricolage text-4xl text-[#1A1F6D]">Welcome Back</h1>
        <p className="mt-3 font-manrope text-[#888888] text-lg">Sign in to continue your learning journey</p>
      </div>

      <div className="space-y-5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
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

        <div className="relative flex items-center">
          <div className="h-px flex-1 bg-[#E0E0E9]" />
          <span className="mx-4 shrink-0 font-manrope text-[#888888] text-sm">or continue with email</span>
          <div className="h-px flex-1 bg-[#E0E0E9]" />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="mt-8 space-y-5"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="font-manrope font-semibold text-[#333333] text-sm">
            Email
          </label>
          <form.Field name="email">
            {(field) => (
              <>
                <input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="your@email.com"
                  className="h-14 w-full rounded-2xl border-2 border-[#E0E0E9] bg-white px-5 font-manrope text-[#333333] transition-all placeholder:text-[#888888] focus:border-[#1A1F6D] focus:outline-none focus:ring-4 focus:ring-[#1A1F6D]/10"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="mt-2 font-manrope text-[#F93447] text-sm">
                    {error?.message}
                  </p>
                ))}
              </>
            )}
          </form.Field>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="font-manrope font-semibold text-[#333333] text-sm">
            Password
          </label>
          <form.Field name="password">
            {(field) => (
              <>
                <input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter your password"
                  className="h-14 w-full rounded-2xl border-2 border-[#E0E0E9] bg-white px-5 font-manrope text-[#333333] transition-all placeholder:text-[#888888] focus:border-[#1A1F6D] focus:outline-none focus:ring-4 focus:ring-[#1A1F6D]/10"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="mt-2 font-manrope text-[#F93447] text-sm">
                    {error?.message}
                  </p>
                ))}
              </>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <button
              type="submit"
              disabled={!state.canSubmit || state.isSubmitting}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand-navy font-bold font-manrope text-lg text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-8 text-center">
        <p className="font-manrope text-[#888888]">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-semibold text-[#1A1F6D] hover:text-[#FE9114] hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
