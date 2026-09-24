/**
 * Canonical form for an email address before it is stored or looked up.
 *
 * Mail domains are case-insensitive, and every mainstream provider treats the
 * local part that way too — so "User@Example.com" and "user@example.com" are
 * the same inbox and must map to the same account. Without this, sign-up
 * would happily create a second account for the same person, and sign-in
 * would fail whenever someone's keyboard capitalised the first letter.
 *
 * Applied at every auth entry point; `models/User.ts` also declares
 * `lowercase: true` so a missed call site still can't store a mixed-case
 * address.
 */
export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}
