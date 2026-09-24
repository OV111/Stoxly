"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  AuthShell,
  AuthCard,
  AuthHeading,
} from "@/components/auth/AuthShell";
import { TextField } from "@/components/auth/TextField";
import { SubmitButton } from "@/components/auth/SubmitButton";

type ForgotForm = { email: string };

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>();

  const onSubmit = async (data: ForgotForm) => {
    setServerError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        setServerError(json.message);
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <AuthShell>
      <AuthCard>
        {submitted ? (
          <div className="flex flex-col gap-3 text-center">
            <div className="size-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
              <svg
                className="size-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Check your email</h1>
            <p className="text-sm text-gray-400">
              If an account with that email exists, we&apos;ve sent a password
              reset link. Check your inbox (and spam folder).
            </p>
            <Link
              href="/sign-in"
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <AuthHeading
              title="Reset password"
              subtitle="Enter your email and we'll send you a reset link"
            />

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <TextField
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email", { required: "Email is required" })}
              />

              {serverError && (
                <p role="alert" className="text-red-400 text-sm text-center">
                  {serverError}
                </p>
              )}

              <SubmitButton isSubmitting={isSubmitting} pendingLabel="Sending...">
                Send Reset Link
              </SubmitButton>
            </form>

            <p className="text-gray-500 text-sm text-center">
              Remember your password?{" "}
              <Link
                href="/sign-in"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </AuthCard>
    </AuthShell>
  );
};

export default ForgotPassword;
