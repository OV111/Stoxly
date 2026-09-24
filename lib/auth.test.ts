import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// lib/auth.ts reads JWT_SECRET at import time, so it must be set before the import.
const SECRET = "test-secret-at-least-32-characters-long!!";
process.env.JWT_SECRET = SECRET;

const cookieStore = { get: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const { signToken, verifyToken, requireAuth } = await import("./auth");

const user = { id: "user-1", email: "a@example.com" };

async function tokenWith(secret: string, expiresAt: string | number = "7d") {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(secret));
}

describe("signToken / verifyToken", () => {
  it("round-trips the payload", async () => {
    const payload = await verifyToken(await signToken(user));
    expect(payload).toMatchObject(user);
  });

  it("rejects a token signed with a different secret (forged)", async () => {
    await expect(verifyToken(await tokenWith("some-other-secret-32-characters-long"))).rejects.toThrow();
  });

  it("rejects a tampered token", async () => {
    const [header, , signature] = (await signToken(user)).split(".");
    const forgedBody = Buffer.from(JSON.stringify({ ...user, id: "admin" })).toString("base64url");
    await expect(verifyToken(`${header}.${forgedBody}.${signature}`)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    await expect(verifyToken(await tokenWith(SECRET, oneMinuteAgo))).rejects.toThrow();
  });
});

describe("requireAuth", () => {
  beforeEach(() => cookieStore.get.mockReset());

  it("returns null when there is no session cookie", async () => {
    cookieStore.get.mockReturnValue(undefined);
    expect(await requireAuth()).toBeNull();
  });

  it("returns null (not a throw) for an invalid cookie", async () => {
    cookieStore.get.mockReturnValue({ value: "garbage" });
    expect(await requireAuth()).toBeNull();
  });

  it("returns the user for a valid cookie", async () => {
    cookieStore.get.mockReturnValue({ value: await signToken(user) });
    expect(await requireAuth()).toMatchObject(user);
  });
});
