"use client";

import { motion } from "motion/react";
import { Logo } from "@/components/ui/Logo";

/**
 * Page frame shared by every auth screen: full-height dark background,
 * logo in the top-left, content centred below it.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col px-6 py-3">
      <Logo />
      <div className="flex-1 flex items-center justify-center py-8">
        {children}
      </div>
    </div>
  );
}

/**
 * The bordered panel the forms sit in. Kept separate from AuthShell because
 * sign-in wraps the whole card in <Suspense> while reset-password wraps only
 * its inner form — both compositions need the card as its own piece.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-[400px] rounded-2xl border border-gray-700 bg-gray-800 p-8 flex flex-col gap-7"
    >
      {children}
    </motion.div>
  );
}

/** Title + subtitle block at the top of each form. */
export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

/** The "or" rule between the password form and the OAuth button. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gray-700" />
      <span className="text-xs text-gray-500">or</span>
      <div className="flex-1 h-px bg-gray-700" />
    </div>
  );
}
