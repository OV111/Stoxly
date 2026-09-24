"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type TextFieldProps = React.ComponentProps<"input"> & {
  label: string;
  /** Validation message to show beneath the input. */
  error?: string;
};

/**
 * Labelled text input for the auth forms.
 *
 * Generates its own id so the <label> is properly associated with the input —
 * that's what makes click-to-focus and screen-reader announcement work — and
 * wires `aria-describedby` to the error text when one is present.
 *
 * Designed to take react-hook-form's `register()` spread directly:
 *   <TextField label="Email" error={errors.email?.message} {...register("email")} />
 */
export function TextField({
  label,
  error,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-400">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-11 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-red-400 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
