import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signToken } from "@/lib/auth";
import { ensureDemoAccount, DEMO_USER_EMAIL } from "@/lib/demoAccount";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// High enough to never interrupt genuine demo traffic, low enough that the
// account-provisioning work can't be hammered in a loop.
const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * One-click demo entry — no signup wall, per Vision.md's "Three-Minute Test".
 * Provisions (or reuses) the shared demo account and its seeded transaction
 * history, then issues a real session cookie exactly like sign-in does.
 */
export async function POST(request: Request) {
  try {
    const limit = rateLimit(
      `demo:${getClientIp(request)}`,
      MAX_REQUESTS,
      WINDOW_MS,
    );
    if (!limit.ok) {
      return NextResponse.json(
        { message: "Too many demo sessions started. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    const { id } = await ensureDemoAccount();
    const token = await signToken({ id, email: DEMO_USER_EMAIL });

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ message: "Demo session started" }, { status: 200 });
  } catch (err) {
    console.error("[auth/demo]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
