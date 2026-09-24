"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  AuthShell,
  AuthCard,
  AuthHeading,
  AuthDivider,
} from "@/components/auth/AuthShell";
import { TextField } from "@/components/auth/TextField";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SubmitButton } from "@/components/auth/SubmitButton";

type SignUpForm = {
  name: string;
  email: string;
  password: string;
  confirm: string;
};

const SignUp = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>();

  const password = watch("password") ?? "";

  const onSubmit = async (data: SignUpForm) => {
    setServerError("");
    try {
      const res = await fetch(`/api/auth/sign-up`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message);
        return;
      }
      // The sign-up response set a session cookie; refresh so server
      // components re-render as signed in rather than from cache.
      router.push("/");
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <AuthShell>
      <AuthCard>
        <AuthHeading
          title="Create your account"
          subtitle="Start tracking markets for free"
        />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField
            label="Name"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            error={errors.name?.message}
            {...register("name", { required: "Name is required" })}
          />

          <TextField
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email", { required: "Email is required" })}
          />

          <div className="flex flex-col gap-1.5">
            <PasswordInput
              label="Password"
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
            <p role="alert" className="text-red-400 text-sm text-center -mt-1">
              {serverError}
            </p>
          )}

          <SubmitButton isSubmitting={isSubmitting} pendingLabel="Creating...">
            Create Account
          </SubmitButton>
        </form>

        <AuthDivider />

        <GoogleButton />

        <p className="text-gray-500 text-sm text-center">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
};

export default SignUp;
