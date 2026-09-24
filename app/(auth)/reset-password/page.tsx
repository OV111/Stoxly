"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  AuthShell,
  AuthCard,
  AuthHeading,
} from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Classic } from "@/components/loading-ui/classic";

type ResetForm = { password: string; confirm: string };

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>();

  const password = watch("password") ?? "";

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      setServerError("Invalid or missing reset token.");
      return;
    }
    setServerError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 2500);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-bold text-white">Invalid link</h1>
        <p className="text-sm text-gray-400">
          This reset link is missing a token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return success ? (
    <div className="flex flex-col gap-3 text-center">
      <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
        <svg
          className="size-6 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Password updated!</h1>
      <p className="text-sm text-gray-400">Redirecting you to sign in…</p>
    </div>
  ) : (
    <>
      <AuthHeading
        title="Set new password"
        subtitle="Choose a strong password for your account"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <PasswordInput
            label="New password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Min 8 characters" },
            })}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordInput
          label="Confirm password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register("confirm", {
            required: "Please confirm your password",
            validate: (v) => v === password || "Passwords do not match",
          })}
        />

        {serverError && (
          <p role="alert" className="text-red-400 text-sm text-center">
            {serverError}
          </p>
        )}

        <SubmitButton isSubmitting={isSubmitting} pendingLabel="Updating...">
          Update Password
        </SubmitButton>
      </form>
    </>
  );
};

const ResetPassword = () => (
  <AuthShell>
    <AuthCard>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Classic className="size-8 text-gray-400" />
            <p className="text-gray-400 text-sm">Loading…</p>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  </AuthShell>
);

export default ResetPassword;
