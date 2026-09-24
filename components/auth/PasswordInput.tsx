"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: string;
  error?: string;
  /** Optional element rendered opposite the label, e.g. a "Forgot password?" link. */
  labelAction?: React.ReactNode;
};

/**
 * Password field with a show/hide toggle.
 *
 * Owns its own reveal state, so pages don't each need a `showPassword`
 * useState — sign-up and reset-password have two password fields apiece and
 * previously tracked them separately.
 */
export function PasswordInput({
  label,
  error,
  labelAction,
  id,
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex items-center",
          labelAction ? "justify-between" : undefined,
        )}
      >
        <label htmlFor={inputId} className="text-sm font-medium text-gray-400">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-11 w-full px-3 pr-10 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {error && (
        <p id={errorId} className="text-red-400 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
