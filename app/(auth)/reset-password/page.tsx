"use client";

import { useState, Suspense } from "react";
import { TrendingUp, TrendingDown, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
import { Classic } from "@/components/loading-ui/classic";

type ResetForm = { password: string; confirm: string };

const Logo = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href="/"
      className="flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative size-6">
        <AnimatePresence mode="wait">
          {hovered ? (
            <motion.span key="down" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              <TrendingDown className="text-red-500 size-5" />
            </motion.span>
          ) : (
            <motion.span key="up" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              <TrendingUp className="text-[#3b82f6] size-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <motion.span animate={{ color: hovered ? "#ef4444" : "#ffffff" }} transition={{ duration: 0.2 }} className="font-bold text-xl">
        Stoxly
      </motion.span>
    </Link>
  );
};

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetForm>();

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
        <p className="text-sm text-gray-400">This reset link is missing a token. Please request a new one.</p>
        <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          Request a new link
        </Link>
      </div>
    );
  }

  return success ? (
    <div className="flex flex-col gap-3 text-center">
      <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
        <svg className="size-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Password updated!</h1>
      <p className="text-sm text-gray-400">Redirecting you to sign in…</p>
    </div>
  ) : (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Set new password</h1>
        <p className="text-sm text-gray-500">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-400">New password</label>
          <div className="relative">
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Min 8 characters" },
              })}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-11 w-full px-3 pr-10 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-400">Confirm password</label>
          <div className="relative">
            <input
              {...register("confirm", {
                required: "Please confirm your password",
                validate: (v) => v === watch("password") || "Passwords do not match",
              })}
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              className="h-11 w-full px-3 pr-10 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirm && <p className="text-red-400 text-xs">{errors.confirm.message}</p>}
        </div>

        {serverError && <p className="text-red-400 text-sm text-center">{serverError}</p>}

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full h-11 rounded-lg bg-[#3b82f6] hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Updating..." : "Update Password"}
        </motion.button>
      </form>
    </>
  );
};

const ResetPassword = () => (
  <div className="min-h-screen bg-gray-900 flex flex-col px-6 py-3">
    <Logo />
    <div className="flex-1 flex items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[400px] rounded-2xl border border-gray-700 bg-gray-800 p-8 flex flex-col gap-7"
      >
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
      </motion.div>
    </div>
  </div>
);

export default ResetPassword;
