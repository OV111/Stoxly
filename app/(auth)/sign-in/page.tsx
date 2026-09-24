"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  AuthShell,
  AuthCard,
  AuthHeading,
  AuthDivider,
} from "@/components/auth/AuthShell";
import { TextField } from "@/components/auth/TextField";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Classic } from "@/components/loading-ui/classic";
import TryDemoButton from "@/components/ui/TryDemoButton";

type SignInForm = {
  email: string;
  password: string;
};

type ApiError = { message: string };

/** Messages for the ?error= codes the Google callback can redirect back with. */
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  google_state: "Google sign-in expired. Please try again.",
  google_unverified:
    "That Google account's email isn't verified. Verify it with Google, then try again.",
};

const SignInForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState(
    () => GOOGLE_ERRORS[searchParams.get("error") ?? ""] ?? "",
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>();

  const onSubmit = async (data: SignInForm) => {
    setServerError("");
    try {
      const res = await fetch(`/api/auth/sign-in`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiError = await res.json();
      if (!res.ok) {
        setServerError(json.message);
        return;
      }
      // Refresh so server components re-render with the new session cookie
      // instead of serving the signed-out render from cache.
      router.push("/");
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <AuthCard>
      <AuthHeading title="Welcome back" subtitle="Sign in to your Stoxly account" />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email", { required: "Email is required" })}
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </Link>
          }
          {...register("password", { required: "Password is required" })}
        />

        {serverError && (
          <p role="alert" className="text-red-400 text-sm text-center -mt-1">
            {serverError}
          </p>
        )}

        <SubmitButton isSubmitting={isSubmitting} pendingLabel="Signing in...">
          Sign In
        </SubmitButton>
      </form>

      <AuthDivider />

      <GoogleButton />

      <TryDemoButton fullWidth size="lg" className="border-gray-600 bg-gray-900" />

      <p className="text-gray-500 text-sm text-center">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
};

export default function SignIn() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Classic className="size-8 text-gray-400" />
            <p className="text-gray-400 text-sm">Loading…</p>
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
