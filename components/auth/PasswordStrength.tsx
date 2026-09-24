"use client";

import { cn } from "@/lib/utils";

/**
 * Lightweight strength hint shown under a new-password field.
 *
 * This is guidance, not enforcement — the 8-character minimum is still what
 * validation actually requires. Scoring is deliberately simple (length plus
 * character variety) rather than a full entropy estimate; a library like
 * zxcvbn would be more accurate but costs far more bundle weight than a
 * signup nudge justifies.
 */

const LEVELS = [
  { label: "Weak", bar: "bg-red-500", text: "text-red-400" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-400" },
  { label: "Strong", bar: "bg-green-500", text: "text-green-400" },
] as const;

function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Collapse the 0-5 tally into the three levels above.
  if (score <= 2) return 0;
  if (score <= 3) return 1;
  return 2;
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const level = scorePassword(password);
  const { label, bar, text } = LEVELS[level];

  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex items-center gap-1.5">
        {LEVELS.map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index <= level ? bar : "bg-gray-700",
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs", text)}>
        {label} password
        {level === 0 && " — try 12+ characters with a number and a symbol"}
      </p>
    </div>
  );
}
