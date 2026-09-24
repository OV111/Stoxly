"use client";

import { motion } from "motion/react";

type SubmitButtonProps = {
  /** Label while idle. */
  children: React.ReactNode;
  /** Label shown while the form is submitting. */
  pendingLabel: string;
  isSubmitting: boolean;
};

/** Primary submit button shared by all four auth forms. */
export function SubmitButton({
  children,
  pendingLabel,
  isSubmitting,
}: SubmitButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="submit"
      disabled={isSubmitting}
      className="mt-1 w-full h-11 rounded-lg bg-[#3b82f6] hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isSubmitting ? pendingLabel : children}
    </motion.button>
  );
}
